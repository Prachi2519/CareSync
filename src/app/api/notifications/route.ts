import { addMinutes } from "date-fns";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { renderNotificationEmail } from "@/lib/email-templates";
import { HttpError, jsonError } from "@/lib/http";
import { isEmailConfigured, sendEmail } from "@/lib/mail";

export async function GET() {
  try {
    const session = await requireSession();
    const jobs = await db.notificationJob.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        channel: true,
        type: true,
        status: true,
        recipient: true,
        subject: true,
        attempts: true,
        nextAttemptAt: true,
        sentAt: true,
        createdAt: true,
      },
    });
    return NextResponse.json({
      emailConfigured: isEmailConfigured(),
      emailFrom: process.env.EMAIL_FROM || "CareSync",
      jobs,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const user = await db.user.findUnique({ where: { id: session.userId } });
    if (!user) throw new HttpError(404, "Account not found");
    const body = await request.json().catch(() => ({})) as { action?: string; jobId?: string };

    if (body.action === "retry") {
      if (!body.jobId) throw new HttpError(400, "Notification job is required");
      const result = await db.notificationJob.updateMany({
        where: { id: body.jobId, userId: session.userId, status: "FAILED" },
        data: { status: "PENDING", attempts: 0, nextAttemptAt: new Date(), lastError: null },
      });
      if (!result.count) throw new HttpError(404, "Failed notification not found");
      return NextResponse.json({ ok: true, message: "Delivery retry queued." });
    }

    if (body.action !== "test") throw new HttpError(400, "Unsupported notification action");
    if (!isEmailConfigured()) throw new HttpError(503, "Email delivery is not configured");

    const subject = "Your CareSync email connection is ready";
    const payload = { recipientName: user.name };
    const job = await db.notificationJob.create({
      data: {
        userId: user.id,
        channel: "EMAIL",
        type: "EMAIL_TEST",
        recipient: user.email,
        subject,
        payload: JSON.stringify(payload),
        status: "PROCESSING",
        attempts: 1,
      },
    });
    try {
      const email = renderNotificationEmail("EMAIL_TEST", subject, payload);
      await sendEmail({ to: user.email, subject: email.subject, text: email.text, html: email.html });
      await db.notificationJob.update({
        where: { id: job.id },
        data: { status: "SENT", sentAt: new Date(), lastError: null },
      });
      return NextResponse.json({ ok: true, message: `Test email sent to ${user.email}.` });
    } catch (error) {
      await db.notificationJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          lastError: error instanceof Error ? error.message.slice(0, 500) : "Email delivery failed",
          nextAttemptAt: addMinutes(new Date(), 5),
        },
      });
      throw new HttpError(502, "The test email could not be delivered. Review SMTP settings and try again.");
    }
  } catch (error) {
    return jsonError(error);
  }
}
