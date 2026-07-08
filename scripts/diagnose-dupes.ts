#!/usr/bin/env tsx
/**
 * EvidenceHub Sleep — Near-Duplicate Diagnostic
 *
 * Reads RAW claims from Supabase (no dedup) and finds near-duplicate groups
 * using the SAME similarity function as the pipeline (calculateSimilarity:
 * text Jaccard 40% + keyword overlap 30% + topic match 30%, threshold 0.85).
 *
 * This is READ-ONLY — it never modifies data. Use it to decide a safe
 * cleanup threshold before running cleanup-duplicates.ts --apply.
 *
 * Usage:
 *   npx tsx scripts/diagnose-dupes.ts            # default threshold 0.85
 *   npx tsx scripts/diagnose-dupes.ts --t 0.75   # custom threshold
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

// ── parse threshold ───────────────────────────────────────────
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

async function main() {
  console.log(`=== EvidenceHub Near-Duplicate Diagnostic ===`);
  console.log(`Similarity threshold: ${THRESHOLD} (pipeline default 0.85)\n`);

  const { data: claims, error } = await supabase.from("claims").select("*");
  if (error || !claims) {
    console.error("Failed to fetch claims:", error?.message);
    process.exit(1);
  }
  console.log(`Total RAW claims in DB: ${claims.length}\n`);

  const n = claims.length;
  const uf = new UF(n);

  // distribution counters
  let cnt70 = 0,
    cnt80 = 0,
    cnt85 = 0,
    maxSim = 0;
  let bestPair: [number, number] = [0, 0];

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const sim = calculateSimilarity(asExtracted(claims[i]), claims[j]);
      if (sim >= 0.7) cnt70++;
      if (sim >= 0.8) cnt80++;
      if (sim >= 0.85) cnt85++;
      if (sim > maxSim) {
        maxSim = sim;
        bestPair = [i, j];
      }
      if (sim >= THRESHOLD) uf.union(i, j);
    }
  }

  console.log(`Pairwise similarity distribution (of ${Math.round((n * (n - 1)) / 2)} pairs):`);
  console.log(`  pairs >= 0.70 : ${cnt70}`);
  console.log(`  pairs >= 0.80 : ${cnt80}`);
  console.log(`  pairs >= 0.85 : ${cnt85}`);
  console.log(
    `  highest similarity observed: ${maxSim.toFixed(3)} between:` +
      `\n    A: "${claims[bestPair[0]].text?.slice(0, 90)}"` +
      `\n    B: "${claims[bestPair[1]].text?.slice(0, 90)}"\n`
  );

  // ── collect groups ─────────────────────────────────────────
  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const r = uf.find(i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r)!.push(i);
  }

  const dupGroups = [...groups.values()].filter((g) => g.length > 1);
  console.log(`Near-duplicate groups at threshold ${THRESHOLD}: ${dupGroups.length}`);
  let totalDup = 0;

  for (const g of dupGroups) {
    totalDup += g.length - 1;
    // keeper = highest evidence_score
    g.sort((a, b) => (claims[b].evidence_score || 0) - (claims[a].evidence_score || 0));
    console.log(`\n--- Group (${g.length} rows) ---`);
    console.log(`  KEEP: score=${claims[g[0]].evidence_score}  slug="${claims[g[0]].slug}"`);
    console.log(`        "${claims[g[0]].text?.slice(0, 100)}"`);
    for (const idx of g.slice(1)) {
      const sim = calculateSimilarity(asExtracted(claims[g[0]]), claims[idx]);
      console.log(`  DEL : score=${claims[idx].evidence_score}  slug="${claims[idx].slug}"  sim=${sim.toFixed(2)}`);
      console.log(`        "${claims[idx].text?.slice(0, 100)}"`);
    }
  }

  console.log(`\nTotal rows that would be removed at threshold ${THRESHOLD}: ${totalDup}`);
}

main().catch(console.error);
