#!/usr/bin/env tsx
// EvidenceHub Media Factory (EMF) — Apply migration 00003
// Runs the EMF schema migration against the configured Supabase project using
// the SQL endpoint (service-role key required). Idempotent (IF NOT EXISTS).
//
// Usage:  npm run emf:migrate

import "dotenv/config";
import { readFileSync } from "node:fs";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

async function main() {
  if (!url || !key) {
    console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Set them in .env to apply the migration.");
    process.exit(1);
  }
  const sql = readFileSync("supabase/migrations/00003_emf_media_plan.sql", "utf8");

  console.log(`[EMF migrate] applying 00003 to ${url} ...`);
  const resp = await fetch(`${url}/rest/v1/sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  const text = await resp.text();
  if (!resp.ok) {
    console.error(`[EMF migrate] FAILED (HTTP ${resp.status}): ${text}`);
    console.error("Apply manually in the Supabase SQL editor:");
    console.error("  supabase/migrations/00003_emf_media_plan.sql");
    process.exit(1);
  }
  console.log("[EMF migrate] OK. Tables created:", text || "(empty response)");
}

main().catch((err) => {
  console.error("[EMF migrate] FATAL:", err);
  process.exit(1);
});
