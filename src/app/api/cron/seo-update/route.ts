// Cron: seo-update — daily at 4:00 AM
// Updates sitemap, robots.txt, RSS feed, and pings search engines.

import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth, unauthorizedResponse } from "@/lib/cron-auth";
import { revalidatePath } from "next/cache";
import { getAllClaimsDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://evidencehubsleep.com";

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return unauthorizedResponse();
  }

  console.log("[Cron] seo-update started at", new Date().toISOString());

  const actions: string[] = [];
  const errors: string[] = [];

  try {
    // 1. Revalidate sitemap and robots (they read from DB/static data)
    revalidatePath("/sitemap.xml");
    revalidatePath("/robots.txt");
    actions.push("Revalidated sitemap.xml and robots.txt");

    // 2. Revalidate RSS feed
    revalidatePath("/rss.xml");
    actions.push("Revalidated rss.xml");

    // 3. Ping Google about sitemap update
    try {
      const googlePingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(`${SITE_URL}/sitemap.xml`)}`;
      const resp = await fetch(googlePingUrl, { method: "GET" });
      actions.push(`Pinged Google sitemap ping (HTTP ${resp.status})`);
    } catch (err) {
      errors.push(`Google ping failed: ${err}`);
    }

    // 4. Submit to IndexNow (Bing, Yandex) if key is configured
    const indexNowKey = process.env.INDEXNOW_KEY;
    if (indexNowKey) {
      try {
        const claims = await getAllClaimsDb();
        const urls = [
          SITE_URL,
          `${SITE_URL}/claims`,
          `${SITE_URL}/topics`,
          ...claims.map((c) => `${SITE_URL}/claim/${c.slug}`),
        ];

        const resp = await fetch("https://api.indexnow.org/IndexNow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            host: new URL(SITE_URL).host,
            key: indexNowKey,
            urlList: urls.slice(0, 10000), // IndexNow limit
          }),
        });
        actions.push(`Submitted ${urls.length} URLs to IndexNow (HTTP ${resp.status})`);
      } catch (err) {
        errors.push(`IndexNow submission failed: ${err}`);
      }
    } else {
      actions.push("IndexNow key not configured, skipping");
    }

    console.log(`[Cron] seo-update complete. ${actions.length} actions performed.`);

    return NextResponse.json({
      ok: true,
      job: "seo-update",
      actions,
      errors,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[Cron] seo-update failed:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
