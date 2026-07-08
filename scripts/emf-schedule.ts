#!/usr/bin/env tsx
// EvidenceHub Media Factory (EMF) — Scheduler CLI (P1)
// Generates the upcoming week's content matrix and persists to media_plan
// when Supabase is configured.
//
// Usage:
//   npm run emf:schedule                 # dry-run (no DB write)
//   npm run emf:schedule -- --live       # persist to Supabase
//   npm run emf:schedule -- --start=2026-07-13 --days=7

import "dotenv/config";
import { jobEmf } from "../src/lib/emf/job";

async function main() {
  const live = process.argv.includes("--live");
  const startDate = process.argv.find((a) => a.startsWith("--start="))?.split("=")[1];
  const days = process.argv.find((a) => a.startsWith("--days="))?.split("=")[1];

  console.log(`\n[EMF Scheduler] mode=${live ? "LIVE" : "DRY-RUN"}`);
  const result = await jobEmf({
    startDate,
    days: days ? Number(days) : undefined,
  });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error("[EMF Scheduler] FATAL:", err);
  process.exit(1);
});
