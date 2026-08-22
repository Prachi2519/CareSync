import { db } from "@/lib/db";

type CalendarPayload = {
  appointmentId: string;
  userId: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  title: string;
  description: string;
  startTime: string;
  endTime: string;
};

async function accessTokenFor(userId: string) {
  const connection = await db.googleConnection.findUnique({ where: { userId } });
  if (!connection) return null;
  if (!connection.expiresAt || connection.expiresAt.getTime() > Date.now() + 60_000) {
    return { token: connection.accessToken, calendarId: connection.calendarId };
  }
  if (!connection.refreshToken || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error("Google Calendar connection has expired; reconnect it in Settings");
  }
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: connection.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) throw new Error("Unable to refresh Google Calendar access");
  const token = (await response.json()) as { access_token: string; expires_in?: number };
  await db.googleConnection.update({
    where: { userId },
    data: {
      accessToken: token.access_token,
      expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
    },
  });
  return { token: token.access_token, calendarId: connection.calendarId };
}

export async function runCalendarJob(payload: CalendarPayload) {
  const auth = await accessTokenFor(payload.userId);
  if (!auth) {
    console.info(`[calendar:skipped] No Google connection for user ${payload.userId}`);
    return { mode: "not-connected" as const };
  }
  const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(auth.calendarId)}/events`;
  const existing = await db.calendarEventLink.findUnique({
    where: { appointmentId_userId: { appointmentId: payload.appointmentId, userId: payload.userId } },
  });
  const headers = { Authorization: `Bearer ${auth.token}`, "Content-Type": "application/json" };

  if (payload.action === "DELETE") {
    if (!existing) return { mode: "already-absent" as const };
    const response = await fetch(`${base}/${encodeURIComponent(existing.eventId)}?sendUpdates=all`, {
      method: "DELETE",
      headers,
    });
    if (!response.ok && response.status !== 404) throw new Error(`Calendar delete failed (${response.status})`);
    await db.calendarEventLink.delete({ where: { id: existing.id } });
    return { mode: "deleted" as const };
  }

  const event = {
    summary: payload.title,
    description: payload.description,
    start: { dateTime: payload.startTime },
    end: { dateTime: payload.endTime },
  };
  const response = await fetch(
    existing ? `${base}/${encodeURIComponent(existing.eventId)}?sendUpdates=all` : `${base}?sendUpdates=all`,
    { method: existing ? "PATCH" : "POST", headers, body: JSON.stringify(event) },
  );
  if (!response.ok) throw new Error(`Calendar ${existing ? "update" : "create"} failed (${response.status})`);
  const saved = (await response.json()) as { id: string };
  await db.calendarEventLink.upsert({
    where: { appointmentId_userId: { appointmentId: payload.appointmentId, userId: payload.userId } },
    create: { appointmentId: payload.appointmentId, userId: payload.userId, eventId: saved.id },
    update: { eventId: saved.id },
  });
  return { mode: existing ? ("updated" as const) : ("created" as const) };
}
