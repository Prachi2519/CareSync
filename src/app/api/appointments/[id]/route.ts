import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, jsonError } from "@/lib/http";
import { queueLifecycleJobs } from "@/lib/jobs";

const include = {
  patient: { select: { id: true, name: true, email: true, phone: true } },
  doctor: { include: { user: { select: { id: true, name: true, email: true } } } },
  medicationReminders: true,
} as const;

function canAccess(session: Awaited<ReturnType<typeof requireSession>>, appointment: { patientId: string; doctor: { userId: string } }) {
  return session.role === "ADMIN" || appointment.patientId === session.userId || appointment.doctor.userId === session.userId;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await context.params;
    const appointment = await db.appointment.findUnique({ where: { id }, include });
    if (!appointment) throw new HttpError(404, "Appointment not found");
    if (!canAccess(session, appointment)) throw new HttpError(403, "You cannot view this appointment");
    return NextResponse.json({ appointment });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await context.params;
    const body = await request.json().catch(() => ({})) as { reason?: string };
    const cancelled = await db.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({ where: { id }, include });
      if (!appointment) throw new HttpError(404, "Appointment not found");
      if (!canAccess(session, appointment)) throw new HttpError(403, "You cannot cancel this appointment");
      if (appointment.status !== "SCHEDULED") throw new HttpError(409, "Only scheduled appointments can be cancelled");
      const updated = await tx.appointment.update({
        where: { id },
        data: { status: "CANCELLED", cancellationReason: body.reason?.slice(0, 300), slotId: null },
        include,
      });
      if (appointment.slotId) await tx.appointmentSlot.delete({ where: { id: appointment.slotId } });
      await queueLifecycleJobs(tx, updated, "CANCELLATION");
      return updated;
    });
    return NextResponse.json({ appointment: cancelled });
  } catch (error) {
    return jsonError(error);
  }
}
