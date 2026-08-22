import { NextResponse } from "next/server";
import { runBackgroundJobs } from "@/lib/job-worker";

async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, ...(await runBackgroundJobs()) });
}

export const GET = run;
export const POST = run;
