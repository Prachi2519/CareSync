import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";

export async function GET() {
  await requireSession();
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json({ error: "Google Calendar is not configured on this server" }, { status: 503 });
  }
  const state = crypto.randomUUID();
  (await cookies()).set("gcal_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL || "http://localhost:3000"}/api/integrations/google/callback`;
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: "https://www.googleapis.com/auth/calendar.events",
    state,
  }).toString();
  return NextResponse.redirect(url);
}
