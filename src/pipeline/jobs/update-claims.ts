// EvidenceHub Sleep — Job 3: Update Claims
// Independent, schedulable job: deduplicates new claims against existing ones,
// merges matching claims, and recalculates evidence scores.

import { findSimilarClaim } from "../ai-extractor";
import { recalculateScore } from "../evidence-scorer";
import { getAllClaimsDb, getClaimBySlugDb, upsertClaimDb, isDbMode } from "@/lib/db";
import type { ExtractedClaim, PubMedPaper } from "../types";
import type { Claim } from "@/lib/types";
import { jobAiParse, type AiParseResult } from "./ai-parse";

export interface UpdateClaimsResult {
  claimsProcessed: number;
  claimsCreated: number;
  claimsUpdated: number;
  claimsSkipped: number;
  errors: string[];
  timestamp: string;
}

/**
 * Job 3: Update Claims
 * Takes extracted claims from Job 2, deduplicates them against existing claims,
 * merges new studies into existing claims, and recalculates evidence scores.
 *
 * This job depends on Job 2's output but can run independently by calling
 * jobAiParse() internally if no pre-extracted claims are provided.
 */
export async function jobUpdateClaims(
  preExtracted?: AiParseResult
): Promise<UpdateClaimsResult> {
  const result: UpdateClaimsResult = {
    claimsProcessed: 0,
    claimsCreated: 0,
    claimsUpdated: 0,
    claimsSkipped: 0,
    errors: [],
    timestamp: new Date().toISOString(),
  };

  console.log("[Job 3: update-claims] Starting claim dedup and score update...");

  // Get extracted claims from Job 2 (or run it if not provided)
  let extractedClaims: { paper: PubMedPaper; claim: ExtractedClaim }[];
  if (preExtracted && preExtracted.extractedClaims.length > 0) {
    extractedClaims = preExtracted.extractedClaims;
  } else {
    console.log("[Job 3] No pre-extracted claims provided. Running AI parse first...");
    const parseResult = await jobAiParse();
    extractedClaims = parseResult.extractedClaims;
  }

  if (extractedClaims.length === 0) {
    console.log("[Job 3] No claims to process.");
    return result;
  }

  // Get existing claims for dedup
  const existingClaims = await getAllClaimsDb();

  for (const { paper, claim } of extractedClaims) {
    result.claimsProcessed++;
    try {
      const match = findSimilarClaim(claim);

      if (match.matched && match.existingSlug) {
        // Merge into existing claim
        const existing = await getClaimBySlugDb(match.existingSlug);
        if (existing) {
          const score = recalculateScore(
            existing.evidenceScore,
            existing.rctCount,
            existing.metaCount,
            existing.studyCount,
            claim.studyType,
            claim.contradictions.length > 0
          );

          if (isDbMode()) {
            await upsertClaimDb({
              ...existing,
              evidenceScore: score.evidenceScore,
              confidence: score.confidence,
              rctCount: score.rctCount,
              metaCount: score.metaCount,
              studyCount: score.studyCount,
            });
          }

          result.claimsUpdated++;
          console.log(`  [MERGE] "${claim.text.slice(0, 50)}..." → "${existing.slug}" (sim: ${match.similarity.toFixed(2)})`);
        }
      } else {
        // New claim — already created in Job 2 if DB mode
        result.claimsCreated++;
        console.log(`  [NEW] "${claim.text.slice(0, 50)}..." (no match found)`);
      }
    } catch (err) {
      result.errors.push(`Update failed for PMID ${paper.pmid}: ${err}`);
    }
  }

  console.log(`[Job 3] Complete. Processed: ${result.claimsProcessed}, Created: ${result.claimsCreated}, Updated: ${result.claimsUpdated}`);
  return result;
}
