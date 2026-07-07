#!/usr/bin/env tsx
/**
 * EvidenceHub Sleep — Database Dedup Cleanup Script
 *
 * Finds and removes duplicate claims from Supabase where different rows
 * have similar text but different slugs (created by ai-parse pipeline).
 *
 * Strategy per group of duplicates:
 *   1. Keep the row with highest evidence_score
 *   2. Migrate claim_study_map links from duplicates to the kept row
 *   3. Delete the duplicate rows
 *
 * Usage:
 *   npx tsx scripts/cleanup-duplicates.ts        # dry-run (report only)
 *   npx tsx scripts/cleanup-duplicates.ts --apply # actually delete
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// ── Config ───────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE key in .env");
  process.exit(1);
}

const DRY_RUN = !process.argv.includes("--apply");
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Normalisation ───────────────────────────────────────────────
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log(`=== EvidenceHub Duplicate Claim Cleanup ===`);
  console.log(`Mode: ${DRY_RUN ? "DRY-RUN (no changes)" : "APPLY (will delete)"}\n`);

  // 1. Fetch ALL claims
  const { data: claims, error: fetchErr } = await supabase
    .from("claims")
    .select("*");

  if (fetchErr || !claims) {
    console.error("Failed to fetch claims:", fetchErr?.message);
    process.exit(1);
  }

  console.log(`Total claims in DB: ${claims.length}`);

  // 2. Group by normalised text
  const groups = new Map<string, typeof claims>();
  for (const c of claims) {
    const norm = normalizeText(c.text || "");
    if (!norm) continue;
    if (!groups.has(norm)) groups.set(norm, []);
    groups.get(norm)!.push(c);
  }

  // 3. Find groups with >1 member = duplicates
  const dupGroups: { norm: string; members: typeof claims; keepId: string }[] = [];
  for (const [norm, members] of groups) {
    if (members.length <= 1) continue;
    // Sort by evidence_score desc — first is the keeper
    members.sort((a, b) => (b.evidence_score || 0) - (a.evidence_score || 0));
    dupGroups.push({ norm, members, keepId: members[0].id });
  }

  if (dupGroups.length === 0) {
    console.log("\nNo duplicates found. DB is clean.");
    return;
  }

  console.log(`\nFound ${dupGroups.length} groups of duplicate claims:\n`);
  let totalDuplicates = 0;

  for (const g of dupGroups) {
    const dupIds = g.members.slice(1).map((c) => c.id);
    totalDuplicates += dupIds.length;
    console.log(`--- Group: "${g.norm.slice(0, 80)}" (${g.members.length} rows) ---`);
    console.log(`  KEEP: id=${g.keepId}  score=${g.members[0].evidence_score}  slug="${g.members[0].slug}"`);
    for (const m of g.members.slice(1)) {
      console.log(`  DEL : id=${m.id}  score=${m.evidence_score}  slug="${m.slug}"`);
    }
  }

  console.log(`\nTotal duplicate rows to remove: ${totalDuplicates}`);

  if (DRY_RUN) {
    console.log("\n[Dry-run mode] No changes made. Re-run with --apply to delete.");
    return;
  }

  // ── APPLY MODE ───────────────────────────────────────────────
  console.log("\n=== Applying changes ===\n");
  let migratedLinks = 0;
  let deletedRows = 0;

  for (const g of dupGroups) {
    const dupIds = g.members.slice(1).map((c) => c.id);

    // 4a. Migrate claim_study_map links from duplicates → keeper
    for (const dupId of dupIds) {
      const { data: links } = await supabase
        .from("claim_study_map")
        .select("*")
        .eq("claim_id", dupId);

      if (links && links.length > 0) {
        for (const link of links) {
          // Check if this study is already linked to the keeper
          const { data: existing } = await supabase
            .from("claim_study_map")
            .select("*")
            .eq("claim_id", g.keepId)
            .eq("study_id", link.study_id);

          if (!existing || existing.length === 0) {
            const { error: upsertErr } = await supabase
              .from("claim_study_map")
              .upsert(
                {
                  claim_id: g.keepId,
                  study_id: link.study_id,
                  strength: link.strength ?? "moderate",
                  effect_direction: link.effect_direction ?? "positive",
                },
                { onConflict: "claim_id,study_id" }
              );
            if (!upsertErr) migratedLinks++;
            else console.error(`  Link migration failed: ${upsertErr.message}`);
          }
        }
      }
    }

    // 4b. Delete duplicate claim rows
    const { error: delErr } = await supabase
      .from("claims")
      .delete()
      .in("id", dupIds);

    if (delErr) {
      console.error(`Failed to delete group ${g.norm.slice(0, 40)}: ${delErr.message}`);
    } else {
      deletedRows += dupIds.length;
      console.log(`Deleted ${dupIds.length} dups for group "${g.norm.slice(0, 60)}"`);
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Migrated links: ${migratedLinks}`);
  console.log(`Deleted rows:  ${deletedRows}`);
}

main().catch(console.error);
