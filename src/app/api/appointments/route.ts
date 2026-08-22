import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, jsonError } from "@/lib/http";
import { summarizeSymptoms } from "@/lib/llm";
import { queueLifecycleJobs } from "@/lib/jobs";
import { bookAppointmentSchema } from "@/lib/validators";

const appointmentInclude = {
  patient: { select: { id: true, name: true, email: true, phone: true } },
  doctor: { include: { user: { select: { id: true, name: true, email: true } } } },
} as const;

export async function GET() {
  try {
    const session = await requireSession();
    const where =
      session.role === "PATIENT"
        ? { patientId: session.userId }
        : session.role === "DOCTOR"
          ? { doctor: { userId: session.userId } }
          : {};
    const appointments = await db.appointment.findMany({
      where,
      include: appointmentInclude,
      orderBy: { startTime: "asc" },
    });
    return NextResponse.json({ appointments });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession(["PATIENT"]);
    const input = bookAppointmentSchema.parse(await request.json());
    const summary = await summarizeSymptoms(input.symptoms);
    const appointment = await db.$transaction(async (tx) => {
      const slot = await tx.appointmentSlot.findUnique({ where: { holdToken: input.holdToken } });
      if (!slot || slot.patientId !== session.userId || slot.status !== "HELD") {
        throw new HttpError(409, "This slot hold is no longer valid. Please select the time again.");
      }
      if (!slot.holdExpiresAt || slot.holdExpiresAt <= new Date()) {
        await tx.appointmentSlot.delete({ where: { id: slot.id } });
        throw new HttpError(409, "Your five-minute slot hold expired. Please select the time again.");
      }
      const created = await tx.appointment.create({
        data: {
          doctorId: slot.doctorId,
          patientId: session.userId,
          slotId: slot.id,
          startTime: slot.startTime,
          endTime: slot.endTime,
          symptoms: input.symptoms,
          preVisitSummary: summary.chiefComplaint,
          urgency: summary.urgency,
          suggestedQuestions: JSON.stringify(summary.suggestedQuestions),
        },
        include: appointmentInclude,
      });
      await tx.appointmentSlot.update({
        where: { id: slot.id },
        data: { status: "BOOKED", holdExpiresAt: null },
      });
      await queueLifecycleJobs(tx, created, "BOOKING");
      return created;
    });
    return NextResponse.json({ appointment, summarySource: summary.source }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
