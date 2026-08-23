import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, jsonError } from "@/lib/http";
import { doctorSchema } from "@/lib/validators";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(["ADMIN"]);
    const { id } = await context.params;
    const input = doctorSchema.partial().parse(await request.json());
    const doctor = await db.doctorProfile.findUnique({ where: { id }, include: { user: true } });
    if (!doctor) throw new HttpError(404, "Doctor not found");
    const updated = await db.doctorProfile.update({
      where: { id },
      data: {
        specialization: input.specialization,
        qualifications: input.qualifications,
        bio: input.bio,
        notificationEmail: input.email,
        yearsExperience: input.yearsExperience,
        slotDurationMinutes: input.slotDurationMinutes,
        workingHours: input.workingHours ? JSON.stringify(input.workingHours) : undefined,
        user: { update: { name: input.name, email: input.email } },
      },
      include: { user: true },
    });
    return NextResponse.json({ doctor: updated });
  } catch (error) {
    return jsonError(error);
  }
}
