#!/usr/bin/env tsx
/**
 * EvidenceHub Sleep — Database Near-Duplicate Cleanup Script
 *
 * Finds and removes NEAR-DUPLICATE claims from Supabase where the pipeline
 * created rows with similar (but not identical) text for the same study.
 *
 * Uses the SAME similarity function as the pipeline (calculateSimilarity:
 * text Jaccard 40% + keyword overlap 30% + topic match 30%, default
 * threshold 0.85 — matches pipelineConfig.dedup.similarityThreshold).
 *
 * Strategy per duplicate group:
 *   1. Keep the row with highest evidence_score (tie-break: longer text,
 *      then most-recent created_at)
 *   2. Migrate claim_study_map links from duplicates to the kept row
 *   3. Delete the duplicate rows
 *
 * Usage:
 *   npx tsx scripts/cleanup-duplicates.ts          # dry-run (report only)
 *   npx tsx scripts/cleanup-duplicates.ts --apply  # actually delete
 *   npx tsx scripts/cleanup-duplicates.ts --t 0.8  # custom threshold
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { calculateSimilarity } from "../src/pipeline/ai-extractor";
import type { ExtractedClaim } from "../src/pipeline/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE key in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DRY_RUN = !process.argv.includes("--apply");
const tIdx = process.argv.indexOf("--t");
const THRESHOLD = tIdx >= 0 ? parseFloat(process.argv[tIdx + 1]) : 0.85;

// ── union-find ────────────────────────────────────────────────
class UF {
  parent: number[];
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
  }
  find(x: number): number {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]];
      x = this.parent[x];
    }
    return x;
  }
  union(a: number, b: number) {
    this.parent[this.find(a)] = this.find(b);
  }
}

function asExtracted(c: any): ExtractedClaim {
  return { text: c.text || "", keywords: c.keywords || [] } as ExtractedClaim;
}

function pickKeeper(group: any[]): any {
  return [...group].sort((a, b) => {
    const s = (b.evidence_score || 0) - (a.evidence_score || 0);
    if (s !== 0) return s;
    const l = (b.text?.length || 0) - (a.text?.length || 0);
    if (l !== 0) return l;
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  })[0];
}

async function main() {
  console.log(`=== EvidenceHub Near-Duplicate Claim Cleanup ===`);
  console.log(`Mode: ${DRY_RUN ? "DRY-RUN (no changes)" : "APPLY (will delete)"}`);
  console.log(`Similarity threshold: ${THRESHOLD} (pipeline default 0.85)\n`);

  const { data: claims, error: fetchErr } = await supabase
    .from("claims")
    .select("*");

  if (fetchErr || !claims) {
    console.error("Failed to fetch claims:", fetchErr?.message);
    process.exit(1);
  }

  console.log(`Total RAW claims in DB: ${claims.length}`);

  // ── group near-duplicates ──────────────────────────────────
  const n = claims.length;
  const uf = new UF(n);
  let pairCount = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const sim = calculateSimilarity(asExtracted(claims[i]), claims[j]);
      if (sim >= THRESHOLD) {
        uf.union(i, j);
        pairCount++;
      }
    }
  }

  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const r = uf.find(i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r)!.push(i);
  }

  const dupGroups = [...groups.values()].filter((g) => g.length > 1);

  if (dupGroups.length === 0) {
    console.log("\nNo near-duplicate groups found. DB is clean.");
    return;
  }

  console.log(`\nFound ${dupGroups.length} near-duplicate groups (${pairCount} pairs):\n`);
  let totalDuplicates = 0;

  for (const g of dupGroups) {
    const members = g.map((idx) => claims[idx]);
    const keeper = pickKeeper(members);
    const dupIds = members.filter((m) => m.id !== keeper.id).map((m) => m.id);
    totalDuplicates += dupIds.length;
    console.log(`--- Group (${members.length} rows) ---`);
    console.log(`  KEEP: id=${keeper.id}  score=${keeper.evidence_score}  slug="${keeper.slug}"`);
    console.log(`        "${keeper.text?.slice(0, 100)}"`);
    for (const m of members) {
      if (m.id === keeper.id) continue;
      const sim = calculateSimilarity(asExtracted(keeper), m);
      console.log(`  DEL : id=${m.id}  score=${m.evidence_score}  slug="${m.slug}"  sim=${sim.toFixed(2)}`);
      console.log(`        "${m.text?.slice(0, 100)}"`);
    }
  }

  console.log(`\nTotal duplicate rows to remove: ${totalDuplicates}`);

  if (DRY_RUN) {
    console.log("\n[Dry-run mode] No changes made. Re-run with --apply to delete.");
    return;
  }

  // ── APPLY MODE ─────────────────────────────────────────────
  console.log("\n=== Applying changes ===\n");
  let migratedLinks = 0;
  let deletedRows = 0;

  for (const g of dupGroups) {
    const members = g.map((idx) => claims[idx]);
    const keeper = pickKeeper(members);
    const dupIds = members.filter((m) => m.id !== keeper.id).map((m) => m.id);

    // Migrate claim_study_map links from duplicates → keeper
    for (const dupId of dupIds) {
      const { data: links } = await supabase
        .from("claim_study_map")
        .select("*")
        .eq("claim_id", dupId);

      if (links && links.length > 0) {
        for (const link of links) {
          const { data: existing } = await supabase
            .from("claim_study_map")
            .select("*")
            .eq("claim_id", keeper.id)
            .eq("study_id", link.study_id);

          if (!existing || existing.length === 0) {
            const { error: upsertErr } = await supabase
              .from("claim_study_map")
              .upsert(
                {
                  claim_id: keeper.id,
                  study_id: link.study_id,
                  strength: (link as any).strength ?? "moderate",
                  effect_direction: (link as any).effect_direction ?? "positive",
                },
                { onConflict: "claim_id,study_id" }
              );
            if (!upsertErr) migratedLinks++;
            else console.error(`  Link migration failed: ${upsertErr.message}`);
          }
        }
      }
    }

    // Delete duplicate claim rows
    const { error: delErr } = await supabase
      .from("claims")
      .delete()
      .in("id", dupIds);

    if (delErr) {
      console.error(`Failed to delete a group: ${delErr.message}`);
    } else {
      deletedRows += dupIds.length;
      console.log(`Deleted ${dupIds.length} dups (kept "${keeper.slug}")`);
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Migrated links: ${migratedLinks}`);
  console.log(`Deleted rows:  ${deletedRows}`);
}

main().catch(console.error);
