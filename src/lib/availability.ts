import { addMinutes, format, isBefore, startOfDay } from "date-fns";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/http";

export type WorkingHours = Record<string, [string, string]>;

export function parseWorkingHours(value: string): WorkingHours {
  try {
    return JSON.parse(value) as WorkingHours;
  } catch {
    return {};
  }
}

export function dateTimeFromParts(date: string, time: string) {
  return new Date(`${date}T${time}:00`);
}

export async function listAvailableSlots(doctorId: string, date: string) {
  const doctor = await db.doctorProfile.findUnique({ where: { id: doctorId } });
  if (!doctor || !doctor.active) throw new HttpError(404, "Doctor not found");

  const day = new Date(`${date}T12:00:00`);
  if (Number.isNaN(day.getTime())) throw new HttpError(400, "Invalid date");
  const leave = await db.doctorLeave.findUnique({
    where: { doctorId_date: { doctorId, date } },
  });
  if (leave) return [];

  const hours = parseWorkingHours(doctor.workingHours)[String(day.getDay())];
  if (!hours) return [];
  const dayStart = startOfDay(day);
  const dayEnd = addMinutes(dayStart, 24 * 60);
  const occupied = await db.appointmentSlot.findMany({
    where: {
      doctorId,
      startTime: { gte: dayStart, lt: dayEnd },
      OR: [{ status: "BOOKED" }, { status: "HELD", holdExpiresAt: { gt: new Date() } }],
    },
    select: { startTime: true },
  });
  const occupiedTimes = new Set(occupied.map((slot) => slot.startTime.getTime()));
  const now = new Date();
  const slots: { startTime: string; endTime: string; label: string }[] = [];
  let cursor = dateTimeFromParts(date, hours[0]);
  const end = dateTimeFromParts(date, hours[1]);

  while (!isBefore(end, addMinutes(cursor, doctor.slotDurationMinutes))) {
    const slotEnd = addMinutes(cursor, doctor.slotDurationMinutes);
    if (isBefore(now, cursor) && !occupiedTimes.has(cursor.getTime())) {
      slots.push({
        startTime: cursor.toISOString(),
        endTime: slotEnd.toISOString(),
        label: format(cursor, "h:mm a"),
      });
    }
    cursor = slotEnd;
  }
  return slots;
}

export async function acquireSlot(
  tx: Prisma.TransactionClient,
  input: { doctorId: string; patientId: string; startTime: Date; holdMinutes?: number },
) {
  const doctor = await tx.doctorProfile.findUnique({ where: { id: input.doctorId } });
  if (!doctor || !doctor.active) throw new HttpError(404, "Doctor not found");
  const date = format(input.startTime, "yyyy-MM-dd");
  const leave = await tx.doctorLeave.findUnique({
    where: { doctorId_date: { doctorId: input.doctorId, date } },
  });
  if (leave) throw new HttpError(409, "This doctor is on leave on the selected date");

  const staleSlot = await tx.appointmentSlot.findUnique({
    where: { doctorId_startTime: { doctorId: input.doctorId, startTime: input.startTime } },
  });
  if (staleSlot?.status === "HELD" && staleSlot.holdExpiresAt && staleSlot.holdExpiresAt <= new Date()) {
    await tx.appointmentSlot.delete({ where: { id: staleSlot.id } });
  } else if (staleSlot) {
    throw new HttpError(409, "That time was just reserved. Please choose another slot.");
  }

  try {
    return await tx.appointmentSlot.create({
      data: {
        doctorId: input.doctorId,
        patientId: input.patientId,
        startTime: input.startTime,
        endTime: addMinutes(input.startTime, doctor.slotDurationMinutes),
        status: "HELD",
        holdToken: crypto.randomUUID(),
        holdExpiresAt: addMinutes(new Date(), input.holdMinutes ?? 5),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new HttpError(409, "That time was just reserved. Please choose another slot.");
    }
    throw error;
  }
}
