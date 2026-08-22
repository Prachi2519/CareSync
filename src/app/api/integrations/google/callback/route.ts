import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const session = await requireSession();
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const cookieStore = await cookies();
  if (!state || !code || state !== cookieStore.get("gcal_oauth_state")?.value) {
    return NextResponse.redirect(new URL("/settings?calendar=error", request.url));
  }
  cookieStore.delete("gcal_oauth_state");
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL || "http://localhost:3000"}/api/integrations/google/callback`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!response.ok) return NextResponse.redirect(new URL("/settings?calendar=error", request.url));
  const token = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };
  await db.googleConnection.upsert({
    where: { userId: session.userId },
    create: {
      userId: session.userId,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
      scope: token.scope,
    },
    update: {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
      scope: token.scope,
    },
  });
  return NextResponse.redirect(new URL("/settings?calendar=connected", request.url));
}
