// Cron: ai-parse — hourly at :00
// Reads unprocessed papers, runs AI extraction, stores extracted claims.

import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth, unauthorizedResponse } from "@/lib/cron-auth";
import { jobAiParse } from "@/pipeline/jobs/ai-parse";
import { logPipelineRunDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return unauthorizedResponse();
  }

  const startedAt = new Date().toISOString();
  console.log("[Cron] ai-parse started at", startedAt);

  try {
    const result = await jobAiParse();

    await logPipelineRunDb({
      status: result.errors.length > 0 ? "partial" : "success",
      papersFetched: result.papersProcessed,
      claimsExtracted: result.claimsExtracted,
      claimsNew: result.claimsStored,
      claimsUpdated: 0,
      claimsSkipped: result.papersProcessed - result.claimsExtracted,
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
      job: "ai-parse",
      ...result,
      extractedClaims: result.extractedClaims.length, // Don't return full claims in response
    });
  } catch (err) {
    console.error("[Cron] ai-parse failed:", err);

    await logPipelineRunDb({
      status: "failed",
      papersFetched: 0,
      claimsExtracted: 0,
      claimsNew: 0,
      claimsUpdated: 0,
      claimsSkipped: 0,
      errorsCount: 1,
      errorMessage: String(err),
      dryRun: false,
      aiProvider: process.env.AI_PROVIDER || "mock",
      startedAt,
      finishedAt: new Date().toISOString(),
    });

    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
