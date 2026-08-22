import { NextResponse } from "next/server";
import { listAvailableSlots } from "@/lib/availability";
import { HttpError, jsonError } from "@/lib/http";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const date = new URL(request.url).searchParams.get("date");
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(400, "A valid date is required");
    const slots = await listAvailableSlots(id, date);
    return NextResponse.json({ slots });
  } catch (error) {
    return jsonError(error);
  }
}
