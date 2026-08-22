import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError, normalizeEmail } from "@/lib/http";
import { loginSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const input = loginSchema.parse(await request.json());
    const user = await db.user.findUnique({ where: { email: normalizeEmail(input.email) } });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    await createSession({ userId: user.id, role: user.role, name: user.name });
    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    return jsonError(error);
  }
}
