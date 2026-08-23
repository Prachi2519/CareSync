import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError, normalizeEmail } from "@/lib/http";
import { doctorSchema } from "@/lib/validators";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const specialization = searchParams.get("specialization")?.trim();
    const doctors = await db.doctorProfile.findMany({
      where: {
        active: true,
        ...(specialization
          ? { specialization: { contains: specialization } }
          : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        leaves: {
          where: { date: { gte: new Date().toISOString().slice(0, 10) } },
          orderBy: { date: "asc" },
        },
      },
      orderBy: [{ specialization: "asc" }, { user: { name: "asc" } }],
    });
    return NextResponse.json({ doctors: doctors.map((doctor) => ({ ...doctor, workingHours: JSON.parse(doctor.workingHours) })) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireSession(["ADMIN"]);
    const input = doctorSchema.parse(await request.json());
    const email = normalizeEmail(input.email);
    if (await db.user.findUnique({ where: { email } })) {
      return NextResponse.json({ error: "A user already exists with this email" }, { status: 409 });
    }
    const doctor = await db.user.create({
      data: {
        name: input.name,
        email,
        role: "DOCTOR",
        passwordHash: await bcrypt.hash(input.password || "Doctor@123", 12),
        doctorProfile: {
          create: {
            specialization: input.specialization,
            qualifications: input.qualifications,
            bio: input.bio,
            notificationEmail: email,
            yearsExperience: input.yearsExperience,
            slotDurationMinutes: input.slotDurationMinutes,
            workingHours: JSON.stringify(input.workingHours),
          },
        },
      },
      include: { doctorProfile: true },
    });
    return NextResponse.json({ doctor }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
