// Newsletter send cron endpoint — weekly on Friday at 9:00 AM
// Sends the weekly email newsletter with latest claims.

import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth, unauthorizedResponse } from "@/lib/cron-auth";
import { jobSendNewsletter } from "@/lib/newsletter";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return unauthorizedResponse();
  }

  console.log("[Cron] newsletter-send started at", new Date().toISOString());

  try {
    const result = await jobSendNewsletter();

    return NextResponse.json({
      ok: true,
      job: "newsletter-send",
      ...result,
    });
  } catch (err) {
    console.error("[Cron] newsletter-send failed:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
