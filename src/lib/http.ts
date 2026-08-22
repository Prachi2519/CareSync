import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function jsonError(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: error.issues[0]?.message || "Invalid request", issues: error.issues },
      { status: 400 },
    );
  }
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Please sign in to continue" }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "You do not have permission for this action" }, { status: 403 });
    }
    console.error(error);
  }
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
