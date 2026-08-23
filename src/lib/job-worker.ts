import { addHours, addMinutes } from "date-fns";
import { db } from "@/lib/db";
import { renderNotificationEmail } from "@/lib/email-templates";
import { sendEmail } from "@/lib/mail";
import { runCalendarJob } from "@/lib/calendar";

export async function enqueueUpcomingAppointmentReminders() {
  const now = new Date();
  const appointments = await db.appointment.findMany({
    where: {
      status: "SCHEDULED",
      startTime: { gte: addHours(now, 23), lte: addHours(now, 25) },
    },
    include: { patient: true, doctor: { include: { user: true } } },
  });
  let created = 0;
  for (const appointment of appointments) {
    const participants = [
      {
        role: "PATIENT" as const,
        user: appointment.patient,
        counterpart: `Dr. ${appointment.doctor.user.name}`,
        appointmentUrl: `/patient/appointments/${appointment.id}`,
      },
      {
        role: "DOCTOR" as const,
        user: appointment.doctor.user,
        counterpart: appointment.patient.name,
        appointmentUrl: `/doctor/appointments/${appointment.id}`,
      },
    ];
    const baseUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
    for (const { role, user, counterpart, appointmentUrl } of participants) {
      const reminderKey = appointment.startTime.toISOString();
      const existing = await db.notificationJob.findFirst({
        where: {
          appointmentId: appointment.id,
          userId: user.id,
          type: "APPOINTMENT_REMINDER",
          payload: { contains: `"startTime":"${reminderKey}"` },
        },
      });
      if (existing) continue;
      await db.notificationJob.create({
        data: {
          userId: user.id,
          appointmentId: appointment.id,
          channel: "EMAIL",
          type: "APPOINTMENT_REMINDER",
          recipient: user.email,
          subject: role === "DOCTOR"
            ? `Tomorrow's appointment: ${counterpart}`
            : `Reminder: appointment with ${counterpart} tomorrow`,
          payload: JSON.stringify({
            recipientRole: role,
            recipientName: user.name,
            counterpart,
            startTime: appointment.startTime.toISOString(),
            appointmentUrl: `${baseUrl}${appointmentUrl}`,
          }),
        },
      });
      created += 1;
    }
  }
  return created;
}

export async function enqueueMedicationReminders() {
  const now = new Date();
  const reminders = await db.medicationReminder.findMany({
    where: { active: true, nextRunAt: { lte: now } },
    include: { patient: true },
    take: 100,
  });
  for (const reminder of reminders) {
    await db.$transaction(async (tx) => {
      const scheduledFor = reminder.nextRunAt.toISOString();
      const existing = await tx.notificationJob.findFirst({
        where: {
          userId: reminder.patientId,
          appointmentId: reminder.appointmentId,
          type: "MEDICATION_REMINDER",
          payload: { contains: `"scheduledFor":"${scheduledFor}"` },
        },
      });
      if (!existing) {
        await tx.notificationJob.create({
          data: {
            userId: reminder.patientId,
            appointmentId: reminder.appointmentId,
            channel: "EMAIL",
            type: "MEDICATION_REMINDER",
            recipient: reminder.patient.email,
            subject: `Medication reminder: ${reminder.medication}`,
            payload: JSON.stringify({
              recipientName: reminder.patient.name,
              medication: reminder.medication,
              dosage: reminder.dosage,
              instructions: reminder.instructions || undefined,
              scheduledFor,
              visitUrl: `${(process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "")}/patient/appointments/${reminder.appointmentId}`,
            }),
          },
        });
      }
      const next = addMinutes(reminder.nextRunAt, Math.round((24 * 60) / reminder.frequencyPerDay));
      await tx.medicationReminder.update({
        where: { id: reminder.id },
        data: next > reminder.endsAt ? { active: false } : { nextRunAt: next },
      });
    });
  }
  return reminders.length;
}

export async function processNotificationJobs(limit = 50, appointmentId?: string) {
  const stale = addMinutes(new Date(), -15);
  await db.notificationJob.updateMany({
    where: { status: "PROCESSING", updatedAt: { lt: stale } },
    data: { status: "FAILED", nextAttemptAt: new Date(), lastError: "Recovered stale worker claim" },
  });
  const jobs = await db.notificationJob.findMany({
    where: {
      ...(appointmentId ? { appointmentId } : {}),
      status: { in: ["PENDING", "FAILED"] },
      nextAttemptAt: { lte: new Date() },
      attempts: { lt: 5 },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  let sent = 0;
  let failed = 0;
  for (const job of jobs) {
    const claimed = await db.notificationJob.updateMany({
      where: { id: job.id, status: { in: ["PENDING", "FAILED"] } },
      data: { status: "PROCESSING" },
    });
    if (!claimed.count) continue;
    try {
      const payload = JSON.parse(job.payload) as Record<string, string>;
      if (job.channel === "EMAIL") {
        const email = renderNotificationEmail(job.type, job.subject || "CareSync update", payload);
        await sendEmail({
          to: job.recipient,
          subject: email.subject,
          text: email.text,
          html: email.html,
        });
      } else {
        await runCalendarJob(payload as Parameters<typeof runCalendarJob>[0]);
      }
      await db.notificationJob.update({
        where: { id: job.id },
        data: { status: "SENT", sentAt: new Date(), attempts: { increment: 1 }, lastError: null },
      });
      sent += 1;
    } catch (error) {
      const attempts = job.attempts + 1;
      await db.notificationJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          attempts,
          lastError: error instanceof Error ? error.message.slice(0, 500) : "Unknown job error",
          nextAttemptAt: addMinutes(new Date(), Math.min(360, 5 * 2 ** attempts)),
        },
      });
      failed += 1;
    }
  }
  return { selected: jobs.length, sent, failed };
}

export async function runBackgroundJobs() {
  const appointmentReminders = await enqueueUpcomingAppointmentReminders();
  const medicationReminders = await enqueueMedicationReminders();
  const jobs = await processNotificationJobs();
  return { appointmentReminders, medicationReminders, ...jobs };
}
