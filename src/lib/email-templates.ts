type EmailTone = "primary" | "success" | "warning" | "danger";

export type NotificationEmailPayload = {
  recipientRole?: "PATIENT" | "DOCTOR" | "ADMIN";
  text?: string;
  recipientName?: string;
  counterpart?: string;
  when?: string;
  startTime?: string;
  appointmentUrl?: string;
  cancellationReason?: string;
  medication?: string;
  dosage?: string;
  instructions?: string;
  visitUrl?: string;
};

type EmailDetail = { label: string; value: string };

type EmailContent = {
  subject: string;
  preheader: string;
  eyebrow: string;
  title: string;
  greeting: string;
  paragraphs: string[];
  badge?: string;
  tone?: EmailTone;
  details?: EmailDetail[];
  notice?: { title: string; text: string };
  cta?: { label: string; url: string };
};

const palette: Record<EmailTone, { accent: string; soft: string; text: string }> = {
  primary: { accent: "#087f9b", soft: "#dff7fb", text: "#075c70" },
  success: { accent: "#047857", soft: "#dff7ec", text: "#065f46" },
  warning: { accent: "#a65c12", soft: "#fff3df", text: "#7a430d" },
  danger: { accent: "#c2413b", soft: "#fff0ef", text: "#8d2925" },
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? escapeHtml(url.toString()) : "#";
  } catch {
    return "#";
  }
}

function formatWhen(payload: NotificationEmailPayload) {
  if (payload.startTime) {
    try {
      return new Intl.DateTimeFormat("en-IN", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: process.env.APP_TIMEZONE || "Asia/Kolkata",
      }).format(new Date(payload.startTime));
    } catch {
      return payload.startTime;
    }
  }
  return payload.when || "See CareSync for the latest schedule";
}

function appUrl(path: string) {
  const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}

function contentFor(type: string, subject: string, payload: NotificationEmailPayload): EmailContent {
  const name = payload.recipientName || "there";
  const counterpart = payload.counterpart || "your care team";
  const when = formatWhen(payload);
  const appointmentUrl = payload.appointmentUrl || appUrl("/dashboard");
  const isDoctor = payload.recipientRole === "DOCTOR";

  if (type === "BOOKING") {
    if (isDoctor) {
      return {
        subject,
        preheader: `A new appointment with ${counterpart} has been added to your schedule.`,
        eyebrow: "New patient appointment",
        title: "A new visit is on your schedule",
        greeting: `Hello Dr. ${name},`,
        paragraphs: ["A patient has booked an appointment with you. Review their submitted symptoms and AI pre-visit summary before the consultation."],
        badge: "New booking",
        tone: "primary",
        details: [{ label: "Patient", value: counterpart }, { label: "Date & time", value: when }],
        notice: { title: "Prepare for the visit", text: "Open the clinical appointment view to review symptoms, urgency, and suggested questions." },
        cta: { label: "Review patient details", url: appointmentUrl },
      };
    }
    return {
      subject,
      preheader: `Your appointment with ${counterpart} is confirmed.`,
      eyebrow: "Appointment confirmed",
      title: "Your visit is booked",
      greeting: `Hello ${name},`,
      paragraphs: ["Your appointment has been confirmed. We’ll keep you informed if anything changes."],
      badge: "Confirmed",
      tone: "success",
      details: [{ label: "With", value: counterpart }, { label: "Date & time", value: when }],
      notice: { title: "Before your visit", text: "Open CareSync to review your symptom summary and appointment details." },
      cta: { label: "View appointment", url: appointmentUrl },
    };
  }

  if (type === "RESCHEDULE") {
    if (isDoctor) {
      return {
        subject,
        preheader: `Your appointment with ${counterpart} has moved to a new time.`,
        eyebrow: "Schedule updated",
        title: "A patient visit was rescheduled",
        greeting: `Hello Dr. ${name},`,
        paragraphs: ["The appointment below has a new time. Your connected Google Calendar will be updated automatically."],
        badge: "Time changed",
        tone: "primary",
        details: [{ label: "Patient", value: counterpart }, { label: "Updated date & time", value: when }],
        cta: { label: "Review appointment", url: appointmentUrl },
      };
    }
    return {
      subject,
      preheader: `Your appointment with ${counterpart} has a new time.`,
      eyebrow: "Schedule updated",
      title: "Your appointment was rescheduled",
      greeting: `Hello ${name},`,
      paragraphs: ["The appointment time has been updated. Your connected Google Calendar will be updated automatically."],
      badge: "New time",
      tone: "primary",
      details: [{ label: "With", value: counterpart }, { label: "Updated date & time", value: when }],
      cta: { label: "Review new time", url: appointmentUrl },
    };
  }

  if (type === "CANCELLATION") {
    if (isDoctor) {
      return {
        subject,
        preheader: `Your appointment with ${counterpart} has been cancelled.`,
        eyebrow: "Schedule change",
        title: "A patient visit was cancelled",
        greeting: `Hello Dr. ${name},`,
        paragraphs: ["This appointment is no longer on your schedule. Any connected Calendar event will be removed automatically."],
        badge: "Cancelled",
        tone: "danger",
        details: [{ label: "Patient", value: counterpart }, { label: "Original date & time", value: when }],
        notice: payload.cancellationReason ? { title: "Reason", text: payload.cancellationReason } : undefined,
        cta: { label: "View schedule", url: appointmentUrl },
      };
    }
    return {
      subject,
      preheader: `Your appointment with ${counterpart} has been cancelled.`,
      eyebrow: "Appointment cancelled",
      title: "This visit is no longer scheduled",
      greeting: `Hello ${name},`,
      paragraphs: ["The appointment below has been cancelled. Any connected Calendar event will be removed automatically."],
      badge: "Cancelled",
      tone: "danger",
      details: [{ label: "With", value: counterpart }, { label: "Original date & time", value: when }],
      notice: payload.cancellationReason
        ? { title: "Reason", text: payload.cancellationReason }
        : { title: "Need another appointment?", text: "Sign in to CareSync to find the next available time." },
      cta: { label: "Review cancellation", url: appointmentUrl },
    };
  }

  if (type === "APPOINTMENT_REMINDER") {
    if (isDoctor) {
      return {
        subject,
        preheader: `Your appointment with ${counterpart} is coming up tomorrow.`,
        eyebrow: "Tomorrow's schedule",
        title: "A patient visit is coming up",
        greeting: `Hello Dr. ${name},`,
        paragraphs: ["Review the patient context now so you can begin the consultation prepared."],
        badge: "Tomorrow",
        tone: "warning",
        details: [{ label: "Patient", value: counterpart }, { label: "Date & time", value: when }],
        notice: { title: "Clinical context ready", text: "Symptoms, urgency, and the AI pre-visit summary are available in CareSync." },
        cta: { label: "Review patient details", url: appointmentUrl },
      };
    }
    return {
      subject,
      preheader: `Reminder: your appointment with ${counterpart} is coming up.`,
      eyebrow: "Appointment reminder",
      title: "Your visit is tomorrow",
      greeting: `Hello ${name},`,
      paragraphs: ["This is a friendly reminder about your upcoming appointment."],
      badge: "Coming up",
      tone: "warning",
      details: [{ label: "With", value: counterpart }, { label: "Date & time", value: when }],
      notice: { title: "Prepare in advance", text: "Review your symptoms and appointment details before the visit." },
      cta: { label: "View appointment", url: appointmentUrl },
    };
  }

  if (type === "MEDICATION_REMINDER") {
    return {
      subject,
      preheader: `It’s time for your ${payload.medication || "medication"}.`,
      eyebrow: "Medication reminder",
      title: "Time for your medication",
      greeting: `Hello ${name},`,
      paragraphs: ["This reminder follows the schedule saved by your clinician."],
      badge: "Due now",
      tone: "primary",
      details: [
        { label: "Medication", value: payload.medication || "See your care plan" },
        { label: "Dose", value: payload.dosage || "As directed" },
      ],
      notice: payload.instructions
        ? { title: "Instructions", text: payload.instructions }
        : { title: "Your care plan", text: "Take this medication only as instructed by your clinician." },
      cta: { label: "Open care plan", url: payload.visitUrl || appUrl("/patient") },
    };
  }

  if (type === "POST_VISIT_SUMMARY") {
    return {
      subject,
      preheader: "Your patient-friendly visit summary is ready in CareSync.",
      eyebrow: "Visit follow-up",
      title: "Your visit summary is ready",
      greeting: `Hello ${name},`,
      paragraphs: ["Your clinician has completed the visit notes. CareSync has prepared a clear summary with medication and follow-up steps."],
      badge: "Ready to review",
      tone: "success",
      notice: { title: "For your privacy", text: "Medical details are not included in this email. Sign in securely to read the full summary." },
      cta: { label: "View visit summary", url: payload.visitUrl || appUrl("/patient") },
    };
  }

  if (type === "EMAIL_TEST") {
    return {
      subject,
      preheader: "CareSync email delivery is working correctly.",
      eyebrow: "Integration check",
      title: "Your email connection is ready",
      greeting: `Hello ${name},`,
      paragraphs: ["CareSync successfully connected to your email delivery service."],
      badge: "Connected",
      tone: "success",
      details: [
        { label: "Booking updates", value: "Enabled" },
        { label: "Visit reminders", value: "Enabled" },
        { label: "Medication reminders", value: "Enabled" },
      ],
      cta: { label: "Open CareSync", url: appUrl("/settings") },
    };
  }

  return {
    subject,
    preheader: subject,
    eyebrow: "CareSync update",
    title: subject,
    greeting: `Hello ${name},`,
    paragraphs: [payload.text || "You have a new CareSync update."],
    tone: "primary",
    cta: { label: "Open CareSync", url: appUrl("/dashboard") },
  };
}

function renderHtml(content: EmailContent) {
  const tone = palette[content.tone || "primary"];
  const details = content.details?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border:1px solid #cae3e8;border-radius:14px;border-collapse:separate;overflow:hidden;">
        ${content.details.map((detail, index) => `<tr>
          <td style="padding:14px 16px;${index ? "border-top:1px solid #e3eff1;" : ""}color:#5d7480;font-size:14px;width:38%;">${escapeHtml(detail.label)}</td>
          <td style="padding:14px 16px;${index ? "border-top:1px solid #e3eff1;" : ""}color:#0d3140;font-size:15px;font-weight:700;text-align:right;">${escapeHtml(detail.value)}</td>
        </tr>`).join("")}
      </table>`
    : "";
  const notice = content.notice
    ? `<div style="margin:22px 0;padding:16px 18px;border-left:4px solid ${tone.accent};border-radius:10px;background:${tone.soft};">
        <div style="margin-bottom:4px;color:${tone.text};font-size:14px;font-weight:700;">${escapeHtml(content.notice.title)}</div>
        <div style="color:#355966;font-size:14px;line-height:1.55;">${escapeHtml(content.notice.text)}</div>
      </div>`
    : "";
  const cta = content.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;"><tr><td style="border-radius:11px;background:${tone.accent};">
        <a href="${safeUrl(content.cta.url)}" style="display:inline-block;padding:13px 22px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">${escapeHtml(content.cta.label)}</a>
      </td></tr></table>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(content.subject)}</title>
  <style>@media only screen and (max-width:620px){.email-shell{padding:16px!important}.email-card{border-radius:16px!important}.email-hero,.email-body{padding:24px!important}.email-title{font-size:28px!important}}</style>
</head>
<body style="margin:0;padding:0;background:#f4fbfc;color:#173f4b;font-family:Arial,'Helvetica Neue',sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(content.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4fbfc;">
    <tr><td class="email-shell" align="center" style="padding:34px 18px;">
      <table role="presentation" class="email-card" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;border:1px solid #cae3e8;border-radius:22px;border-collapse:separate;overflow:hidden;background:#ffffff;box-shadow:0 14px 42px rgba(17,74,88,.10);">
        <tr><td class="email-hero" style="padding:30px 34px;background:#0d3140;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="width:42px;height:42px;border-radius:12px;background:#087f9b;color:#ffffff;font-size:25px;font-weight:700;text-align:center;vertical-align:middle;">+</td>
            <td style="padding-left:12px;color:#ffffff;font-size:21px;font-weight:700;letter-spacing:-.3px;">CareSync</td>
          </tr></table>
          <div style="margin-top:30px;color:#9fe8f3;font-size:12px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase;">${escapeHtml(content.eyebrow)}</div>
          <h1 class="email-title" style="margin:9px 0 0;color:#ffffff;font-size:34px;line-height:1.14;letter-spacing:-.8px;">${escapeHtml(content.title)}</h1>
        </td></tr>
        <tr><td class="email-body" style="padding:32px 34px;">
          ${content.badge ? `<span style="display:inline-block;margin-bottom:20px;padding:7px 11px;border-radius:999px;background:${tone.soft};color:${tone.text};font-size:12px;font-weight:700;">${escapeHtml(content.badge)}</span>` : ""}
          <p style="margin:0 0 14px;color:#0d3140;font-size:17px;font-weight:700;">${escapeHtml(content.greeting)}</p>
          ${content.paragraphs.map((paragraph) => `<p style="margin:0 0 13px;color:#476773;font-size:16px;line-height:1.65;">${escapeHtml(paragraph)}</p>`).join("")}
          ${details}
          ${notice}
          ${cta}
        </td></tr>
        <tr><td style="padding:22px 34px;border-top:1px solid #e3eff1;background:#f8fcfd;color:#6b818a;font-size:12px;line-height:1.55;">
          <strong style="color:#355966;">CareSync</strong><br>
          This is a private transactional message about your care. For medical emergencies, contact local emergency services. Please do not reply with sensitive medical information.
        </td></tr>
      </table>
      <p style="margin:18px 0 0;color:#78909a;font-size:12px;">Sent securely by CareSync · Appointment and follow-up management</p>
    </td></tr>
  </table>
</body>
</html>`;
}

function renderText(content: EmailContent) {
  const lines = [
    "CARESYNC",
    content.eyebrow.toUpperCase(),
    "",
    content.title,
    "",
    content.greeting,
    ...content.paragraphs,
  ];
  if (content.details?.length) {
    lines.push("", ...content.details.map((detail) => `${detail.label}: ${detail.value}`));
  }
  if (content.notice) lines.push("", `${content.notice.title}: ${content.notice.text}`);
  if (content.cta) lines.push("", `${content.cta.label}: ${content.cta.url}`);
  lines.push("", "For medical emergencies, contact local emergency services.");
  return lines.join("\n");
}

export function renderNotificationEmail(type: string, subject: string, payload: NotificationEmailPayload) {
  const content = contentFor(type, subject, payload);
  return { subject: content.subject, html: renderHtml(content), text: renderText(content) };
}
