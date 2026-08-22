import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { HttpError, jsonError } from "@/lib/http";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const doctor = await db.doctorProfile.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true } }, leaves: true },
    });
    if (!doctor || !doctor.active) throw new HttpError(404, "Doctor not found");
    return NextResponse.json({ doctor: { ...doctor, workingHours: JSON.parse(doctor.workingHours) } });
  } catch (error) {
    return jsonError(error);
  }
}
