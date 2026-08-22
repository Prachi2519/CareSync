import { addDays, startOfDay } from "date-fns";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, jsonError } from "@/lib/http";
import { queueLifecycleJobs } from "@/lib/jobs";
import { leaveSchema } from "@/lib/validators";

const include = {
  patient: { select: { id: true, name: true, email: true } },
  doctor: { include: { user: { select: { id: true, name: true, email: true } } } },
} as const;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(["ADMIN"]);
    const { id } = await context.params;
    const input = leaveSchema.parse(await request.json());
    const selected = new Date(`${input.date}T12:00:00`);
    if (Number.isNaN(selected.getTime())) throw new HttpError(400, "Invalid leave date");
    const result = await db.$transaction(async (tx) => {
      const doctor = await tx.doctorProfile.findUnique({ where: { id } });
      if (!doctor) throw new HttpError(404, "Doctor not found");
      const leave = await tx.doctorLeave.upsert({
        where: { doctorId_date: { doctorId: id, date: input.date } },
        create: { doctorId: id, date: input.date, reason: input.reason || null },
        update: { reason: input.reason || null },
      });
      const dayStart = startOfDay(selected);
      const affected = await tx.appointment.findMany({
        where: { doctorId: id, status: "SCHEDULED", startTime: { gte: dayStart, lt: addDays(dayStart, 1) } },
        include,
      });
      for (const appointment of affected) {
        const slotId = appointment.slotId;
        const cancelled = await tx.appointment.update({
          where: { id: appointment.id },
          data: {
            status: "CANCELLED",
            slotId: null,
            cancellationReason: `Doctor leave${input.reason ? `: ${input.reason}` : ""}`,
          },
          include,
        });
        if (slotId) await tx.appointmentSlot.delete({ where: { id: slotId } });
        await queueLifecycleJobs(tx, cancelled, "CANCELLATION");
      }
      return { leave, affectedAppointments: affected.length };
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(["ADMIN"]);
    const { id } = await context.params;
    const date = new URL(request.url).searchParams.get("date");
    if (!date) throw new HttpError(400, "Leave date is required");
    await db.doctorLeave.delete({ where: { doctorId_date: { doctorId: id, date } } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
