import bcrypt from "bcryptjs";
import { addDays, setHours, setMinutes, subDays } from "date-fns";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Demo@123", 12);
  const patient = await prisma.user.upsert({
    where: { email: "patient@caresync.dev" },
    update: { passwordHash },
    create: { id: "demo-patient", name: "Riya Sharma", email: "patient@caresync.dev", phone: "+91 98765 43210", role: "PATIENT", passwordHash },
  });
  await prisma.user.upsert({
    where: { email: "admin@caresync.dev" },
    update: { passwordHash },
    create: { id: "demo-admin", name: "Clinic Admin", email: "admin@caresync.dev", role: "ADMIN", passwordHash },
  });
  const doctorUser = await prisma.user.upsert({
    where: { email: "doctor@caresync.dev" },
    update: { passwordHash },
    create: { id: "demo-doctor-user", name: "Ananya Mehta", email: "doctor@caresync.dev", phone: "+91 99887 76655", role: "DOCTOR", passwordHash },
  });
  const doctor = await prisma.doctorProfile.upsert({
    where: { userId: doctorUser.id },
    update: {},
    create: {
      id: "demo-doctor",
      userId: doctorUser.id,
      specialization: "General Medicine",
      qualifications: "MBBS, MD (Internal Medicine)",
      bio: "Patient-focused physician with experience in preventive care, chronic conditions, and everyday health concerns.",
      yearsExperience: 11,
      slotDurationMinutes: 30,
      workingHours: JSON.stringify({ "1": ["09:00", "17:00"], "2": ["09:00", "17:00"], "3": ["09:00", "17:00"], "4": ["09:00", "17:00"], "5": ["09:00", "17:00"], "6": ["10:00", "13:00"] }),
    },
  });
  const secondUser = await prisma.user.upsert({
    where: { email: "cardio@caresync.dev" },
    update: { passwordHash },
    create: { id: "demo-cardiologist-user", name: "Arjun Rao", email: "cardio@caresync.dev", role: "DOCTOR", passwordHash },
  });
  await prisma.doctorProfile.upsert({
    where: { userId: secondUser.id },
    update: {},
    create: {
      id: "demo-cardiologist",
      userId: secondUser.id,
      specialization: "Cardiology",
      qualifications: "MBBS, MD, DM (Cardiology)",
      bio: "Cardiologist focused on evidence-based prevention, heart rhythm concerns, and long-term cardiovascular health.",
      yearsExperience: 15,
      slotDurationMinutes: 30,
      workingHours: JSON.stringify({ "1": ["10:00", "16:00"], "2": ["10:00", "16:00"], "4": ["10:00", "16:00"], "5": ["10:00", "16:00"] }),
    },
  });

  const upcomingStart = setMinutes(setHours(addDays(new Date(), 2), 10), 30);
  const upcomingEnd = setMinutes(setHours(addDays(new Date(), 2), 11), 0);
  const upcomingSlot = await prisma.appointmentSlot.upsert({
    where: { id: "demo-upcoming-slot" },
    update: { startTime: upcomingStart, endTime: upcomingEnd, doctorId: doctor.id, patientId: patient.id, status: "BOOKED", holdExpiresAt: null },
    create: { id: "demo-upcoming-slot", doctorId: doctor.id, patientId: patient.id, startTime: upcomingStart, endTime: upcomingEnd, status: "BOOKED", holdToken: "demo-upcoming-hold" },
  });
  await prisma.appointment.upsert({
    where: { id: "demo-upcoming-appointment" },
    update: { startTime: upcomingStart, endTime: upcomingEnd, status: "SCHEDULED", slotId: upcomingSlot.id },
    create: {
      id: "demo-upcoming-appointment", doctorId: doctor.id, patientId: patient.id, slotId: upcomingSlot.id,
      startTime: upcomingStart, endTime: upcomingEnd, status: "SCHEDULED",
      symptoms: "Mild recurring headaches for the last five days, mostly in the late afternoon. No fever or recent injury.",
      preVisitSummary: "Recurring late-afternoon headaches for five days without reported fever or injury.", urgency: "LOW",
      suggestedQuestions: JSON.stringify(["How long does each headache last?", "Are there vision changes, nausea, or light sensitivity?", "Have sleep, hydration, caffeine, or screen habits changed?"]),
    },
  });

  const pastStart = setMinutes(setHours(subDays(new Date(), 14), 14), 0);
  const pastEnd = setMinutes(setHours(subDays(new Date(), 14), 14), 30);
  const pastSlot = await prisma.appointmentSlot.upsert({
    where: { id: "demo-past-slot" },
    update: { startTime: pastStart, endTime: pastEnd, doctorId: doctor.id, patientId: patient.id, status: "BOOKED" },
    create: { id: "demo-past-slot", doctorId: doctor.id, patientId: patient.id, startTime: pastStart, endTime: pastEnd, status: "BOOKED", holdToken: "demo-past-hold" },
  });
  await prisma.appointment.upsert({
    where: { id: "demo-past-appointment" },
    update: { startTime: pastStart, endTime: pastEnd, slotId: pastSlot.id },
    create: {
      id: "demo-past-appointment", doctorId: doctor.id, patientId: patient.id, slotId: pastSlot.id,
      startTime: pastStart, endTime: pastEnd, status: "COMPLETED", symptoms: "Seasonal sneezing, itchy eyes, and a runny nose.",
      preVisitSummary: "Symptoms are consistent with a recurring seasonal allergy concern.", urgency: "LOW",
      postVisitNotes: "Discussed allergen avoidance and hydration. Review if wheezing or breathing difficulty develops.",
      postVisitSummary: JSON.stringify({ summary: "You discussed recurring allergy symptoms and ways to reduce exposure to triggers.", medicationSchedule: "Cetirizine 10 mg once in the evening for five days, as prescribed.", followUpSteps: ["Reduce exposure to known dust and pollen triggers.", "Contact the clinic if symptoms persist or breathing symptoms appear."] }),
      prescription: JSON.stringify({ medication: "Cetirizine", dosage: "10 mg", frequencyPerDay: 1, durationDays: 5 }),
    },
  });
  console.log("CareSync demo data is ready.");
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());
