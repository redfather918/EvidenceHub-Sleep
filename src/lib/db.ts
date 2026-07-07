// EvidenceHub Sleep — Database Adapter Layer
// Abstracts data access: uses Supabase when configured, falls back to seed-data.ts.
// This allows the app to work in both production (Supabase) and dev (static) modes.

import { getSupabase, isSupabaseConfigured } from "./supabase";
import type {
  Claim,
  ClaimApiResponse,
  ClaimWithRelations,
  DoseMapping,
  EvidenceApiResponse,
  FAQItem,
  GraphEdge,
  GraphNode,
  GraphResponse,
  PopulationFit,
  Study,
  Topic,
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
    .select("*, topic:topic_id(slug)")
    .order("evidence_score", { ascending: false });

  if (error || !data) {
    console.error("[DB] Failed to fetch claims:", error);
    return claimsData;
  }

  return data.map((row) => {
    const claim = rowToClaim(row);
    const topic = (row.topic as { slug?: string } | undefined);
    claim.topicSlug = topic?.slug || "";
    return claim;
  });
}

export async function getClaimBySlugDb(slug: string): Promise<Claim | undefined> {
  if (!isDbMode()) return claimsData.find((c) => c.slug === slug);

  const supabase = getSupabase()!;
  const { data, error } = await supabase
    .from("claims")
    .select("*, topic:topic_id(slug)")
    .eq("slug", slug)
    .single();

  if (error || !data) return undefined;
  const claim = rowToClaim(data);
  const topic = (data.topic as { slug?: string } | undefined);
  claim.topicSlug = topic?.slug || "";
  return claim;
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

// Recently added, ranked by evidence — surfaces the "top" claims among the
// newest entries (Module: homepage "Fresh Evidence" section).
export async function getNewClaimsDb(limit = 6, recentPool = 20): Promise<Claim[]> {
  const claims = await getAllClaimsDb();

  // Most recently created first, then rank the freshest pool by evidence score
  // so the section shows the highest-quality *newly added* claims.
  const sortedByNew = [...claims].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const pool = sortedByNew.slice(0, recentPool);
  pool.sort((a, b) => b.evidenceScore - a.evidenceScore);
  return pool.slice(0, limit);
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
    .select("*, topic:topic_id(slug)")
    .eq("topic_id", topicData.id)
    .order("evidence_score", { ascending: false });

  if (error || !data) return [];
  return data.map((row) => {
    const claim = rowToClaim(row);
    const topic = (row.topic as { slug?: string } | undefined);
    claim.topicSlug = topic?.slug || "";
    return claim;
  });
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
// API response helpers
// ============================================================

export async function buildClaimApiResponseDb(slug: string): Promise<ClaimApiResponse | undefined> {
  const claim = await getClaimBySlugDb(slug);
  if (!claim) return undefined;

  return {
    slug: claim.slug,
    text: claim.text,
    confidence: claim.evidenceScore,
    confidenceLevel: claim.confidence,
    rcts: claim.rctCount,
    meta: claim.metaCount,
    dose: claim.dose,
    population: claim.population,
    evidenceScore: claim.evidenceScore,
    lastUpdated: claim.lastUpdated,
  };
}

export async function buildEvidenceApiResponseDb(topicSlug: string): Promise<EvidenceApiResponse | undefined> {
  const topic = await getTopicBySlugDb(topicSlug);
  if (!topic) return undefined;

  const topicClaims = await getClaimsByTopicDb(topicSlug);
  const totalStudies = topicClaims.reduce((sum, c) => sum + c.studyCount, 0);
  const avgScore =
    topicClaims.length > 0
      ? Math.round(topicClaims.reduce((sum, c) => sum + c.evidenceScore, 0) / topicClaims.length)
      : 0;
  const strength = avgScore >= 85 ? "strong" : avgScore >= 70 ? "moderate" : "limited";

  return {
    topic: topic.name,
    summary: topic.description,
    strength,
    studies: totalStudies,
    claims: topicClaims.map((c) => ({
      slug: c.slug,
      text: c.text,
      score: c.evidenceScore,
    })),
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

  // Compute real claim counts from claims table (the cached claim_count column
  // can become stale after bulk inserts / updates).
  const topics = data.map(rowToTopic);

  if (topics.length === 0) return topics;

  const { data: countData } = await supabase
    .from("claims")
    .select("topic_id")
    .not("topic_id", "is", null);

  if (countData) {
    const counts: Record<string, number> = {};
    for (const row of countData) {
      const tid = String(row.topic_id);
      counts[tid] = (counts[tid] || 0) + 1;
    }
    for (const t of topics) {
      t.claimCount = counts[t.id] || 0;
    }
  }

  return topics;
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

export async function getAllStudiesDb(): Promise<Study[]> {
  if (!isDbMode()) {
    return Object.values(studiesData);
  }

  const supabase = getSupabase()!;
  const { data, error } = await supabase.from("studies").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(`getAllStudiesDb failed: ${error.message}`);
  return (data || []).map(rowToStudy);
}

export async function getStudyByIdDb(id: string): Promise<Study | undefined> {
  if (!isDbMode()) {
    return studiesData[id];
  }

  const supabase = getSupabase()!;
  const { data, error } = await supabase.from("studies").select("*").eq("id", id).single();
  if (error || !data) return undefined;
  return rowToStudy(data);
}

export async function getStudyByPmidDb(pmid: string): Promise<Study | undefined> {
  if (!isDbMode()) {
    return Object.values(studiesData).find((s) => s.pmid === pmid);
  }

  const supabase = getSupabase()!;
  const { data, error } = await supabase.from("studies").select("*").eq("pmid", pmid).single();
  if (error || !data) return undefined;
  return rowToStudy(data);
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
  // Use ilike on text + summary only; avoid keywords.cs which breaks on non-array columns.
  // Also search topic_slug and category for broader coverage.
  const pattern = `%${query}%`;
  const { data, error } = await supabase
    .from("claims")
    .select("*")
    .or(`text.ilike.${pattern},summary.ilike.${pattern},category.ilike.${pattern}`)
    .order("evidence_score", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[DB] searchClaimsDb failed:", error.message);
    return [];
  }
  if (!data || data.length === 0) return [];

  // Client-side keyword match as fallback supplement
  const byText = data.map(rowToClaim);
  const matchedSlugs = new Set(byText.map((c) => c.slug));

  // If we already have results or the query is very short, return as-is
  if (byText.length >= 5 || query.length < 3) return byText;

  // For short result sets with longer queries, try fetching all and filtering by keyword
  const { data: allData } = await supabase
    .from("claims")
    .select("*, topic:topic_id(slug)")
    .order("evidence_score", { ascending: false })
    .limit(200);

  if (!allData) return byText;

  const extra = allData
    .filter((row) => {
      if (matchedSlugs.has(row.slug)) return false;
      const kw = row.keywords;
      if (Array.isArray(kw) && kw.some((k: string) => k.toLowerCase().includes(lower))) return true;
      if (typeof kw === "string" && kw.toLowerCase().includes(lower)) return true;
      const topic = (row.topic as { slug?: string } | undefined);
      if (topic?.slug?.toLowerCase().includes(lower)) return true;
      return false;
    })
    .slice(0, 50)
    .map(rowToClaim);

  return [...byText, ...extra];
}

// ============================================================
// Explorer (filtered / sorted / paginated claim listing)
// Shared by the homepage Explorer section and GET /api/explore.
// ============================================================

export type ExploreSort = "evidence" | "newest" | "updated" | "rct";
export type ExploreStudyType = "rct" | "meta" | "observational" | "animal";

export interface ExploreParams {
  topic?: string;
  category?: string;
  studyType?: ExploreStudyType;
  sort?: ExploreSort;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface ExploreResult {
  items: Claim[];
  total: number;
  page: number;
  pageSize: number;
}

export async function exploreClaimsDb(params: ExploreParams = {}): Promise<ExploreResult> {
  const all = await getAllClaimsDb();
  let items: Claim[] = [...all];

  if (params.topic) {
    items = items.filter((c) => c.topicSlug === params.topic);
  }
  if (params.category) {
    items = items.filter((c) => c.category === params.category);
  }
  if (params.studyType) {
    switch (params.studyType) {
      case "rct":
        items = items.filter((c) => c.rctCount > 0);
        break;
      case "meta":
        items = items.filter((c) => c.metaCount > 0);
        break;
      case "observational":
        items = items.filter((c) => c.studyCount > 0 && c.rctCount === 0);
        break;
      case "animal":
        items = items.filter((c) => c.studyCount === 0);
        break;
    }
  }
  if (params.q) {
    const q = params.q.toLowerCase();
    items = items.filter(
      (c) =>
        c.text.toLowerCase().includes(q) ||
        c.summary.toLowerCase().includes(q) ||
        c.keywords.some((k) => k.toLowerCase().includes(q)) ||
        c.category.toLowerCase().includes(q)
    );
  }

  const sort = params.sort || "evidence";
  items.sort((a, b) => {
    switch (sort) {
      case "evidence":
        return b.evidenceScore - a.evidenceScore;
      case "newest":
      case "updated":
        return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
      case "rct":
        return b.rctCount - a.rctCount;
      default:
        return b.evidenceScore - a.evidenceScore;
    }
  });

  const total = items.length;
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 12));
  const start = (page - 1) * pageSize;
  const paged = items.slice(start, start + pageSize);

  return { items: paged, total, page, pageSize };
}

// ============================================================
// Evidence Graph (Module 4)
// Derives nodes/edges from existing claims/studies/topics on the fly.
// No dedicated graph_edges table required for the MVP — relationships
// are reconstructed from claims.topicSlug, claims.relatedSlugs, and
// the claim_study_map join.
// ============================================================

// Map Supabase study row id → study object (DB mode only needs this for linking)
async function getClaimStudyPairs(): Promise<{ claimSlug: string; studyId: string }[]> {
  if (!isDbMode()) {
    const pairs: { claimSlug: string; studyId: string }[] = [];
    for (const [slug, ids] of Object.entries(claimStudies)) {
      for (const id of ids) pairs.push({ claimSlug: slug, studyId: id });
    }
    return pairs;
  }

  const supabase = getSupabase()!;
  const { data } = await supabase.from("claim_study_map").select("claim_id, study_id");
  if (!data || data.length === 0) return [];

  const claims = await getAllClaimsDb();
  const idToSlug = new Map(claims.map((c) => [c.id, c.slug]));
  return data
    .map((r) => ({ claimSlug: idToSlug.get(String(r.claim_id)) || "", studyId: String(r.study_id) }))
    .filter((p) => p.claimSlug);
}

export async function getGraphDb(entity: string, depth = 2): Promise<GraphResponse> {
  const [claims, topics, studies, pairs] = await Promise.all([
    getAllClaimsDb(),
    getAllTopicsDb(),
    getAllStudiesDb(),
    getClaimStudyPairs(),
  ]);

  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  // --- Topics ---
  for (const t of topics) {
    nodes.set(`topic:${t.slug}`, {
      id: `topic:${t.slug}`,
      type: "topic",
      label: t.name,
      url: `/topics/${t.slug}`,
      weight: t.claimCount || 1,
    });
  }

  // --- Claims + belongs_to + related_to edges ---
  for (const c of claims) {
    nodes.set(`claim:${c.slug}`, {
      id: `claim:${c.slug}`,
      type: "claim",
      label: c.text,
      url: `/claim/${c.slug}`,
      weight: c.evidenceScore,
      metadata: { score: c.evidenceScore, confidence: c.confidence, rcts: c.rctCount },
    });
    if (c.topicSlug) {
      edges.push({ from: `claim:${c.slug}`, to: `topic:${c.topicSlug}`, relation: "belongs_to", weight: 1 });
    }
    for (const rel of c.relatedSlugs) {
      if (nodes.has(`claim:${rel}`) || claims.some((x) => x.slug === rel)) {
        edges.push({ from: `claim:${c.slug}`, to: `claim:${rel}`, relation: "related_to", weight: 0.8 });
      }
    }
  }

  // --- Studies + studied_by edges ---
  const studyMap = new Map(studies.map((s) => [s.id, s]));
  for (const { claimSlug, studyId } of pairs) {
    const study = studyMap.get(studyId);
    if (!study) continue;
    const sid = `study:${study.pmid || study.id}`;
    if (!nodes.has(sid)) {
      nodes.set(sid, {
        id: sid,
        type: "study",
        label: study.title,
        url: study.pmid
          ? `https://pubmed.ncbi.nlm.nih.gov/${study.pmid}/`
          : study.url || "#",
        weight: study.strength || 1,
        metadata: { year: study.year, journal: study.journal, studyType: study.studyType },
      });
    }
    edges.push({ from: `claim:${claimSlug}`, to: sid, relation: "studied_by", weight: 1 });
  }

  // --- Resolve center node ---
  const centerId = resolveCenter(entity, nodes);
  if (!centerId) {
    return { center: undefined, nodes: [], edges: [], _links: { self: `/api/graph/${entity}` } };
  }

  // --- BFS from center up to `depth` hops ---
  const subgraph = bfsSubgraph(centerId, edges, depth, 250);
  const subNodes = subgraph.nodeIds.map((id) => nodes.get(id)!).filter(Boolean);

  return {
    center: centerId,
    nodes: subNodes,
    edges: subgraph.edges,
    _links: { self: `/api/graph/${entity}?depth=${depth}` },
  };
}

function resolveCenter(entity: string, nodes: Map<string, GraphNode>): string | undefined {
  const e = entity.trim().toLowerCase();
  if (!e) return undefined;

  // Exact id match
  if (nodes.has(e)) return e;

  // Prefix match: "claim:slug", "topic:slug", "study:pmid"
  const prefixed = `:${e}`;
  for (const id of nodes.keys()) {
    if (id.endsWith(prefixed)) return id;
  }

  // Slug/label fuzzy match
  let best: string | undefined;
  let bestScore = 0;
  for (const node of nodes.values()) {
    const slugPart = node.id.split(":")[1] || "";
    const label = node.label.toLowerCase();
    if (slugPart === e) return node.id;
    if (label === e) return node.id;
    if (label.includes(e) || e.includes(slugPart)) {
      const score = e.length / Math.max(label.length, 1);
      if (score > bestScore) {
        bestScore = score;
        best = node.id;
      }
    }
  }
  return best;
}

function bfsSubgraph(
  centerId: string,
  edges: GraphEdge[],
  depth: number,
  maxNodes: number
): { nodeIds: string[]; edges: GraphEdge[] } {
  // Build adjacency (undirected for traversal)
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    if (!adj.has(e.from)) adj.set(e.from, []);
    adj.get(e.from)!.push(e.to);
    if (!adj.has(e.to)) adj.set(e.to, []);
    adj.get(e.to)!.push(e.from);
  }

  const visited = new Set<string>([centerId]);
  let frontier = [centerId];

  for (let d = 0; d < depth; d++) {
    const next: string[] = [];
    for (const node of frontier) {
      for (const neighbor of adj.get(node) || []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          next.push(neighbor);
        }
      }
    }
    frontier = next;
    if (visited.size >= maxNodes) break;
  }

  // Collect edges where both endpoints are in visited
  const resultEdges = edges.filter((e) => visited.has(e.from) && visited.has(e.to));

  return { nodeIds: Array.from(visited), edges: resultEdges };
}

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
        human_rct_score: claim.humanRctScore || 0,
        meta_score: claim.metaScore || 0,
        mechanism_score: claim.mechanismScore || 0,
        safety_score: claim.safetyScore || 0,
        confidence: claim.confidence || "moderate",
        rct_count: claim.rctCount || 0,
        meta_count: claim.metaCount || 0,
        study_count: claim.studyCount || 0,
        dose: claim.dose,
        population: claim.population || [],
        limitations: claim.limitations || [],
        mechanism: claim.mechanism || [],
        faq: claim.faq || [],
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
    humanRctScore: Number(row.human_rct_score || 0),
    metaScore: Number(row.meta_score || 0),
    mechanismScore: Number(row.mechanism_score || 0),
    safetyScore: Number(row.safety_score || 0),
    confidence: (row.confidence as Claim["confidence"]) || "moderate",
    rctCount: Number(row.rct_count || 0),
    metaCount: Number(row.meta_count || 0),
    studyCount: Number(row.study_count || 0),
    dose: String(row.dose || ""),
    population: (row.population as string[]) || [],
    limitations: (row.limitations as string[]) || [],
    mechanism: (row.mechanism as string[]) || [],
    faq: (row.faq as FAQItem[]) || [],
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
