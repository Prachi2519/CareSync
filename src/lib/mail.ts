import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

type MailInput = { to: string; subject: string; text: string; html?: string };

let transport: Transporter | null = null;

export function isEmailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

function getTransport() {
  if (!transport) {
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    });
  }
  return transport;
}

export async function sendEmail(input: MailInput) {
  if (!process.env.SMTP_HOST) {
    console.info(`[email:console] ${input.subject} -> ${input.to}`);
    return { mode: "console" as const };
  }
  const info = await getTransport().sendMail({
    from: process.env.EMAIL_FROM || "CareSync <appointments@example.com>",
    replyTo: process.env.SMTP_REPLY_TO || undefined,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
  return { mode: "smtp" as const, messageId: info.messageId };
}
