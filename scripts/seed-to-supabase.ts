// EvidenceHub Sleep — Seed 数据迁移到 Supabase
// 将本地静态 seed-data.ts 导入 Supabase PostgreSQL
// 运行: npx tsx scripts/seed-to-supabase.ts

import "dotenv/config";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  claims,
  studies,
  topics,
  claimStudies,
  doseMappings,
  populationFits,
} from "@/data/seed-data";

async function migrate() {
  console.log("=== Seed Data Migration to Supabase ===\n");

  if (!isSupabaseConfigured) {
    console.error("❌ Supabase NOT configured. Aborting.");
    console.error("   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
  }

  const supabase = getSupabase()!;
  const now = new Date().toISOString();

  // 1. Topics
  console.log(`Migrating ${topics.length} topics...`);
  const topicIdMap = new Map<string, string>(); // slug -> uuid
  for (const topic of topics) {
    const { data, error } = await supabase.from("topics").upsert({
      slug: topic.slug,
      name: topic.name,
      description: topic.description,
      icon: topic.icon,
      claim_count: topic.claimCount,
      created_at: now,
    }, { onConflict: "slug" }).select("id").single();

    if (error) {
      console.error(`  Topic ${topic.slug}: ${error.message}`);
    } else if (data) {
      topicIdMap.set(topic.slug, data.id as string);
    }
  }
  console.log("✅ Topics done.\n");

  // 2. Studies
  const studyList = Object.values(studies);
  console.log(`Migrating ${studyList.length} studies...`);
  const studyIdMap = new Map<string, string>(); // seed id/pmid -> db uuid
  for (const study of studyList) {
    const { data, error } = await supabase.from("studies").upsert({
      pmid: study.pmid,
      doi: study.doi,
      title: study.title,
      abstract: study.abstract || null,
      journal: study.journal,
      authors: study.authors,
      year: study.year || null,
      sample_size: study.sampleSize || 0,
      duration: study.duration || null,
      intervention: study.intervention || null,
      outcome: study.outcome || null,
      effect_size: study.effectSize || null,
      result: study.result || "",
      study_type: study.studyType || "observational",
      population: study.population || null,
      url: study.url || null,
      strength: study.strength || 3,
      status: "processed",
      created_at: now,
    }, { onConflict: "pmid" }).select("id").single();

    if (error) {
      console.error(`  Study ${study.pmid}: ${error.message}`);
    } else if (data && study.pmid) {
      studyIdMap.set(study.pmid, data.id);
    }
    // Also map by internal id
    studyIdMap.set(study.id, data?.id || study.id);
  }
  console.log("✅ Studies done.\n");

  // 3. Claims
  console.log(`Migrating ${claims.length} claims...`);
  const claimIdMap = new Map<string, string>(); // slug -> id
  for (const claim of claims) {
    // Find topic_id
    const { data: topicData } = await supabase
      .from("topics")
      .select("id")
      .eq("slug", claim.topicSlug)
      .single();

    const { data, error } = await supabase.from("claims").upsert(
      {
        slug: claim.slug,
        text: claim.text,
        summary: claim.summary,
        category: claim.category || "General",
        topic_id: topicData?.id || null,
        evidence_score: claim.evidenceScore || 0,
        human_rct_score: claim.humanRctScore || 0,
        meta_score: claim.metaScore || 0,
        mechanism_score: claim.mechanismScore || 0,
        safety_score: claim.safetyScore || 0,
        confidence: claim.confidence || "moderate",
        rct_count: claim.rctCount || 0,
        meta_count: claim.metaCount || 0,
        study_count: claim.studyCount || 0,
        dose: claim.dose || null,
        population: claim.population || [],
        limitations: claim.limitations || [],
        mechanism: claim.mechanism || [],
        faq: claim.faq || [],
        related_slugs: claim.relatedSlugs || [],
        keywords: claim.keywords || [],
        contradictions: [],
        effect_size: {},
        last_updated: claim.lastUpdated || now,
        created_at: claim.createdAt || now,
      },
      { onConflict: "slug" }
    ).select("id").single();

    if (error) {
      console.error(`  Claim ${claim.slug}: ${error.message}`);
    } else if (data) {
      claimIdMap.set(claim.slug, data.id);
    }
  }
  console.log("✅ Claims done.\n");

  // 4. Claim-Study Map
  console.log("Migrating claim-study relationships...");
  for (const [claimSlug, studyIds] of Object.entries(claimStudies)) {
    const claimDbId = claimIdMap.get(claimSlug);
    if (!claimDbId) {
      console.warn(`  Claim ${claimSlug} not found in DB, skipping relations.`);
      continue;
    }

    for (const studyId of studyIds) {
      const studyDbId = studyIdMap.get(studyId);
      if (!studyDbId) {
        console.warn(`  Study ${studyId} not found in DB, skipping relation.`);
        continue;
      }

      const { error } = await supabase.from("claim_study_map").upsert({
        claim_id: claimDbId,
        study_id: studyDbId,
        strength: "moderate",
        effect_direction: "positive",
      }, { onConflict: "claim_id,study_id" });
      if (error) console.error(`  Map ${claimSlug}-${studyId}: ${error.message}`);
    }
  }
  console.log("✅ Claim-study map done.\n");

  // 5. Dose mappings
  console.log("Migrating dose mappings...");
  for (const [claimSlug, mappings] of Object.entries(doseMappings)) {
    const claimDbId = claimIdMap.get(claimSlug);
    if (!claimDbId) continue;

    for (const mapping of mappings) {
      const { error } = await supabase.from("dose_mappings").upsert({
        claim_id: claimDbId,
        compound: mapping.compound,
        dose_range: mapping.doseRange,
        effect: mapping.effect,
        optimal: mapping.optimal,
      }, { onConflict: "claim_id,compound,dose_range" });
      if (error) console.error(`  DoseMap ${claimSlug}: ${error.message}`);
    }
  }
  console.log("✅ Dose mappings done.\n");

  // 6. Population fits
  console.log("Migrating population fits...");
  for (const [claimSlug, fits] of Object.entries(populationFits)) {
    const claimDbId = claimIdMap.get(claimSlug);
    if (!claimDbId) continue;

    for (const fit of fits) {
      const { error } = await supabase.from("population_fits").upsert({
        claim_id: claimDbId,
        group_name: fit.group,
        fit: fit.fit,
        note: fit.note || null,
      }, { onConflict: "claim_id,group_name" });
      if (error) console.error(`  PopFit ${claimSlug}: ${error.message}`);
    }
  }
  console.log("✅ Population fits done.\n");

  console.log("=== Migration Complete ✅ ===");
  console.log("Run `npx tsx scripts/test-supabase.ts` to verify.");
}

migrate().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
