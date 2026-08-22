import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { jsonError, normalizeEmail } from "@/lib/http";
import { registerSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const input = registerSchema.parse(await request.json());
    const email = normalizeEmail(input.email);
    if (await db.user.findUnique({ where: { email } })) {
      return NextResponse.json({ error: "An account already exists for this email" }, { status: 409 });
    }
    const user = await db.user.create({
      data: {
        name: input.name,
        email,
        phone: input.phone || null,
        role: "PATIENT",
        passwordHash: await bcrypt.hash(input.password, 12),
      },
      select: { id: true, name: true, email: true, role: true },
    });
    await createSession({ userId: user.id, role: user.role, name: user.name });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
