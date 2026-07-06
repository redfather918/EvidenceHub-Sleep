// Cron: update-claims — hourly at :15
// Deduplicates new claims, merges into existing claims, recalculates evidence scores.

import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth, unauthorizedResponse } from "@/lib/cron-auth";
import { jobUpdateClaims } from "@/pipeline/jobs/update-claims";
import { logPipelineRunDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return unauthorizedResponse();
  }

  const startedAt = new Date().toISOString();
  console.log("[Cron] update-claims started at", startedAt);

  try {
    const result = await jobUpdateClaims();

    await logPipelineRunDb({
      status: result.errors.length > 0 ? "partial" : "success",
      papersFetched: 0,
      claimsExtracted: result.claimsProcessed,
      claimsNew: result.claimsCreated,
      claimsUpdated: result.claimsUpdated,
      claimsSkipped: result.claimsSkipped,
      errorsCount: result.errors.length,
      log: JSON.stringify(result),
      errorMessage: result.errors.join("; ") || undefined,
      dryRun: false,
      aiProvider: process.env.AI_PROVIDER || "mock",
      startedAt,
      finishedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      job: "update-claims",
      ...result,
    });
  } catch (err) {
    console.error("[Cron] update-claims failed:", err);

    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
