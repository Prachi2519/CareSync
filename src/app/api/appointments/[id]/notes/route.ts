import { addDays } from "date-fns";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, jsonError } from "@/lib/http";
import { summarizeVisit } from "@/lib/llm";
import { visitNotesSchema } from "@/lib/validators";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(["DOCTOR"]);
    const { id } = await context.params;
    const input = visitNotesSchema.parse(await request.json());
    const existing = await db.appointment.findUnique({
      where: { id },
      include: { doctor: true, patient: true },
    });
    if (!existing) throw new HttpError(404, "Appointment not found");
    if (existing.doctor.userId !== session.userId) throw new HttpError(403, "You cannot update this appointment");
    if (existing.status === "CANCELLED") throw new HttpError(409, "A cancelled appointment cannot be completed");

    const prescription = input.medication
      ? JSON.stringify({
          medication: input.medication,
          dosage: input.dosage || "As directed",
          instructions: input.instructions || "",
          frequencyPerDay: input.frequencyPerDay || 1,
          durationDays: input.durationDays || 7,
        })
      : undefined;
    const summary = await summarizeVisit(input.notes, prescription);
    const appointment = await db.$transaction(async (tx) => {
      const updated = await tx.appointment.update({
        where: { id },
        data: {
          status: "COMPLETED",
          postVisitNotes: input.notes,
          prescription: prescription || null,
          postVisitSummary: JSON.stringify({
            summary: summary.summary,
            medicationSchedule: summary.medicationSchedule,
            followUpSteps: summary.followUpSteps,
          }),
        },
      });
      if (input.medication) {
        await tx.medicationReminder.deleteMany({ where: { appointmentId: id } });
        await tx.medicationReminder.create({
          data: {
            appointmentId: id,
            patientId: existing.patientId,
            medication: input.medication,
            dosage: input.dosage || "As directed",
            instructions: input.instructions || null,
            frequencyPerDay: input.frequencyPerDay || 1,
            nextRunAt: new Date(),
            endsAt: addDays(new Date(), input.durationDays || 7),
          },
        });
      }
      await tx.notificationJob.create({
        data: {
          userId: existing.patientId,
          appointmentId: id,
          channel: "EMAIL",
          type: "POST_VISIT_SUMMARY",
          recipient: existing.patient.email,
          subject: `Your visit summary with Dr. ${existing.doctor.userId === session.userId ? session.name : "your clinician"} is ready`,
          payload: JSON.stringify({
            recipientName: existing.patient.name,
            visitUrl: `${(process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "")}/patient/appointments/${id}`,
          }),
        },
      });
      return updated;
    });
    return NextResponse.json({ appointment, summarySource: summary.source });
  } catch (error) {
    return jsonError(error);
  }
}
