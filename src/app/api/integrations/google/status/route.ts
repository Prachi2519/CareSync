import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await requireSession();
  const connection = await db.googleConnection.findUnique({ where: { userId: session.userId } });
  return NextResponse.json({ connected: Boolean(connection), configured: Boolean(process.env.GOOGLE_CLIENT_ID) });
}

export async function DELETE() {
  const session = await requireSession();
  await db.googleConnection.deleteMany({ where: { userId: session.userId } });
  return NextResponse.json({ ok: true });
}
