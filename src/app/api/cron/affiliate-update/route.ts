// Affiliate update cron endpoint — weekly on Monday at 6:00 AM
// Updates Amazon prices, iHerb stock, and brand links.

import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth, unauthorizedResponse } from "@/lib/cron-auth";
import { jobUpdateAffiliate } from "@/lib/affiliate";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return unauthorizedResponse();
  }

  console.log("[Cron] affiliate-update started at", new Date().toISOString());

  try {
    const result = await jobUpdateAffiliate();

    return NextResponse.json({
      ok: true,
      job: "affiliate-update",
      ...result,
    });
  } catch (err) {
    console.error("[Cron] affiliate-update failed:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
