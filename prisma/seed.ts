import bcrypt from "bcryptjs";
import { addDays, setHours, setMinutes, subDays } from "date-fns";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Demo@123", 12);
  const demoDoctorNotificationEmail = "mgupta810722@gmail.com";
  const patient = await prisma.user.upsert({
    where: { id: "demo-patient" },
    update: { email: "patient@caresync.dev", passwordHash },
    create: { id: "demo-patient", name: "Riya Sharma", email: "patient@caresync.dev", phone: "+91 98765 43210", role: "PATIENT", passwordHash },
  });
  const adminEmail = "mgupta810722@gmail.com";
  const adminWithTargetEmail = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (adminWithTargetEmail) {
    await prisma.user.update({
      where: { id: adminWithTargetEmail.id },
      data: { name: "Clinic Admin", role: "ADMIN", passwordHash },
    });
  } else {
    await prisma.user.upsert({
      where: { id: "demo-admin" },
      update: { name: "Clinic Admin", email: adminEmail, role: "ADMIN", passwordHash },
      create: { id: "demo-admin", name: "Clinic Admin", email: adminEmail, role: "ADMIN", passwordHash },
    });
  }
  const doctorUser = await prisma.user.upsert({
    where: { id: "demo-doctor-user" },
    update: { email: "mgupta810722+doctor@gmail.com", passwordHash },
    create: { id: "demo-doctor-user", name: "Ananya Mehta", email: "mgupta810722+doctor@gmail.com", phone: "+91 99887 76655", role: "DOCTOR", passwordHash },
  });
  const doctor = await prisma.doctorProfile.upsert({
    where: { userId: doctorUser.id },
    update: { notificationEmail: demoDoctorNotificationEmail },
    create: {
      id: "demo-doctor",
      userId: doctorUser.id,
      specialization: "General Medicine",
      qualifications: "MBBS, MD (Internal Medicine)",
      bio: "Patient-focused physician with experience in preventive care, chronic conditions, and everyday health concerns.",
      notificationEmail: demoDoctorNotificationEmail,
      yearsExperience: 11,
      slotDurationMinutes: 30,
      workingHours: JSON.stringify({ "1": ["09:00", "17:00"], "2": ["09:00", "17:00"], "3": ["09:00", "17:00"], "4": ["09:00", "17:00"], "5": ["09:00", "17:00"], "6": ["10:00", "13:00"] }),
    },
  });
  const secondUser = await prisma.user.upsert({
    where: { id: "demo-cardiologist-user" },
    update: { email: "mgupta810722+cardiology@gmail.com", passwordHash },
    create: { id: "demo-cardiologist-user", name: "Arjun Rao", email: "mgupta810722+cardiology@gmail.com", role: "DOCTOR", passwordHash },
  });
  await prisma.doctorProfile.upsert({
    where: { userId: secondUser.id },
    update: { notificationEmail: demoDoctorNotificationEmail },
    create: {
      id: "demo-cardiologist",
      userId: secondUser.id,
      specialization: "Cardiology",
      qualifications: "MBBS, MD, DM (Cardiology)",
      bio: "Cardiologist focused on evidence-based prevention, heart rhythm concerns, and long-term cardiovascular health.",
      notificationEmail: demoDoctorNotificationEmail,
      yearsExperience: 15,
      slotDurationMinutes: 30,
      workingHours: JSON.stringify({ "1": ["10:00", "16:00"], "2": ["10:00", "16:00"], "4": ["10:00", "16:00"], "5": ["10:00", "16:00"] }),
    },
  });

  const additionalDoctors = [
    {
      id: "demo-pediatrician",
      userId: "demo-pediatrician-user",
      name: "Kavya Iyer",
      email: "mgupta810722+pediatrics@gmail.com",
      phone: "+91 98720 11442",
      specialization: "Pediatrics",
      qualifications: "MBBS, MD (Pediatrics)",
      bio: "Child-health specialist supporting newborn care, growth and development, vaccinations, nutrition, and common childhood illnesses.",
      yearsExperience: 9,
      slotDurationMinutes: 30,
      workingHours: { "1": ["09:00", "14:00"], "2": ["09:00", "14:00"], "3": ["12:00", "18:00"], "5": ["09:00", "14:00"], "6": ["09:00", "13:00"] },
    },
    {
      id: "demo-dermatologist",
      userId: "demo-dermatologist-user",
      name: "Neha Kapoor",
      email: "mgupta810722+dermatology@gmail.com",
      phone: "+91 98110 44332",
      specialization: "Dermatology",
      qualifications: "MBBS, MD (Dermatology, Venereology & Leprosy)",
      bio: "Dermatologist treating acne, eczema, hair and scalp concerns, pigmentation, infections, and long-term skin conditions.",
      yearsExperience: 12,
      slotDurationMinutes: 20,
      workingHours: { "1": ["11:00", "18:00"], "2": ["11:00", "18:00"], "4": ["11:00", "18:00"], "5": ["11:00", "18:00"] },
    },
    {
      id: "demo-orthopedist",
      userId: "demo-orthopedist-user",
      name: "Vikram Singh",
      email: "mgupta810722+orthopedics@gmail.com",
      phone: "+91 98991 22556",
      specialization: "Orthopedics",
      qualifications: "MBBS, MS (Orthopaedics)",
      bio: "Orthopaedic surgeon focused on joint pain, sports injuries, fractures, mobility recovery, and non-operative musculoskeletal care.",
      yearsExperience: 16,
      slotDurationMinutes: 30,
      workingHours: { "1": ["08:00", "13:00"], "3": ["08:00", "13:00"], "4": ["14:00", "19:00"], "6": ["08:00", "13:00"] },
    },
    {
      id: "demo-gynecologist",
      userId: "demo-gynecologist-user",
      name: "Sanya Malhotra",
      email: "mgupta810722+gynecology@gmail.com",
      phone: "+91 98202 77118",
      specialization: "Gynecology",
      qualifications: "MBBS, MS (Obstetrics & Gynaecology)",
      bio: "Women’s-health specialist providing menstrual, reproductive, prenatal, preventive, and menopause-related care with a supportive approach.",
      yearsExperience: 14,
      slotDurationMinutes: 30,
      workingHours: { "1": ["10:00", "16:00"], "2": ["10:00", "16:00"], "3": ["10:00", "16:00"], "5": ["10:00", "16:00"] },
    },
    {
      id: "demo-neurologist",
      userId: "demo-neurologist-user",
      name: "Rohan Banerjee",
      email: "mgupta810722+neurology@gmail.com",
      phone: "+91 98300 66129",
      specialization: "Neurology",
      qualifications: "MBBS, MD, DM (Neurology)",
      bio: "Neurologist evaluating headaches, dizziness, seizures, neuropathy, movement concerns, and other brain and nerve conditions.",
      yearsExperience: 18,
      slotDurationMinutes: 45,
      workingHours: { "2": ["09:00", "15:00"], "3": ["09:00", "15:00"], "5": ["09:00", "15:00"] },
    },
    {
      id: "demo-ent",
      userId: "demo-ent-user",
      name: "Aditi Joshi",
      email: "mgupta810722+ent@gmail.com",
      phone: "+91 97660 33551",
      specialization: "ENT",
      qualifications: "MBBS, MS (ENT)",
      bio: "ENT specialist caring for sinus, allergy, hearing, throat, voice, vertigo, and recurrent ear-related concerns across age groups.",
      yearsExperience: 10,
      slotDurationMinutes: 20,
      workingHours: { "1": ["09:00", "15:00"], "2": ["13:00", "19:00"], "4": ["09:00", "15:00"], "6": ["09:00", "13:00"] },
    },
    {
      id: "demo-psychiatrist",
      userId: "demo-psychiatrist-user",
      name: "Meera Nair",
      email: "mgupta810722+psychiatry@gmail.com",
      phone: "+91 98470 44882",
      specialization: "Psychiatry",
      qualifications: "MBBS, MD (Psychiatry)",
      bio: "Psychiatrist offering confidential, evidence-based support for anxiety, mood, sleep, stress, attention, and emotional wellbeing concerns.",
      yearsExperience: 13,
      slotDurationMinutes: 45,
      workingHours: { "1": ["12:00", "18:00"], "3": ["12:00", "18:00"], "4": ["12:00", "18:00"], "5": ["12:00", "18:00"] },
    },
    {
      id: "demo-endocrinologist",
      userId: "demo-endocrinologist-user",
      name: "Dev Patel",
      email: "mgupta810722+endocrinology@gmail.com",
      phone: "+91 99090 55773",
      specialization: "Endocrinology",
      qualifications: "MBBS, MD, DM (Endocrinology)",
      bio: "Endocrinologist managing diabetes, thyroid disorders, metabolic health, hormonal concerns, and long-term risk reduction plans.",
      yearsExperience: 17,
      slotDurationMinutes: 30,
      workingHours: { "1": ["08:30", "14:30"], "2": ["08:30", "14:30"], "4": ["08:30", "14:30"], "5": ["08:30", "14:30"] },
    },
  ] as const;

  for (const item of additionalDoctors) {
    const user = await prisma.user.upsert({
      where: { id: item.userId },
      update: { name: item.name, email: item.email, phone: item.phone, role: "DOCTOR", passwordHash },
      create: { id: item.userId, name: item.name, email: item.email, phone: item.phone, role: "DOCTOR", passwordHash },
    });
    await prisma.doctorProfile.upsert({
      where: { userId: user.id },
      update: {
        specialization: item.specialization,
        qualifications: item.qualifications,
        bio: item.bio,
        notificationEmail: demoDoctorNotificationEmail,
        yearsExperience: item.yearsExperience,
        slotDurationMinutes: item.slotDurationMinutes,
        workingHours: JSON.stringify(item.workingHours),
      },
      create: {
        id: item.id,
        userId: user.id,
        specialization: item.specialization,
        qualifications: item.qualifications,
        bio: item.bio,
        notificationEmail: demoDoctorNotificationEmail,
        yearsExperience: item.yearsExperience,
        slotDurationMinutes: item.slotDurationMinutes,
        workingHours: JSON.stringify(item.workingHours),
      },
    });
  }

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
