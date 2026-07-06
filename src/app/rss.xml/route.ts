// EvidenceHub Sleep — RSS Feed Route
// Serves /rss.xml with latest claims as RSS 2.0 feed.

import { getAllClaims } from "@/lib/data";
import { getAllClaimsDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://evidencehubsleep.com";

export async function GET() {
  // Try DB first, fall back to static data
  let claims;
  try {
    claims = await getAllClaimsDb();
    if (claims.length === 0) {
      const { getAllClaims } = await import("@/lib/data");
      claims = getAllClaims();
    }
  } catch {
    const { getAllClaims } = await import("@/lib/data");
    claims = getAllClaims();
  }

  const sortedClaims = [...claims]
    .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
    .slice(0, 20);

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>EvidenceHub Sleep — Latest Evidence</title>
    <link>${SITE_URL}</link>
    <description>AI-driven evidence-based sleep knowledge system. Track the latest sleep science claims, RCTs, and meta-analyses.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
${sortedClaims
  .map(
    (claim) => `    <item>
      <title><![CDATA[${claim.text}]]></title>
      <link>${SITE_URL}/claim/${claim.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/claim/${claim.slug}</guid>
      <description><![CDATA[${claim.summary}]]></description>
      <category><![CDATA[${claim.category}]]></category>
      <pubDate>${new Date(claim.lastUpdated).toUTCString()}</pubDate>
    </item>`
  )
  .join("\n")}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}
