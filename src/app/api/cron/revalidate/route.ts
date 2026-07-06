// Cron: revalidate — hourly at :30
// Triggers on-demand ISR revalidation for claim and topic pages that were updated.

import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth, unauthorizedResponse } from "@/lib/cron-auth";
import { revalidatePath } from "next/cache";
import { getAllClaimsDb, getAllTopicsDb, isDbMode } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return unauthorizedResponse();
  }

  console.log("[Cron] revalidate started at", new Date().toISOString());

  const revalidated: string[] = [];
  const errors: string[] = [];

  try {
    // Revalidate static pages
    const staticPaths = ["/", "/claims", "/topics", "/search", "/api-docs"];
    for (const path of staticPaths) {
      try {
        revalidatePath(path);
        revalidated.push(path);
      } catch (err) {
        errors.push(`Failed to revalidate ${path}: ${err}`);
      }
    }

    // Revalidate all claim pages
    const claims = await getAllClaimsDb();
    for (const claim of claims) {
      try {
        revalidatePath(`/claim/${claim.slug}`);
        revalidated.push(`/claim/${claim.slug}`);
      } catch (err) {
        errors.push(`Failed to revalidate /claim/${claim.slug}: ${err}`);
      }
    }

    // Revalidate all topic pages
    const topics = await getAllTopicsDb();
    for (const topic of topics) {
      try {
        revalidatePath(`/topics/${topic.slug}`);
        revalidated.push(`/topics/${topic.slug}`);
      } catch (err) {
        errors.push(`Failed to revalidate /topics/${topic.slug}: ${err}`);
      }
    }

    // Revalidate sitemap and robots
    revalidatePath("/sitemap.xml");
    revalidated.push("/sitemap.xml");

    console.log(`[Cron] revalidate complete. ${revalidated.length} paths revalidated.`);

    return NextResponse.json({
      ok: true,
      job: "revalidate",
      revalidatedCount: revalidated.length,
      revalidated,
      errors,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[Cron] revalidate failed:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
