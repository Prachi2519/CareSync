import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = loginSchema.extend({
  name: z.string().trim().min(2, "Name is required").max(80),
  phone: z.string().trim().max(24).optional(),
});

export const holdSlotSchema = z.object({
  doctorId: z.string().min(1),
  startTime: z.string().datetime(),
});

export const bookAppointmentSchema = z.object({
  holdToken: z.string().min(1),
  symptoms: z.string().trim().min(10, "Please describe your symptoms in at least 10 characters").max(3000),
});

export const doctorSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).optional(),
  specialization: z.string().trim().min(2).max(100),
  qualifications: z.string().trim().min(2).max(160),
  bio: z.string().trim().min(10).max(1000),
  yearsExperience: z.coerce.number().int().min(0).max(70),
  slotDurationMinutes: z.coerce.number().int().refine((value) => [15, 20, 30, 45, 60].includes(value), "Invalid slot duration"),
  workingHours: z.record(z.string(), z.tuple([z.string(), z.string()])),
});

export const leaveSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  reason: z.string().trim().max(240).optional(),
});

export const visitNotesSchema = z.object({
  notes: z.string().trim().min(10, "Add clinical notes before completing the visit").max(5000),
  medication: z.string().trim().max(160).optional(),
  dosage: z.string().trim().max(160).optional(),
  instructions: z.string().trim().max(500).optional(),
  frequencyPerDay: z.coerce.number().int().min(1).max(8).optional(),
  durationDays: z.coerce.number().int().min(1).max(365).optional(),
});

export const rescheduleSchema = z.object({
  doctorId: z.string().min(1),
  startTime: z.string().datetime(),
});
