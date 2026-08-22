import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { renderNotificationEmail } from "../src/lib/email-templates";

const outputDirectory = resolve("artifacts/email-previews");
const shared = {
  recipientName: "Riya Sharma",
  counterpart: "Dr. Ananya Mehta",
  when: "Monday, 24 August 2026 at 10:30 am",
  appointmentUrl: "http://localhost:3000/patient/appointments/demo-upcoming-appointment",
};

const previews = [
  { file: "booking.html", type: "BOOKING", subject: "Appointment confirmed with Dr. Ananya Mehta", payload: shared },
  { file: "reschedule.html", type: "RESCHEDULE", subject: "Appointment rescheduled with Dr. Ananya Mehta", payload: shared },
  { file: "cancellation.html", type: "CANCELLATION", subject: "Appointment cancelled with Dr. Ananya Mehta", payload: { ...shared, cancellationReason: "Doctor leave: Medical conference" } },
  { file: "appointment-reminder.html", type: "APPOINTMENT_REMINDER", subject: "Reminder: appointment with Dr. Ananya Mehta tomorrow", payload: shared },
  { file: "medication-reminder.html", type: "MEDICATION_REMINDER", subject: "Medication reminder: Cetirizine", payload: { recipientName: "Riya Sharma", medication: "Cetirizine", dosage: "10 mg", instructions: "Take once in the evening after food.", visitUrl: shared.appointmentUrl } },
  { file: "visit-summary.html", type: "POST_VISIT_SUMMARY", subject: "Your visit summary is ready", payload: { recipientName: "Riya Sharma", visitUrl: shared.appointmentUrl } },
  { file: "email-test.html", type: "EMAIL_TEST", subject: "Your CareSync email connection is ready", payload: { recipientName: "Riya Sharma" } },
];

async function main() {
  await mkdir(outputDirectory, { recursive: true });
  for (const preview of previews) {
    const email = renderNotificationEmail(preview.type, preview.subject, preview.payload);
    await writeFile(resolve(outputDirectory, preview.file), email.html, "utf8");
  }
  console.info(`Rendered ${previews.length} email previews to ${outputDirectory}`);
}

void main();
