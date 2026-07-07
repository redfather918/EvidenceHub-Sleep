// EvidenceHub Sleep — Job 2: AI Parse
// Independent, schedulable job: takes fetched papers and extracts claims via AI.
// Reads unprocessed papers, runs AI extraction, outputs ExtractedClaim objects.

import { extractClaim, detectTopicSlug, detectCategory, findSimilarClaimDb } from "../ai-extractor";
import { calculateEvidenceScore } from "../evidence-scorer";
import { fetchPapers } from "../pubmed-fetcher";
import { upsertStudyDb, upsertClaimDb, linkStudyToClaimDb, isDbMode, getAllClaimsDb, getClaimBySlugDb } from "@/lib/db";
import { generateSlug } from "../pipeline";
import type { PubMedPaper, ExtractedClaim } from "../types";
import type { Claim } from "@/lib/types";

export interface AiParseResult {
  papersProcessed: number;
  claimsExtracted: number;
  claimsStored: number;
  errors: string[];
  timestamp: string;
  extractedClaims: { paper: PubMedPaper; claim: ExtractedClaim }[];
}

/**
 * Job 2: AI Parse
 * Fetches papers from PubMed (or reads from DB if already stored),
 * runs AI extraction on each, and stores the extracted claims.
 *
 * This job is independent of Job 1 — it can run standalone by fetching
 * papers directly from PubMed if needed.
 */
export async function jobAiParse(): Promise<AiParseResult> {
  const result: AiParseResult = {
    papersProcessed: 0,
    claimsExtracted: 0,
    claimsStored: 0,
    errors: [],
    timestamp: new Date().toISOString(),
    extractedClaims: [],
  };

  console.log("[Job 2: ai-parse] Starting AI claim extraction...");

  // Fetch papers (in a decoupled system, this would read from DB where status=NEW)
  let papers: PubMedPaper[] = [];
  try {
    papers = await fetchPapers();
    result.papersProcessed = papers.length;
  } catch (err) {
    result.errors.push(`Paper fetch failed: ${err}`);
    console.error(`[Job 2] ${err}`);
    return result;
  }

  if (papers.length === 0) {
    console.log("[Job 2] No papers to process.");
    return result;
  }

  // Get existing claims for dedup context
  const existingClaims = await getAllClaimsDb();

  // Process each paper
  for (const paper of papers) {
    try {
      const claim = await extractClaim(paper);
      if (claim) {
        result.extractedClaims.push({ paper, claim });
        result.claimsExtracted++;
        console.log(`  [OK] PMID ${paper.pmid}: ${claim.text.slice(0, 80)}...`);
      } else {
        console.log(`  [SKIP] PMID ${paper.pmid}: No sleep-related claim`);
      }
    } catch (err) {
      result.errors.push(`Extraction failed for PMID ${paper.pmid}: ${err}`);
      console.error(`  [ERR] PMID ${paper.pmid}: ${err}`);
    }
  }

  // Store claims in database
  if (isDbMode()) {
    for (const { paper, claim } of result.extractedClaims) {
      try {
        const score = calculateEvidenceScore(claim);
        const slug = generateSlug(claim.text);
        const topicSlug = detectTopicSlug(claim) || "supplements";
        const category = detectCategory(claim);

        // Store study
        const studyId = await upsertStudyDb({
          pmid: paper.pmid,
          doi: paper.doi,
          title: paper.title,
          abstract: paper.abstract,
          journal: paper.journal,
          authors: paper.authors.join(", "),
          year: paper.year,
          sampleSize: claim.sampleSize,
          duration: claim.duration,
          intervention: claim.intervention,
          outcome: claim.outcome,
          effectSize: claim.effectSize,
          result: claim.summary,
          studyType: claim.studyType,
          population: claim.population,
          url: paper.url,
          strength: score.evidenceScore >= 85 ? 5 : score.evidenceScore >= 70 ? 4 : 3,
        });

        // Store claim — dedup against DB first
        const similar = await findSimilarClaimDb(claim);
        if (similar.matched && similar.existingSlug) {
          console.log(`  [DEDUP] Similar claim found (${(similar.similarity * 100).toFixed(0)}%): ${similar.existingSlug}`);
          // Link study to existing claim instead of creating a duplicate
          if (studyId && similar.existingSlug) {
            const existing = await getClaimBySlugDb(similar.existingSlug);
            if (existing?.id) {
              await linkStudyToClaimDb(existing.id, studyId);
              result.claimsStored++;
            }
          }
          continue;
        }

        const claimId = await upsertClaimDb({
          slug,
          text: claim.text,
          summary: claim.summary,
          category,
          topicSlug,
          evidenceScore: score.evidenceScore,
          confidence: score.confidence,
          humanRctScore: score.humanRctScore,
          metaScore: score.metaScore,
          mechanismScore: score.mechanismScore,
          safetyScore: score.safetyScore,
          rctCount: score.rctCount,
          metaCount: score.metaCount,
          studyCount: score.studyCount,
          dose: claim.dose,
          population: [claim.population],
          limitations: claim.limitations,
          mechanism: claim.mechanism,
          faq: claim.faq,
          keywords: claim.keywords,
          relatedSlugs: [],
        });

        // Link study to claim
        if (studyId && claimId) {
          await linkStudyToClaimDb(claimId, studyId);
          result.claimsStored++;
        }
      } catch (err) {
        result.errors.push(`Store failed for PMID ${paper.pmid}: ${err}`);
      }
    }
    console.log(`[Job 2] Stored ${result.claimsStored} claims to database.`);
  } else {
    result.claimsStored = result.claimsExtracted;
    console.log(`[Job 2] Static mode: ${result.claimsExtracted} claims extracted (not stored).`);
  }

  console.log(`[Job 2] Complete. Processed: ${result.papersProcessed}, Extracted: ${result.claimsExtracted}, Stored: ${result.claimsStored}`);
  return result;
}
