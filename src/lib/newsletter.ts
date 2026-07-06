// EvidenceHub Sleep — Newsletter Module
// Generates and sends weekly email newsletters with the latest claims.
// Supports Resend, SendGrid, or any SMTP provider.

import { getSupabase, isSupabaseConfigured } from "./supabase";
import { getAllClaimsDb } from "./db";
import type { Claim } from "./types";

// ============================================================
// Newsletter generation
// ============================================================

export interface NewsletterContent {
  subject: string;
  html: string;
  text: string;
  claimsCount: number;
  rctCount: number;
  metaCount: number;
}

/**
 * Generate the weekly newsletter content from recent claims.
 */
export async function generateWeeklyNewsletter(): Promise<NewsletterContent> {
  const claims = await getAllClaimsDb();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const recentClaims = claims.filter(
    (c) => new Date(c.lastUpdated) > oneWeekAgo
  );

  const rctCount = recentClaims.filter((c) => c.rctCount > 0).length;
  const metaCount = recentClaims.filter((c) => c.metaCount > 0).length;

  const topClaims = [...recentClaims]
    .sort((a, b) => b.evidenceScore - a.evidenceScore)
    .slice(0, 5);

  const subject = `EvidenceHub Sleep Weekly: ${recentClaims.length} new claims, ${rctCount} RCTs, ${metaCount} meta-analyses`;

  const html = generateNewsletterHtml(topClaims, recentClaims.length, rctCount, metaCount);
  const text = generateNewsletterText(topClaims, recentClaims.length, rctCount, metaCount);

  return {
    subject,
    html,
    text,
    claimsCount: recentClaims.length,
    rctCount,
    metaCount,
  };
}

function generateNewsletterHtml(claims: Claim[], total: number, rcts: number, metas: number): string {
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://evidencehubsleep.com";

  const claimItems = claims
    .map(
      (c) => `
    <tr>
      <td style="padding: 16px 0; border-bottom: 1px solid #eee;">
        <h3 style="margin: 0 0 8px;">
          <a href="${SITE_URL}/claim/${c.slug}" style="color: #185FA5; text-decoration: none;">
            ${c.text}
          </a>
        </h3>
        <p style="color: #666; font-size: 14px; margin: 0 0 8px;">${c.summary.slice(0, 200)}...</p>
        <span style="display: inline-block; background: #E6F1FB; color: #0C447C; padding: 2px 8px; border-radius: 4px; font-size: 12px;">
          Evidence Score: ${c.evidenceScore}/100
        </span>
        <span style="display: inline-block; background: #EAF3DE; color: #3B6D11; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-left: 4px;">
          ${c.rctCount} RCTs · ${c.metaCount} Meta · ${c.studyCount} Studies
        </span>
      </td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EvidenceHub Sleep Weekly</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <h1 style="color: #185FA5; border-bottom: 2px solid #E6F1FB; padding-bottom: 10px;">
    EvidenceHub Sleep — Weekly Digest
  </h1>
  <p style="font-size: 16px; color: #666;">
    This week: <strong>${total} new claims</strong>, <strong>${rcts} RCTs</strong>, <strong>${metas} meta-analyses</strong>
  </p>
  <table style="width: 100%; border-collapse: collapse;">
    ${claimItems}
  </table>
  <p style="margin-top: 24px; text-align: center;">
    <a href="${SITE_URL}" style="display: inline-block; background: #185FA5; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
      View All Claims
    </a>
  </p>
  <p style="font-size: 12px; color: #999; text-align: center; margin-top: 24px;">
    You're receiving this because you subscribed to EvidenceHub Sleep.<br>
    <a href="${SITE_URL}/unsubscribe" style="color: #999;">Unsubscribe</a>
  </p>
</body>
</html>`;
}

function generateNewsletterText(claims: Claim[], total: number, rcts: number, metas: number): string {
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://evidencehubsleep.com";

  const claimTexts = claims
    .map((c) => `- ${c.text} (Score: ${c.evidenceScore}/100)\n  ${SITE_URL}/claim/${c.slug}`)
    .join("\n\n");

  return `EvidenceHub Sleep — Weekly Digest

This week: ${total} new claims, ${rcts} RCTs, ${metas} meta-analyses

Top claims:
${claimTexts}

View all claims: ${SITE_URL}

You're receiving this because you subscribed to EvidenceHub Sleep.
Unsubscribe: ${SITE_URL}/unsubscribe`;
}

// ============================================================
// Newsletter sending (Job 7 — weekly)
// ============================================================

export interface NewsletterSendResult {
  recipients: number;
  sent: number;
  errors: string[];
  timestamp: string;
}

/**
 * Job 7: Send weekly newsletter.
 * Runs every Friday. Uses Resend, SendGrid, or configurable SMTP.
 *
 * To enable:
 * - Install: npm install resend
 * - Set: RESEND_API_KEY=your_key
 * - Set: NEWSLETTER_FROM_EMAIL=hello@evidencehubsleep.com
 */
export async function jobSendNewsletter(): Promise<NewsletterSendResult> {
  const result: NewsletterSendResult = {
    recipients: 0,
    sent: 0,
    errors: [],
    timestamp: new Date().toISOString(),
  };

  console.log("[Job 7: newsletter] Starting weekly newsletter send...");

  // 1. Generate newsletter content
  const content = await generateWeeklyNewsletter();

  if (content.claimsCount === 0) {
    console.log("[Job 7] No new claims this week. Skipping newsletter.");
    return result;
  }

  console.log(`[Job 7] Newsletter: "${content.subject}" (${content.claimsCount} claims)`);

  // 2. Get subscribers from database
  if (!isSupabaseConfigured) {
    console.log("[Job 7] Supabase not configured. Newsletter not sent.");
    result.errors.push("Supabase not configured");
    return result;
  }

  const supabase = getSupabase()!;
  const { data: subscribers, error } = await supabase
    .from("newsletter_subscribers")
    .select("email")
    .eq("status", "active");

  if (error || !subscribers) {
    result.errors.push(`Failed to fetch subscribers: ${error}`);
    return result;
  }

  result.recipients = subscribers.length;

  if (subscribers.length === 0) {
    console.log("[Job 7] No subscribers. Newsletter not sent.");
    return result;
  }

  // 3. Send emails
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.NEWSLETTER_FROM_EMAIL || "noreply@evidencehubsleep.com";

  if (!resendKey) {
    console.log("[Job 7] RESEND_API_KEY not configured. Newsletter not sent.");
    console.log(`[Job 7] Would send to ${subscribers.length} subscribers: "${content.subject}"`);
    result.errors.push("RESEND_API_KEY not configured");
    return result;
  }

  // Send via Resend API
  for (const sub of subscribers) {
    try {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: sub.email,
          subject: content.subject,
          html: content.html,
          text: content.text,
        }),
      });

      if (resp.ok) {
        result.sent++;
      } else {
        result.errors.push(`Failed to send to ${sub.email}: HTTP ${resp.status}`);
      }
    } catch (err) {
      result.errors.push(`Send failed for ${sub.email}: ${err}`);
    }
  }

  // 4. Log newsletter as content asset
  await supabase.from("content_assets").insert({
    channel: "newsletter",
    title: content.subject,
    body: content.text,
    status: "published",
    published_at: new Date().toISOString(),
  });

  console.log(`[Job 7] Complete. Sent to ${result.sent}/${result.recipients} subscribers.`);
  return result;
}
