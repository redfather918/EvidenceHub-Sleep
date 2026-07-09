#!/usr/bin/env tsx
/**
 * EMF media_plan cleanup (DESTRUCTIVE when --apply).
 *
 * Deletes all media_plan rows for a given week_key (default 2026-W29) and lets
 * the FK ON DELETE CASCADE remove linked media_asset / media_render_job rows.
 *
 * Safety:
 *   - Always writes a JSON backup of the rows about to be deleted to
 *     output/_db_backup_<week>.json (restore path if something is wrong).
 *   - Dry-run by default; pass --apply to actually delete.
 *
 * Usage:
 *   npx tsx scripts/emf-db-cleanup.ts                 # dry-run report
 *   npx tsx scripts/emf-db-cleanup.ts --apply         # delete W29
 *   npx tsx scripts/emf-db-cleanup.ts --week 2026-W29 --apply
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "node:fs";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!URL || !KEY) {
  console.error("Missing Supabase env (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  process.exit(1);
}
const sb = createClient(URL, KEY);

const APPLY = process.argv.includes("--apply");
const wIdx = process.argv.indexOf("--week");
const WEEK = wIdx >= 0 ? process.argv[wIdx + 1] : "2026-W29";

async function main() {
  console.log(`=== EMF media_plan cleanup ===`);
  console.log(`Target week_key: ${WEEK}`);
  console.log(`Mode: ${APPLY ? "APPLY (deleting)" : "DRY-RUN (no changes)"}\n`);

  // fetch target rows
  const { data: rows, error } = await sb.from("media_plan").select("*").eq("week_key", WEEK);
  if (error) { console.error("select failed:", error.message); process.exit(1); }
  const ids = (rows ?? []).map((r) => r.id);
  console.log(`media_plan rows to remove: ${ids.length}`);

  // linked children
  const [a, rj] = await Promise.all([
    sb.from("media_asset").select("id", { count: "exact", head: true }).in("media_plan_id", ids),
    sb.from("media_render_job").select("id", { count: "exact", head: true }).in("media_plan_id", ids),
  ]);
  console.log(`  → will cascade-delete media_asset: ${a.count}`);
  console.log(`  → will cascade-delete media_render_job: ${rj.count}`);

  if (!APPLY) {
    // backup + report only
    mkdirSync("output", { recursive: true });
    const backupPath = `output/_db_backup_${WEEK}.json`;
    writeFileSync(backupPath, JSON.stringify(rows ?? [], null, 2));
    console.log(`\n[DRY-RUN] Backup written to ${backupPath}`);
    console.log("[DRY-RUN] Re-run with --apply to delete.");
    return;
  }

  // APPLY: backup first, then delete
  mkdirSync("output", { recursive: true });
  const backupPath = `output/_db_backup_${WEEK}.json`;
  writeFileSync(backupPath, JSON.stringify(rows ?? [], null, 2));
  console.log(`Backup written to ${backupPath}`);

  const { error: delErr, count } = await sb
    .from("media_plan")
    .delete({ count: "exact" })
    .eq("week_key", WEEK);

  if (delErr) {
    console.error("DELETE failed:", delErr.message);
    process.exit(1);
  }
  console.log(`\nDeleted media_plan rows: ${count}`);

  // verify remaining
  const { data: remaining, error: rerr } = await sb.from("media_plan").select("week_key").order("week_key");
  if (rerr) { console.error("verify select failed:", rerr.message); }
  else {
    const byWeek = new Map<string, number>();
    for (const r of remaining ?? []) byWeek.set(r.week_key, (byWeek.get(r.week_key) ?? 0) + 1);
    console.log("Remaining media_plan rows:", JSON.stringify([...byWeek.entries()]));
  }
  const ca = await sb.from("media_asset").select("id", { count: "exact", head: true });
  const cr = await sb.from("media_render_job").select("id", { count: "exact", head: true });
  console.log(`Remaining media_asset: ${ca.count}, media_render_job: ${cr.count}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
