// Cron: fetch-papers — daily at 2:00 AM
// Fetches new papers from PubMed and stores them in the database.

import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth, unauthorizedResponse } from "@/lib/cron-auth";
import { jobFetchPapers } from "@/pipeline/jobs/fetch-papers";
import { logPipelineRunDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return unauthorizedResponse();
  }

  const startedAt = new Date().toISOString();
  console.log("[Cron] fetch-papers started at", startedAt);

  try {
    const result = await jobFetchPapers();

    await logPipelineRunDb({
      status: result.errors.length > 0 ? "partial" : "success",
      papersFetched: result.papersFetched,
      claimsExtracted: 0,
      claimsNew: 0,
      claimsUpdated: 0,
      claimsSkipped: 0,
      errorsCount: result.errors.length,
      log: JSON.stringify(result),
      errorMessage: result.errors.join("; ") || undefined,
      dryRun: false,
      aiProvider: "n/a",
      startedAt,
      finishedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      job: "fetch-papers",
      ...result,
    });
  } catch (err) {
    console.error("[Cron] fetch-papers failed:", err);

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
      aiProvider: "n/a",
      startedAt,
      finishedAt: new Date().toISOString(),
    });

    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
