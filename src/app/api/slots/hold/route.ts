import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { acquireSlot } from "@/lib/availability";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { holdSlotSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const session = await requireSession(["PATIENT"]);
    const input = holdSlotSchema.parse(await request.json());
    const slot = await db.$transaction((tx) =>
      acquireSlot(tx, {
        doctorId: input.doctorId,
        patientId: session.userId,
        startTime: new Date(input.startTime),
      }),
    );
    return NextResponse.json(
      { holdToken: slot.holdToken, expiresAt: slot.holdExpiresAt, endTime: slot.endTime },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error);
  }
}
