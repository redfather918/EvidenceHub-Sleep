// EvidenceHub Sleep — Data Access Layer
// Provides typed access to claims, studies, topics, and relations

import type {
  Claim,
  ClaimWithRelations,
  Study,
  Topic,
  DoseMapping,
  PopulationFit,
  ClaimApiResponse,
  EvidenceApiResponse,
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
// Claim queries
// ============================================================

export function getAllClaims(): Claim[] {
  return claimsData;
}

export function getClaimBySlug(slug: string): Claim | undefined {
  return claimsData.find((c) => c.slug === slug);
}

export function getTrendingClaims(limit = 6): Claim[] {
  return [...claimsData].sort((a, b) => b.evidenceScore - a.evidenceScore).slice(0, limit);
}

export function getLatestClaims(limit = 6): Claim[] {
  return [...claimsData]
    .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
    .slice(0, limit);
}

export function getClaimsByTopic(topicSlug: string): Claim[] {
  return claimsData.filter((c) => c.topicSlug === topicSlug);
}

export function getRelatedClaims(slug: string): Claim[] {
  const claim = getClaimBySlug(slug);
  if (!claim) return [];
  return claim.relatedSlugs
    .map((s) => getClaimBySlug(s))
    .filter((c): c is Claim => c !== undefined);
}

export function getClaimWithRelations(slug: string): ClaimWithRelations | undefined {
  const claim = getClaimBySlug(slug);
  if (!claim) return undefined;

  const studyIds = claimStudies[slug] || [];
  const relatedStudies = studyIds
    .map((id) => studiesData[id])
    .filter((s): s is Study => s !== undefined);

  const relatedClaims = getRelatedClaims(slug);

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

// ============================================================
// Study queries
// ============================================================

export function getStudiesByClaim(slug: string): Study[] {
  const studyIds = claimStudies[slug] || [];
  return studyIds
    .map((id) => studiesData[id])
    .filter((s): s is Study => s !== undefined);
}

export function getStudyById(id: string): Study | undefined {
  return studiesData[id];
}

// ============================================================
// Topic queries
// ============================================================

export function getAllTopics(): Topic[] {
  return topicsData;
}

export function getTopicBySlug(slug: string): Topic | undefined {
  return topicsData.find((t) => t.slug === slug);
}

// ============================================================
// API response builders
// ============================================================

export function buildClaimApiResponse(slug: string): ClaimApiResponse | undefined {
  const claim = getClaimBySlug(slug);
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

export function buildEvidenceApiResponse(topicSlug: string): EvidenceApiResponse | undefined {
  const topic = getTopicBySlug(topicSlug);
  if (!topic) return undefined;

  const topicClaims = getClaimsByTopic(topicSlug);
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
// Search
// ============================================================

export function searchClaims(query: string): Claim[] {
  const lower = query.toLowerCase();
  return claimsData.filter(
    (c) =>
      c.text.toLowerCase().includes(lower) ||
      c.summary.toLowerCase().includes(lower) ||
      c.keywords.some((k) => k.toLowerCase().includes(lower)) ||
      c.category.toLowerCase().includes(lower)
  );
}
