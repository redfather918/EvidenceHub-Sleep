// EvidenceHub Sleep — Cron Auth Helper
// Verifies the CRON_SECRET header for all cron API routes.

import { NextRequest, NextResponse } from "next/server";

const CRON_SECRET = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET || "";

/**
 * Verify that the request is authorized to run cron jobs.
 * Checks for CRON_SECRET in Authorization header or x-vercel-cron-auth header.
 */
export function verifyCronAuth(req: NextRequest): boolean {
  // If no secret is configured, allow in development but block in production
  if (!CRON_SECRET) {
    if (process.env.NODE_ENV === "production") {
      console.error("[Cron] CRON_SECRET not configured. Blocking request in production.");
      return false;
    }
    console.warn("[Cron] CRON_SECRET not configured. Allowing in development.");
    return true;
  }

  const authHeader = req.headers.get("authorization");
  const cronAuth = req.headers.get("x-vercel-cron-auth");

  if (authHeader === `Bearer ${CRON_SECRET}`) return true;
  if (cronAuth === CRON_SECRET) return true;

  return false;
}

/**
 * Standard unauthorized response.
 */
export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
