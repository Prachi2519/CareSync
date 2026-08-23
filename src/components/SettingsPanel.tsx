"use client";

import {
  BellRing,
  CalendarCheck2,
  CheckCircle2,
  CircleAlert,
  Clock3,
  ExternalLink,
  Link2Off,
  Mail,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type CalendarState = { connected: boolean; configured: boolean };
type NotificationJob = {
  id: string;
  channel: "EMAIL" | "CALENDAR";
  type: string;
  status: "PENDING" | "PROCESSING" | "SENT" | "FAILED";
  recipient: string;
  subject: string | null;
  attempts: number;
  nextAttemptAt: string;
  sentAt: string | null;
  createdAt: string;
};
type NotificationState = {
  emailConfigured: boolean;
  emailFrom: string;
  jobs: NotificationJob[];
};

const notificationLabels: Record<string, string> = {
  BOOKING: "Appointment confirmation",
  RESCHEDULE: "Reschedule update",
  CANCELLATION: "Cancellation update",
  APPOINTMENT_REMINDER: "Appointment reminder",
  MEDICATION_REMINDER: "Medication reminder",
  POST_VISIT_SUMMARY: "Visit summary ready",
  CALENDAR_CREATE: "Calendar event created",
  CALENDAR_UPDATE: "Calendar event updated",
  CALENDAR_DELETE: "Calendar event removed",
  EMAIL_TEST: "Email connection test",
};

function formatActivityTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function SettingsPanel({ user }: { user: { name: string; email: string; phone: string | null; role: string } }) {
  const [calendar, setCalendar] = useState<CalendarState | null>(null);
  const [notifications, setNotifications] = useState<NotificationState | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState("");

  const load = useCallback(async () => {
    const [calendarResponse, notificationResponse] = await Promise.all([
      fetch("/api/integrations/google/status"),
      fetch("/api/notifications"),
    ]);
    if (calendarResponse.ok) setCalendar(await calendarResponse.json());
    if (notificationResponse.ok) setNotifications(await notificationResponse.json());
  }, []);

  useEffect(() => {
    void load();
    const value = new URLSearchParams(window.location.search).get("calendar");
    if (value === "connected") setMessage("Google Calendar connected successfully.");
    if (value === "error") setError("Google Calendar connection failed. Check the OAuth configuration and try again.");
  }, [load]);

  async function disconnect() {
    setBusyAction("disconnect");
    setError("");
    const response = await fetch("/api/integrations/google/status", { method: "DELETE" });
    setBusyAction("");
    if (!response.ok) {
      setError("Calendar could not be disconnected. Please try again.");
      return;
    }
    setMessage("Google Calendar disconnected.");
    await load();
  }

  async function notificationAction(action: "retry", jobId?: string) {
    const key = `retry-${jobId}`;
    setBusyAction(key);
    setError("");
    setMessage("");
    const response = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, jobId }),
    });
    const result = await response.json().catch(() => ({})) as { message?: string; error?: string };
    setBusyAction("");
    if (!response.ok) {
      setError(result.error || "The notification action failed. Please try again.");
      await load();
      return;
    }
    setMessage(result.message || "Notification updated successfully.");
    await load();
  }

  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>Account & integrations</h1>
          <p>Manage the services that keep your care schedule connected.</p>
        </div>
      </div>

      <div className="settings-feedback" aria-live="polite">
        {message && <div className="form-success"><CheckCircle2 size={18} aria-hidden="true" />{message}</div>}
        {error && <div className="form-error" role="alert"><CircleAlert size={18} aria-hidden="true" />{error}</div>}
      </div>

      <div className="dashboard-grid">
        <section className="panel span-6">
          <div className="panel-header">
            <div><h2>Your profile</h2><p>Account information</p></div>
            <ShieldCheck size={22} aria-hidden="true" />
          </div>
          <div className="metadata-list">
            <div className="metadata-row"><span>Name</span><strong>{user.name}</strong></div>
            <div className="metadata-row"><span>Email</span><strong>{user.email}</strong></div>
            <div className="metadata-row"><span>Phone</span><strong>{user.phone || "Not provided"}</strong></div>
            <div className="metadata-row"><span>Portal role</span><strong>{user.role.toLowerCase()}</strong></div>
          </div>
          <div className="notice" style={{ marginTop: 20 }}>Role changes and doctor profile details are managed by a clinic administrator.</div>
        </section>

        <section className="panel span-6 integration-card">
          <div className="panel-header">
            <div><h2>Google Calendar</h2><p>Keep appointment changes in sync</p></div>
            <CalendarCheck2 size={22} aria-hidden="true" />
          </div>
          <div className={`integration-status ${calendar?.connected ? "connected" : ""}`}>
            <span className="integration-status-dot" aria-hidden="true" />
            <div>
              <strong>{calendar === null ? "Checking connection…" : calendar.connected ? "Calendar connected" : "Calendar not connected"}</strong>
              <span>{calendar?.connected ? "Bookings, reschedules, and cancellations stay synchronized." : "Connect a Google account to add events automatically."}</span>
            </div>
          </div>
          {calendar?.connected ? (
            <button className="button button-danger" onClick={disconnect} disabled={busyAction === "disconnect"}>
              <Link2Off size={17} aria-hidden="true" />
              {busyAction === "disconnect" ? "Disconnecting…" : "Disconnect Calendar"}
            </button>
          ) : calendar?.configured ? (
            <a href="/api/integrations/google/start" className="button button-primary">
              <CalendarCheck2 size={18} aria-hidden="true" /> Connect Google Calendar <ExternalLink size={16} aria-hidden="true" />
            </a>
          ) : calendar !== null ? (
            <div className="notice">Calendar OAuth is not configured on this server. Add the Google environment variables described in the README.</div>
          ) : null}
        </section>

        <section className="panel span-12">
          <div className="panel-header">
            <div><h2>Notification activity</h2><p>Recent email and Calendar delivery for your account</p></div>
            <BellRing size={22} aria-hidden="true" />
          </div>
          {notifications === null ? (
            <div className="notification-list" aria-busy="true">
              <div className="skeleton" /><div className="skeleton" />
            </div>
          ) : notifications.jobs.length ? (
            <div className="notification-list">
              {notifications.jobs.map((job) => (
                <article className="notification-row" key={job.id}>
                  <span className="notification-icon" aria-hidden="true">
                    {job.channel === "EMAIL" ? <Mail size={19} /> : <CalendarCheck2 size={19} />}
                  </span>
                  <div className="notification-copy">
                    <div className="notification-title-row">
                      <strong>{notificationLabels[job.type] || job.subject || "CareSync update"}</strong>
                      <span className={`status-badge status-${job.status.toLowerCase()}`}>{job.status.toLowerCase()}</span>
                    </div>
                    <span className="notification-meta">
                      {job.channel === "EMAIL" ? `Email to ${job.recipient}` : "Google Calendar"} · {formatActivityTime(job.sentAt || job.createdAt)}
                    </span>
                    {job.status === "PROCESSING" && <span className="notification-progress"><Clock3 size={14} aria-hidden="true" /> Delivery in progress</span>}
                    {job.status === "FAILED" && (
                      <div className="notification-recovery">
                        <span><CircleAlert size={14} aria-hidden="true" /> Delivery failed after {job.attempts} attempt{job.attempts === 1 ? "" : "s"}. You can queue a fresh retry.</span>
                        <button
                          className="button button-secondary button-small"
                          onClick={() => notificationAction("retry", job.id)}
                          disabled={busyAction === `retry-${job.id}`}
                        >
                          <RefreshCcw size={15} aria-hidden="true" />
                          {busyAction === `retry-${job.id}` ? "Queueing…" : "Retry"}
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <BellRing size={28} aria-hidden="true" />
              <h3>No notifications yet</h3>
              <p>Your booking emails, reminders, and Calendar updates will appear here.</p>
            </div>
          )}
        </section>

        <section className="panel span-12">
          <div className="panel-header">
            <div><h2>What CareSync sends</h2><p>Private, timely updates throughout the care journey</p></div>
            <BellRing size={22} aria-hidden="true" />
          </div>
          <div className="feature-grid">
            <div className="notice"><strong>Booking updates</strong><br />Confirmations, reschedules, and cancellations for both participants.</div>
            <div className="notice"><strong>Visit reminder</strong><br />A reminder is prepared around 24 hours before scheduled visits.</div>
            <div className="notice"><strong>Medication reminder</strong><br />Due reminders follow the clinician’s saved frequency and duration.</div>
          </div>
        </section>
      </div>
    </>
  );
}
