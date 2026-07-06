// EvidenceHub Sleep — Database Adapter Layer
// Abstracts data access: uses Supabase when configured, falls back to seed-data.ts.
// This allows the app to work in both production (Supabase) and dev (static) modes.

import { getSupabase, isSupabaseConfigured } from "./supabase";
import type {
  Claim,
  ClaimWithRelations,
  Study,
  Topic,
  DoseMapping,
  PopulationFit,
} from "./types";
import {
  claims as claimsData,
  studies as studiesData,
  topics as topicsData,
  claimStudies,
  doseMappings,
  populationFits,
} from "@/data/seed-data";

// ============================================================
// Mode detection
// ============================================================

export function isDbMode(): boolean {
  return isSupabaseConfigured;
}

// ============================================================
// Claim queries
// ============================================================

export async function getAllClaimsDb(): Promise<Claim[]> {
  if (!isDbMode()) return claimsData;

  const supabase = getSupabase()!;
  const { data, error } = await supabase
    .from("claims")
    .select("*")
    .order("evidence_score", { ascending: false });

  if (error || !data) {
    console.error("[DB] Failed to fetch claims:", error);
    return claimsData;
  }

  return data.map(rowToClaim);
}

export async function getClaimBySlugDb(slug: string): Promise<Claim | undefined> {
  if (!isDbMode()) return claimsData.find((c) => c.slug === slug);

  const supabase = getSupabase()!;
  const { data, error } = await supabase
    .from("claims")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) return undefined;
  return rowToClaim(data);
}

export async function getTrendingClaimsDb(limit = 6): Promise<Claim[]> {
  if (!isDbMode()) {
    return [...claimsData].sort((a, b) => b.evidenceScore - a.evidenceScore).slice(0, limit);
  }

  const supabase = getSupabase()!;
  const { data, error } = await supabase
    .from("claims")
    .select("*")
    .order("evidence_score", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map(rowToClaim);
}

export async function getLatestClaimsDb(limit = 6): Promise<Claim[]> {
  if (!isDbMode()) {
    return [...claimsData]
      .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
      .slice(0, limit);
  }

  const supabase = getSupabase()!;
  const { data, error } = await supabase
    .from("claims")
    .select("*")
    .order("last_updated", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map(rowToClaim);
}

export async function getClaimsByTopicDb(topicSlug: string): Promise<Claim[]> {
  if (!isDbMode()) {
    return claimsData.filter((c) => c.topicSlug === topicSlug);
  }

  const supabase = getSupabase()!;
  const { data: topicData } = await supabase
    .from("topics")
    .select("id")
    .eq("slug", topicSlug)
    .single();

  if (!topicData) return [];

  const { data, error } = await supabase
    .from("claims")
    .select("*")
    .eq("topic_id", topicData.id)
    .order("evidence_score", { ascending: false });

  if (error || !data) return [];
  return data.map(rowToClaim);
}

export async function getClaimWithRelationsDb(slug: string): Promise<ClaimWithRelations | undefined> {
  const claim = await getClaimBySlugDb(slug);
  if (!claim) return undefined;

  if (!isDbMode()) {
    const studyIds = claimStudies[slug] || [];
    const relatedStudies = studyIds
      .map((id) => studiesData[id])
      .filter((s): s is Study => s !== undefined);
    const relatedSlugs = claim.relatedSlugs;
    const relatedClaims = relatedSlugs
      .map((s) => claimsData.find((c) => c.slug === s))
      .filter((c): c is Claim => c !== undefined);
    const topic = topicsData.find((t) => t.slug === claim.topicSlug);

    return {
      ...claim,
      studies: relatedStudies,
      doseMappings: doseMappings[slug] || [],
      populationFits: populationFits[slug] || [],
      relatedClaims,
      topic,
    };
  }

  const supabase = getSupabase()!;

  const { data: topicData } = await supabase
    .from("topics")
    .select("*")
    .eq("slug", claim.topicSlug)
    .single();

  const { data: studyMaps } = await supabase
    .from("claim_study_map")
    .select("study_id, strength, effect_direction")
    .eq("claim_id", claim.id);

  let relatedStudies: Study[] = [];
  if (studyMaps && studyMaps.length > 0) {
    const studyIds = studyMaps.map((sm) => sm.study_id);
    const { data: studiesData } = await supabase
      .from("studies")
      .select("*")
      .in("id", studyIds);
    relatedStudies = (studiesData || []).map(rowToStudy);
  }

  const { data: doseData } = await supabase
    .from("dose_mappings")
    .select("*")
    .eq("claim_id", claim.id);

  const { data: popFitData } = await supabase
    .from("population_fits")
    .select("*")
    .eq("claim_id", claim.id);

  const relatedClaims = await Promise.all(
    claim.relatedSlugs.map(async (s) => getClaimBySlugDb(s))
  ).then((results) => results.filter((c): c is Claim => c !== undefined));

  return {
    ...claim,
    studies: relatedStudies,
    doseMappings: (doseData || []).map(rowToDoseMapping),
    populationFits: (popFitData || []).map(rowToPopulationFit),
    relatedClaims,
    topic: topicData ? rowToTopic(topicData) : undefined,
  };
}

// ============================================================
// Study queries
// ============================================================

export async function getStudiesByClaimDb(slug: string): Promise<Study[]> {
  if (!isDbMode()) {
    const studyIds = claimStudies[slug] || [];
    return studyIds
      .map((id) => studiesData[id])
      .filter((s): s is Study => s !== undefined);
  }

  const supabase = getSupabase()!;
  const { data: claimData } = await supabase
    .from("claims")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!claimData) return [];

  const { data: studyMaps } = await supabase
    .from("claim_study_map")
    .select("study_id")
    .eq("claim_id", claimData.id);

  if (!studyMaps || studyMaps.length === 0) return [];

  const studyIds = studyMaps.map((sm) => sm.study_id);
  const { data, error } = await supabase
    .from("studies")
    .select("*")
    .in("id", studyIds);

  if (error || !data) return [];
  return data.map(rowToStudy);
}

// ============================================================
// Topic queries
// ============================================================

export async function getAllTopicsDb(): Promise<Topic[]> {
  if (!isDbMode()) return topicsData;

  const supabase = getSupabase()!;
  const { data, error } = await supabase.from("topics").select("*").order("name");

  if (error || !data) return topicsData;
  return data.map(rowToTopic);
}

export async function getTopicBySlugDb(slug: string): Promise<Topic | undefined> {
  if (!isDbMode()) return topicsData.find((t) => t.slug === slug);

  const supabase = getSupabase()!;
  const { data, error } = await supabase
    .from("topics")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) return undefined;
  return rowToTopic(data);
}

// ============================================================
// Search
// ============================================================

export async function searchClaimsDb(query: string): Promise<Claim[]> {
  const lower = query.toLowerCase();
  if (!isDbMode()) {
    return claimsData.filter(
      (c) =>
        c.text.toLowerCase().includes(lower) ||
        c.summary.toLowerCase().includes(lower) ||
        c.keywords.some((k) => k.toLowerCase().includes(lower)) ||
        c.category.toLowerCase().includes(lower)
    );
  }

  const supabase = getSupabase()!;
  const { data, error } = await supabase
    .from("claims")
    .select("*")
    .or(`text.ilike.%${query}%,summary.ilike.%${query}%,keywords.cs.{${query}}`)
    .limit(20);

  if (error || !data) return [];
  return data.map(rowToClaim);
}

// ============================================================
// Write operations (pipeline → database)
// ============================================================

export async function upsertStudyDb(study: Partial<Study> & { pmid?: string }): Promise<string | null> {
  if (!isDbMode()) {
    throw new Error("upsertStudyDb called but Supabase is not configured (isDbMode=false)");
  }

  const supabase = getSupabase()!;
  const { data, error } = await supabase
    .from("studies")
    .upsert(
      {
        pmid: study.pmid,
        doi: study.doi,
        title: study.title,
        abstract: study.abstract,
        journal: study.journal || "",
        authors: study.authors || "",
        year: study.year,
        sample_size: study.sampleSize || 0,
        duration: study.duration,
        intervention: study.intervention,
        outcome: study.outcome,
        effect_size: study.effectSize,
        result: study.result || "",
        study_type: study.studyType || "observational",
        population: study.population,
        url: study.url,
        strength: study.strength || 3,
      },
      { onConflict: "pmid" }
    )
    .select("id")
    .single();

  if (error) {
    // Throw so the caller can capture the real reason (e.g. "relation does not exist",
    // "permission denied", "duplicate key", etc.) in errors[].
    throw new Error(`studies upsert failed for PMID ${study.pmid}: ${error.message} (code=${error.code})`);
  }
  return data?.id || null;
}

export async function upsertClaimDb(claim: Partial<Claim>): Promise<string | null> {
  if (!isDbMode()) return null;

  const supabase = getSupabase()!;
  const { data: topicData } = await supabase
    .from("topics")
    .select("id")
    .eq("slug", claim.topicSlug)
    .single();

  const { data, error } = await supabase
    .from("claims")
    .upsert(
      {
        slug: claim.slug,
        text: claim.text,
        summary: claim.summary,
        category: claim.category || "General",
        topic_id: topicData?.id || null,
        evidence_score: claim.evidenceScore || 0,
        confidence: claim.confidence || "moderate",
        rct_count: claim.rctCount || 0,
        meta_count: claim.metaCount || 0,
        study_count: claim.studyCount || 0,
        dose: claim.dose,
        population: claim.population || [],
        limitations: claim.limitations || [],
        mechanism: claim.mechanism || [],
        keywords: claim.keywords || [],
        contradictions: [],
        related_slugs: claim.relatedSlugs || [],
        last_updated: new Date().toISOString(),
      },
      { onConflict: "slug" }
    )
    .select("id")
    .single();

  if (error) {
    console.error("[DB] Failed to upsert claim:", error);
    return null;
  }
  return data?.id || null;
}

export async function linkStudyToClaimDb(
  claimId: string,
  studyId: string,
  strength: "strong" | "moderate" | "weak" = "moderate",
  direction: "positive" | "negative" | "neutral" = "positive"
): Promise<boolean> {
  if (!isDbMode()) return false;

  const supabase = getSupabase()!;
  const { error } = await supabase.from("claim_study_map").upsert(
    {
      claim_id: claimId,
      study_id: studyId,
      strength,
      effect_direction: direction,
    },
    { onConflict: "claim_id,study_id" }
  );

  if (error) {
    console.error("[DB] Failed to link study to claim:", error);
    return false;
  }
  return true;
}

// ============================================================
// Statistics
// ============================================================

export async function getHomeStats(): Promise<{
  claims: number;
  studies: number;
  topics: number;
  humanRcts: number;
}> {
  // Per PRD MVP Status: these four counters reflect the whole system's size.
  // - claims/studies/topics: real COUNT from Supabase (or seed-data fallback in static mode)
  // - humanRcts: subset of studies where study_type = 'rct'
  if (!isDbMode()) {
    return {
      claims: claimsData.length,
      studies: Object.keys(studiesData).length,
      topics: topicsData.length,
      humanRcts: Object.values(studiesData).filter((s) => s.studyType === "rct").length,
    };
  }

  const supabase = getSupabase()!;
  // count:'exact' returns the real total; head:true skips row data for efficiency.
  const [claimsRes, studiesRes, topicsRes, rctsRes] = await Promise.all([
    supabase.from("claims").select("id", { count: "exact", head: true }),
    supabase.from("studies").select("id", { count: "exact", head: true }),
    supabase.from("topics").select("id", { count: "exact", head: true }),
    supabase.from("studies").select("id", { count: "exact", head: true }).eq("study_type", "rct"),
  ]);

  return {
    claims: claimsRes.count ?? 0,
    studies: studiesRes.count ?? 0,
    topics: topicsRes.count ?? 0,
    humanRcts: rctsRes.count ?? 0,
  };
}

export async function logPipelineRunDb(run: {
  status: "running" | "success" | "failed" | "partial";
  papersFetched: number;
  claimsExtracted: number;
  claimsNew: number;
  claimsUpdated: number;
  claimsSkipped: number;
  errorsCount: number;
  log?: string;
  errorMessage?: string;
  dryRun: boolean;
  aiProvider?: string;
  startedAt: string;
  finishedAt?: string;
}): Promise<void> {
  if (!isDbMode()) return;

  const supabase = getSupabase()!;
  const { error } = await supabase.from("pipeline_runs").insert({
    status: run.status,
    papers_fetched: run.papersFetched,
    claims_extracted: run.claimsExtracted,
    claims_new: run.claimsNew,
    claims_updated: run.claimsUpdated,
    claims_skipped: run.claimsSkipped,
    errors_count: run.errorsCount,
    log: run.log,
    error_message: run.errorMessage,
    dry_run: run.dryRun,
    ai_provider: run.aiProvider,
    started_at: run.startedAt,
    finished_at: run.finishedAt,
  });

  if (error) {
    console.error("[DB] Failed to log pipeline run:", error);
  }
}

// ============================================================
// Row mappers (Supabase row → domain type)
// ============================================================

function rowToClaim(row: Record<string, unknown>): Claim {
  return {
    id: String(row.id),
    slug: String(row.slug),
    text: String(row.text),
    summary: String(row.summary),
    category: String(row.category || "General"),
    topicSlug: "", // Resolved via topic_id join; fallback to empty
    evidenceScore: Number(row.evidence_score || 0),
    humanRctScore: 0,
    metaScore: 0,
    mechanismScore: 0,
    safetyScore: 0,
    confidence: (row.confidence as Claim["confidence"]) || "moderate",
    rctCount: Number(row.rct_count || 0),
    metaCount: Number(row.meta_count || 0),
    studyCount: Number(row.study_count || 0),
    dose: String(row.dose || ""),
    population: (row.population as string[]) || [],
    limitations: (row.limitations as string[]) || [],
    mechanism: (row.mechanism as string[]) || [],
    faq: [],
    relatedSlugs: (row.related_slugs as string[]) || [],
    keywords: (row.keywords as string[]) || [],
    lastUpdated: row.last_updated ? new Date(row.last_updated as string).toISOString() : new Date().toISOString(),
    createdAt: row.created_at ? new Date(row.created_at as string).toISOString() : new Date().toISOString(),
  };
}

function rowToStudy(row: Record<string, unknown>): Study {
  return {
    id: String(row.id),
    pmid: row.pmid ? String(row.pmid) : undefined,
    doi: row.doi ? String(row.doi) : undefined,
    title: String(row.title),
    journal: String(row.journal || ""),
    authors: String(row.authors || ""),
    year: row.year ? Number(row.year) : undefined,
    sampleSize: Number(row.sample_size || 0),
    duration: row.duration ? String(row.duration) : undefined,
    intervention: row.intervention ? String(row.intervention) : undefined,
    outcome: row.outcome ? String(row.outcome) : undefined,
    effectSize: row.effect_size ? String(row.effect_size) : undefined,
    result: String(row.result || ""),
    studyType: (row.study_type as Study["studyType"]) || "observational",
    population: row.population ? String(row.population) : undefined,
    url: row.url ? String(row.url) : undefined,
    strength: Number(row.strength || 3),
  };
}

function rowToTopic(row: Record<string, unknown>): Topic {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    description: String(row.description || ""),
    icon: row.icon ? String(row.icon) : undefined,
    claimCount: Number(row.claim_count || 0),
  };
}

function rowToDoseMapping(row: Record<string, unknown>): DoseMapping {
  return {
    compound: String(row.compound || ""),
    doseRange: String(row.dose_range || ""),
    effect: String(row.effect || ""),
    optimal: Boolean(row.optimal),
  };
}

function rowToPopulationFit(row: Record<string, unknown>): PopulationFit {
  return {
    group: String(row.group || ""),
    fit: (row.fit as PopulationFit["fit"]) || "check",
    note: row.note ? String(row.note) : undefined,
  };
}
