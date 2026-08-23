import { Prisma } from "@prisma/client";
import { after } from "next/server";
import { processNotificationJobs } from "@/lib/job-worker";

type AppointmentForJobs = {
  id: string;
  startTime: Date;
  endTime: Date;
  cancellationReason?: string | null;
  patient: { id: string; name: string; email: string };
  doctor: { specialization?: string; notificationEmail?: string | null; user: { id: string; name: string; email: string } };
};

type LifecycleAction = "BOOKING" | "RESCHEDULE" | "CANCELLATION";

export function scheduleQueuedNotificationDelivery(appointmentId: string) {
  after(async () => {
    await processNotificationJobs(10, appointmentId);
  });
}

export async function queueLifecycleJobs(
  tx: Prisma.TransactionClient,
  appointment: AppointmentForJobs,
  action: LifecycleAction,
) {
  const calendarAction = action === "CANCELLATION" ? "DELETE" : action === "RESCHEDULE" ? "UPDATE" : "CREATE";
  const participants = [
    {
      role: "PATIENT" as const,
      userId: appointment.patient.id,
      name: appointment.patient.name,
      emailRecipient: appointment.patient.email,
      calendarRecipient: appointment.patient.email,
      counterpart: `Dr. ${appointment.doctor.user.name}`,
      appointmentUrl: `/patient/appointments/${appointment.id}`,
      calendarTitle: `Appointment with Dr. ${appointment.doctor.user.name}`,
    },
    {
      role: "DOCTOR" as const,
      userId: appointment.doctor.user.id,
      name: appointment.doctor.user.name,
      emailRecipient: appointment.doctor.notificationEmail || appointment.doctor.user.email,
      calendarRecipient: appointment.doctor.user.email,
      counterpart: appointment.patient.name,
      appointmentUrl: `/doctor/appointments/${appointment.id}`,
      calendarTitle: `Appointment with ${appointment.patient.name}`,
    },
  ];
  const baseUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const data = participants.flatMap((person) => [
    {
      userId: person.userId,
      appointmentId: appointment.id,
      channel: "EMAIL" as const,
      type: action,
      recipient: person.emailRecipient,
      subject:
        person.role === "DOCTOR"
          ? action === "BOOKING"
            ? `New appointment: ${person.counterpart}`
            : action === "RESCHEDULE"
              ? `Appointment rescheduled: ${person.counterpart}`
              : `Appointment cancelled: ${person.counterpart}`
          : action === "BOOKING"
            ? `Appointment confirmed with ${person.counterpart}`
            : action === "RESCHEDULE"
              ? `Appointment rescheduled with ${person.counterpart}`
              : `Appointment cancelled with ${person.counterpart}`,
      payload: JSON.stringify({
        recipientRole: person.role,
        recipientName: person.name,
        counterpart: person.counterpart,
        startTime: appointment.startTime.toISOString(),
        cancellationReason: appointment.cancellationReason || undefined,
        appointmentUrl: `${baseUrl}${person.appointmentUrl}`,
      }),
    },
    {
      userId: person.userId,
      appointmentId: appointment.id,
      channel: "CALENDAR" as const,
      type: `CALENDAR_${calendarAction}`,
      recipient: person.calendarRecipient,
      subject: null,
      payload: JSON.stringify({
        appointmentId: appointment.id,
        userId: person.userId,
        action: calendarAction,
        title: person.calendarTitle,
        description: `CareSync appointment with ${person.counterpart}. Open CareSync for the latest details.`,
        startTime: appointment.startTime.toISOString(),
        endTime: appointment.endTime.toISOString(),
      }),
    },
  ]);
  await tx.notificationJob.createMany({ data });
  scheduleQueuedNotificationDelivery(appointment.id);
}
