import { afterEach, describe, expect, it } from "vitest";
import { renderNotificationEmail } from "@/lib/email-templates";

const previousAppUrl = process.env.APP_URL;
const previousTimezone = process.env.APP_TIMEZONE;

afterEach(() => {
  process.env.APP_URL = previousAppUrl;
  process.env.APP_TIMEZONE = previousTimezone;
});

describe("CareSync email templates", () => {
  it("renders a branded booking email with HTML and plain-text fallbacks", () => {
    const email = renderNotificationEmail("BOOKING", "Appointment confirmed", {
      recipientName: "Riya Sharma",
      counterpart: "Dr. Ananya Mehta",
      when: "Monday, August 24 at 10:30 AM",
      appointmentUrl: "https://caresync.example/patient/appointments/123",
    });

    expect(email.html).toContain("CareSync");
    expect(email.html).toContain("Your visit is booked");
    expect(email.html).toContain("Dr. Ananya Mehta");
    expect(email.html).toContain("View appointment");
    expect(email.text).toContain("Monday, August 24 at 10:30 AM");
    expect(email.text).toContain("https://caresync.example/patient/appointments/123");
  });

  it("escapes user-controlled content before adding it to HTML", () => {
    const email = renderNotificationEmail("CANCELLATION", "Appointment cancelled", {
      recipientName: "<script>alert('x')</script>",
      counterpart: "Dr. Safe",
      cancellationReason: "Clinic <closed> & unavailable",
      appointmentUrl: "javascript:alert(1)",
    });

    expect(email.html).not.toContain("<script>alert");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).toContain("Clinic &lt;closed&gt; &amp; unavailable");
    expect(email.html).toContain('href="#"');
  });

  it("formats appointment times in the configured clinic timezone", () => {
    process.env.APP_TIMEZONE = "Asia/Kolkata";
    const email = renderNotificationEmail("BOOKING", "Appointment confirmed", {
      recipientName: "Riya",
      counterpart: "Dr. Ananya",
      startTime: "2026-08-24T05:00:00.000Z",
    });
    expect(email.text).toMatch(/10:30\s*am/i);
  });

  it.each([
    "BOOKING",
    "RESCHEDULE",
    "CANCELLATION",
    "APPOINTMENT_REMINDER",
    "MEDICATION_REMINDER",
    "POST_VISIT_SUMMARY",
    "EMAIL_TEST",
  ])("renders the %s template without undefined values", (type) => {
    process.env.APP_URL = "https://caresync.example";
    const email = renderNotificationEmail(type, "CareSync update", { recipientName: "Riya" });
    expect(email.html).toContain("<!doctype html>");
    expect(email.html).not.toContain("undefined");
    expect(email.text).not.toContain("undefined");
  });
});
