import { NextResponse } from "next/server";
import { acquireSlot } from "@/lib/availability";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, jsonError } from "@/lib/http";
import { queueLifecycleJobs } from "@/lib/jobs";
import { rescheduleSchema } from "@/lib/validators";

const include = {
  patient: { select: { id: true, name: true, email: true } },
  doctor: { include: { user: { select: { id: true, name: true, email: true } } } },
} as const;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(["PATIENT", "ADMIN"]);
    const { id } = await context.params;
    const input = rescheduleSchema.parse(await request.json());
    const appointment = await db.$transaction(async (tx) => {
      const current = await tx.appointment.findUnique({ where: { id }, include });
      if (!current) throw new HttpError(404, "Appointment not found");
      if (session.role === "PATIENT" && current.patientId !== session.userId) throw new HttpError(403, "You cannot reschedule this appointment");
      if (current.status !== "SCHEDULED") throw new HttpError(409, "Only scheduled appointments can be rescheduled");
      const oldSlotId = current.slotId;
      const newSlot = await acquireSlot(tx, {
        doctorId: input.doctorId,
        patientId: current.patientId,
        startTime: new Date(input.startTime),
      });
      await tx.appointmentSlot.update({ where: { id: newSlot.id }, data: { status: "BOOKED", holdExpiresAt: null } });
      const updated = await tx.appointment.update({
        where: { id },
        data: {
          doctorId: input.doctorId,
          slotId: newSlot.id,
          startTime: newSlot.startTime,
          endTime: newSlot.endTime,
        },
        include,
      });
      if (oldSlotId) await tx.appointmentSlot.delete({ where: { id: oldSlotId } });
      await queueLifecycleJobs(tx, updated, "RESCHEDULE");
      return updated;
    });
    return NextResponse.json({ appointment });
  } catch (error) {
    return jsonError(error);
  }
}
