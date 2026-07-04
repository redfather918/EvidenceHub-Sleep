// EvidenceHub Sleep — Evidence Score Calculator (Evidence Engine Step 3)
// Implements the v2 scoring algorithm for evidence quality assessment.

import type { ExtractedClaim, ScoredClaim } from "./types";
import { pipelineConfig } from "./config";

/**
 * Calculate the evidence score for a claim using the v2 formula:
 *
 * Score =
 *   RCT_count × rctWeight (10)
 * + Meta_count × metaWeight (15)
 * + Human_studies × humanWeight (8)
 * + Consistency × consistencyWeight (20)
 * + Effect_size × effectSizeWeight (20)
 * - Contradictions × contradictionPenalty (15)
 *
 * Clamped to [0, 100]
 *
 * @param claim The extracted claim data
 * @param existingRctCount Number of existing RCTs (if updating an existing claim)
 * @param existingMetaCount Number of existing meta-analyses (if updating)
 * @param existingStudyCount Total existing studies (if updating)
 */
export function calculateEvidenceScore(
  claim: ExtractedClaim,
  existingRctCount = 0,
  existingMetaCount = 0,
  existingStudyCount = 0
): ScoredClaim {
  const { scoring } = pipelineConfig;

  // Count evidence types from this claim + existing
  const rctCount = existingRctCount + (claim.studyType === "rct" ? 1 : 0);
  const metaCount = existingMetaCount + (claim.studyType === "meta" ? 1 : 0);
  const studyCount = existingStudyCount + 1;

  // 1. RCT score: capped at 30 points (3 RCTs × 10)
  const rctScore = Math.min(rctCount * scoring.rctWeight, 30);

  // 2. Meta-analysis score: capped at 30 points (2 meta × 15)
  const metaScore = Math.min(metaCount * scoring.metaWeight, 30);

  // 3. Human evidence score: any human study (RCT/meta/observational) contributes
  const isHumanStudy = claim.studyType === "rct" || claim.studyType === "meta" || claim.studyType === "observational";
  const humanStudies = existingStudyCount + (isHumanStudy ? 1 : 0);
  const humanScore = Math.min(humanStudies * scoring.humanWeight, 16);

  // 4. Consistency score: based on whether the claim aligns with existing evidence
  // If no contradictions, high consistency. If contradictions exist, reduced.
  const hasContradictions = claim.contradictions.length > 0;
  const consistencyScore = hasContradictions ? scoring.consistencyWeight * 0.5 : scoring.consistencyWeight;

  // 5. Effect size score: based on whether effect size is reported and meaningful
  let effectSizeScore = 0;
  const effectSizeStr = claim.effectSize.toLowerCase();
  if (effectSizeStr !== "n/a" && effectSizeStr !== "see study" && effectSizeStr !== "see full text") {
    // Try to parse effect size (e.g., "d=0.65", "0.5", "moderate")
    const dMatch = effectSizeStr.match(/d\s*=\s*([\d.]+)/);
    if (dMatch) {
      const d = parseFloat(dMatch[1]);
      if (d >= 0.8) effectSizeScore = scoring.effectSizeWeight;
      else if (d >= 0.5) effectSizeScore = scoring.effectSizeWeight * 0.75;
      else if (d >= 0.2) effectSizeScore = scoring.effectSizeWeight * 0.5;
      else effectSizeScore = scoring.effectSizeWeight * 0.25;
    } else if (effectSizeStr.includes("significant") || effectSizeStr.includes("improvement")) {
      effectSizeScore = scoring.effectSizeWeight * 0.5;
    } else {
      effectSizeScore = scoring.effectSizeWeight * 0.3;
    }
  } else {
    // No effect size reported, give partial credit
    effectSizeScore = scoring.effectSizeWeight * 0.2;
  }

  // 6. Contradiction penalty
  const contradictionPenalty = claim.contradictions.length * scoring.contradictionPenalty;

  // Calculate raw score
  const rawScore =
    rctScore +
    metaScore +
    humanScore +
    consistencyScore +
    effectSizeScore -
    contradictionPenalty;

  // Clamp to [0, 100]
  const evidenceScore = Math.max(0, Math.min(100, Math.round(rawScore)));

  // Determine confidence level
  const confidence: ScoredClaim["confidence"] =
    evidenceScore >= 85 ? "high" : evidenceScore >= 65 ? "moderate" : "low";

  // Calculate sub-scores (0-5 scale for display)
  const humanRctScore = Math.min(5, Math.round(rctCount * 1.5));
  const metaDisplayScore = Math.min(5, Math.round(metaCount * 2.5));
  const mechanismDisplayScore = claim.mechanism.length >= 4 ? 5 : Math.max(1, claim.mechanism.length);
  const safetyDisplayScore = claim.contradictions.length === 0 ? 4 : 2;

  return {
    evidenceScore,
    confidence,
    humanRctScore,
    metaScore: metaDisplayScore,
    mechanismScore: mechanismDisplayScore,
    safetyScore: safetyDisplayScore,
    rctCount,
    metaCount,
    studyCount,
  };
}

/**
 * Recalculate evidence score when a new study is added to an existing claim.
 */
export function recalculateScore(
  existingScore: number,
  existingRctCount: number,
  existingMetaCount: number,
  existingStudyCount: number,
  newStudyType: ExtractedClaim["studyType"],
  hasContradictions: boolean
): ScoredClaim {
  const rctCount = existingRctCount + (newStudyType === "rct" ? 1 : 0);
  const metaCount = existingMetaCount + (newStudyType === "meta" ? 1 : 0);
  const studyCount = existingStudyCount + 1;

  // Use the same formula but with simplified inputs
  const { scoring } = pipelineConfig;

  const rctScore = Math.min(rctCount * scoring.rctWeight, 30);
  const metaScore = Math.min(metaCount * scoring.metaWeight, 30);
  const isHumanStudy = newStudyType === "rct" || newStudyType === "meta" || newStudyType === "observational";
  const humanStudies = existingStudyCount + (isHumanStudy ? 1 : 0);
  const humanScore = Math.min(humanStudies * scoring.humanWeight, 16);
  const consistencyScore = hasContradictions ? scoring.consistencyWeight * 0.5 : scoring.consistencyWeight;
  // Use existing score to infer effect size quality
  const effectSizeScore = existingScore > 70 ? scoring.effectSizeWeight * 0.6 : scoring.effectSizeWeight * 0.3;

  const rawScore = rctScore + metaScore + humanScore + consistencyScore + effectSizeScore;
  const evidenceScore = Math.max(0, Math.min(100, Math.round(rawScore)));
  const confidence: ScoredClaim["confidence"] =
    evidenceScore >= 85 ? "high" : evidenceScore >= 65 ? "moderate" : "low";

  return {
    evidenceScore,
    confidence,
    humanRctScore: Math.min(5, Math.round(rctCount * 1.5)),
    metaScore: Math.min(5, Math.round(metaCount * 2.5)),
    mechanismScore: 4,
    safetyScore: hasContradictions ? 2 : 4,
    rctCount,
    metaCount,
    studyCount,
  };
}
