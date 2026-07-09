#!/usr/bin/env tsx
/**
 * EMF media_plan inspector (READ-ONLY).
 * Connects to Supabase and reports the current state of the EMF tables so we
 * can decide what test data to clean up. No writes/deletes happen here.
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!URL || !KEY) {
  console.error("Missing Supabase env (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  process.exit(1);
}
const sb = createClient(URL, KEY);

function table(label: string, rows: Record<string, any>[]) {
  console.log(`\n=== ${label} (${rows.length}) ===`);
  return rows;
}

async function main() {
  // ── media_plan ──────────────────────────────────────────────
  const { data: plan, error } = await sb.from("media_plan").select("*").order("created_at", { ascending: true });
  if (error) { console.error("media_plan select failed:", error.message); process.exit(1); }
  table("media_plan", plan ?? []);

  const p = plan ?? [];
  console.log(`\nTOTAL media_plan rows: ${p.length}`);

  // breakdown by tag-style fields
  const tally = (field: string) => {
    const m = new Map<string, number>();
    for (const r of p) m.set(String(r[field] ?? "∅null"), (m.get(String(r[field] ?? "∅null")) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  for (const f of ["week_key", "status", "category", "pillar", "kind", "dimension", "template", "template_code"]) {
    console.log(`\n-- ${f} --`);
    for (const [k, v] of tally(f)) console.log(`   ${k}: ${v}`);
  }

  // suspicious / empty tags
  const suspicious = p.filter((r) =>
    !r.week_key || !r.category || !r.pillar || !r.item || !r.template || !r.template_code || r.status === "∅null"
  );
  console.log(`\n-- rows with MISSING/empty tag fields (week/category/pillar/item/template/code/status): ${suspicious.length} --`);
  for (const r of suspicious) console.log(`   ${r.id}  cat=${r.category} pillar=${r.pillar} item=${r.item} tmpl=${r.template}/${r.template_code} status=${r.status}`);

  // duplicate file_name (should be unique = id)
  const byFile = new Map<string, number>();
  for (const r of p) byFile.set(r.file_name, (byFile.get(r.file_name) ?? 0) + 1);
  const dupFiles = [...byFile.entries()].filter(([, c]) => c > 1);
  console.log(`\n-- duplicate file_name values: ${dupFiles.length} --`);
  for (const [f, c] of dupFiles) console.log(`   ${f}: ${c} rows`);

  // duplicate (week,day,item) combos
  const combo = new Map<string, number>();
  for (const r of p) combo.set(`${r.week_key}|${r.day_key}|${r.item}`, (combo.get(`${r.week_key}|${r.day_key}|${r.item}`) ?? 0) + 1);
  const dupCombos = [...combo.entries()].filter(([, c]) => c > 1);
  console.log(`\n-- duplicate week|day|item combos: ${dupCombos.length} --`);
  for (const [k, c] of dupCombos) console.log(`   ${k}: ${c}`);

  // ALL rows detail (grouped by week)
  console.log(`\n-- ALL ${p.length} ROWS (week|day | cat/pillar/item | tmpl | status | claim) --`);
  for (const r of p) {
    console.log(`   [${r.week_key} ${r.day_key}] ${r.category}/${r.pillar}/${r.item} | ${r.template}${r.template_code} | ${r.status} | claim=${r.claim_slug ?? "∅"}`);
  }

  // ── related child rows (would be orphaned on delete) ────────
  const counts = await Promise.all([
    sb.from("media_asset").select("id", { count: "exact", head: true }),
    sb.from("media_render_job").select("id", { count: "exact", head: true }),
    sb.from("review_queue").select("id", { count: "exact", head: true }),
    sb.from("publish_queue").select("id", { count: "exact", head: true }),
  ]);
  console.log(`\n=== child table totals ===`);
  console.log(`   media_asset:      ${counts[0].count}`);
  console.log(`   media_render_job: ${counts[1].count}`);
  console.log(`   review_queue:     ${counts[2].count}`);
  console.log(`   publish_queue:    ${counts[3].count}`);

  // child rows linked to these media_plan ids
  const ids = p.map((r) => r.id);
  const childWhere = (tbl: string) => sb.from(tbl).select("id", { count: "exact", head: true }).in("media_plan_id", ids);
  const c2 = await Promise.all([childWhere("media_asset"), childWhere("media_render_job"), childWhere("review_queue"), childWhere("publish_queue")]);
  console.log(`\n=== child rows LINKED to current media_plan ids ===`);
  console.log(`   media_asset:      ${c2[0].count}`);
  console.log(`   media_render_job: ${c2[1].count}`);
  console.log(`   review_queue:     ${c2[2].count}`);
  console.log(`   publish_queue:    ${c2[3].count}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
