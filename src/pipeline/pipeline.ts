// EvidenceHub Sleep — Pipeline Orchestrator (Evidence Engine Step 4)
// Main pipeline: fetch papers → extract claims → dedup → score → output

import { fetchPapers } from "./pubmed-fetcher";
import { extractClaim, findSimilarClaim, detectTopicSlug, detectCategory } from "./ai-extractor";
import { calculateEvidenceScore, recalculateScore } from "./evidence-scorer";
import { pipelineConfig } from "./config";
import { getAllClaims, getClaimBySlug } from "@/lib/data";
import type { PubMedPaper, ExtractedClaim, PipelineResult, ScoredClaim } from "./types";
import type { Claim, Study } from "@/lib/types";
import { claims as claimsData, studies as studiesData } from "@/data/seed-data";

// ============================================================
// Pipeline entry point
// ============================================================

export async function runPipeline(): Promise<PipelineResult> {
  const result: PipelineResult = {
    papersFetched: 0,
    claimsExtracted: 0,
    claimsCreated: 0,
    claimsUpdated: 0,
    claimsSkipped: 0,
    errors: [],
    timestamp: new Date().toISOString(),
  };

  console.log("====================================================");
  console.log("  EvidenceHub Sleep — Auto-Update Pipeline v1");
  console.log("====================================================");
  console.log(`  Mode: ${pipelineConfig.dryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`  AI Provider: ${pipelineConfig.ai.provider}`);
  console.log(`  Time: ${result.timestamp}`);
  console.log("====================================================\n");

  // Step 1: Fetch papers from PubMed
  console.log("--- Step 1: Fetching papers from PubMed ---");
  let papers: PubMedPaper[] = [];
  try {
    papers = await fetchPapers();
    result.papersFetched = papers.length;
  } catch (err) {
    const errMsg = `PubMed fetch failed: ${err}`;
    result.errors.push(errMsg);
    console.error(errMsg);
    return result;
  }

  if (papers.length === 0) {
    console.log("\n[Pipeline] No papers found. Exiting.");
    return result;
  }

  // Step 2: Extract claims from each paper
  console.log("\n--- Step 2: Extracting claims via AI ---");
  const extractedClaims: { paper: PubMedPaper; claim: ExtractedClaim }[] = [];

  for (const paper of papers) {
    try {
      const claim = await extractClaim(paper);
      if (claim) {
        extractedClaims.push({ paper, claim });
        result.claimsExtracted++;
        console.log(`  [OK] PMID ${paper.pmid}: ${claim.text.slice(0, 80)}...`);
      } else {
        result.claimsSkipped++;
        console.log(`  [SKIP] PMID ${paper.pmid}: No sleep-related claim extracted`);
      }
    } catch (err) {
      result.errors.push(`Extraction failed for PMID ${paper.pmid}: ${err}`);
      console.error(`  [ERR] PMID ${paper.pmid}: ${err}`);
    }
  }

  // Step 3: Deduplicate and merge
  console.log("\n--- Step 3: Deduplicating against existing claims ---");
  const newClaims: { paper: PubMedPaper; claim: ExtractedClaim; score: ScoredClaim }[] = [];
  const updatedClaims: { paper: PubMedPaper; claim: ExtractedClaim; existingSlug: string; score: ScoredClaim }[] = [];

  for (const { paper, claim } of extractedClaims) {
    const match = findSimilarClaim(claim);

    if (match.matched && match.existingSlug) {
      // Update existing claim
      const existing = getClaimBySlug(match.existingSlug);
      if (existing) {
        const score = recalculateScore(
          existing.evidenceScore,
          existing.rctCount,
          existing.metaCount,
          existing.studyCount,
          claim.studyType,
          claim.contradictions.length > 0
        );
        updatedClaims.push({ paper, claim, existingSlug: match.existingSlug, score });
        result.claimsUpdated++;
        console.log(`  [MERGE] "${claim.text.slice(0, 50)}..." → existing "${existing.slug}" (sim: ${match.similarity.toFixed(2)})`);
      }
    } else {
      // Create new claim
      const score = calculateEvidenceScore(claim);
      newClaims.push({ paper, claim, score });
      result.claimsCreated++;
      console.log(`  [NEW] "${claim.text.slice(0, 50)}..." (score: ${score.evidenceScore}, conf: ${score.confidence})`);
    }
  }

  // Step 4: Generate output
  console.log("\n--- Step 4: Generating output ---");

  if (pipelineConfig.dryRun) {
    console.log("\n  [DRY RUN] No files modified. Here's what would happen:");
    console.log(`  - ${newClaims.length} new claims would be added to seed-data.ts`);
    console.log(`  - ${updatedClaims.length} existing claims would be updated`);
    console.log(`  - ${result.claimsSkipped} papers skipped (no relevant claims)`);
    printNewClaimsPreview(newClaims);
    printUpdatedClaimsPreview(updatedClaims);
  } else {
    // In live mode, generate the update report
    generateUpdateReport(newClaims, updatedClaims, result);
  }

  // Summary
  console.log("\n====================================================");
  console.log("  Pipeline Summary");
  console.log("====================================================");
  console.log(`  Papers fetched:     ${result.papersFetched}`);
  console.log(`  Claims extracted:   ${result.claimsExtracted}`);
  console.log(`  New claims:         ${result.claimsCreated}`);
  console.log(`  Updated claims:     ${result.claimsUpdated}`);
  console.log(`  Skipped (no claim): ${result.claimsSkipped}`);
  console.log(`  Errors:             ${result.errors.length}`);
  if (result.errors.length > 0) {
    result.errors.forEach((e) => console.log(`    - ${e}`));
  }
  console.log("====================================================\n");

  return result;
}

// ============================================================
// Output helpers
// ============================================================

function printNewClaimsPreview(claims: { paper: PubMedPaper; claim: ExtractedClaim; score: ScoredClaim }[]): void {
  if (claims.length === 0) return;
  console.log("\n  New claims preview:");
  claims.forEach(({ claim, score }, i) => {
    const slug = generateSlug(claim.text);
    console.log(`\n  ${i + 1}. slug: ${slug}`);
    console.log(`     text: ${claim.text}`);
    console.log(`     score: ${score.evidenceScore} (${score.confidence})`);
    console.log(`     type: ${claim.studyType}, sample: ${claim.sampleSize}`);
    console.log(`     dose: ${claim.dose}`);
    console.log(`     topic: ${detectTopicSlug(claim) || "unknown"}`);
  });
}

function printUpdatedClaimsPreview(claims: { paper: PubMedPaper; claim: ExtractedClaim; existingSlug: string; score: ScoredClaim }[]): void {
  if (claims.length === 0) return;
  console.log("\n  Updated claims preview:");
  claims.forEach(({ claim, existingSlug, score }, i) => {
    console.log(`\n  ${i + 1}. existing: ${existingSlug}`);
    console.log(`     new study: ${claim.studyType} (PMID: ${claim.intervention})`);
    console.log(`     updated score: ${score.evidenceScore} (${score.confidence})`);
    console.log(`     rcts: ${score.rctCount}, meta: ${score.metaCount}, total: ${score.studyCount}`);
  });
}

function generateUpdateReport(
  newClaims: { paper: PubMedPaper; claim: ExtractedClaim; score: ScoredClaim }[],
  updatedClaims: { paper: PubMedPaper; claim: ExtractedClaim; existingSlug: string; score: ScoredClaim }[],
  result: PipelineResult
): void {
  const report = {
    timestamp: result.timestamp,
    summary: {
      papersFetched: result.papersFetched,
      claimsExtracted: result.claimsExtracted,
      newClaims: newClaims.length,
      updatedClaims: updatedClaims.length,
      skipped: result.claimsSkipped,
      errors: result.errors,
    },
    newClaims: newClaims.map(({ paper, claim, score }) => ({
      slug: generateSlug(claim.text),
      pmid: paper.pmid,
      title: paper.title,
      text: claim.text,
      summary: claim.summary,
      intervention: claim.intervention,
      outcome: claim.outcome,
      population: claim.population,
      dose: claim.dose,
      effectSize: claim.effectSize,
      studyType: claim.studyType,
      sampleSize: claim.sampleSize,
      evidenceScore: score.evidenceScore,
      confidence: score.confidence,
      rctCount: score.rctCount,
      metaCount: score.metaCount,
      studyCount: score.studyCount,
      topic: detectTopicSlug(claim),
      category: detectCategory(claim),
      mechanism: claim.mechanism,
      limitations: claim.limitations,
      contradictions: claim.contradictions,
      keywords: claim.keywords,
      url: paper.url,
    })),
    updatedClaims: updatedClaims.map(({ paper, claim, existingSlug, score }) => ({
      existingSlug,
      pmid: paper.pmid,
      title: paper.title,
      newStudyType: claim.studyType,
      updatedScore: score.evidenceScore,
      updatedConfidence: score.confidence,
      updatedRctCount: score.rctCount,
      updatedMetaCount: score.metaCount,
      updatedStudyCount: score.studyCount,
    })),
  };

  console.log("\n  [OUTPUT] Pipeline report generated.");
  console.log(`  - ${newClaims.length} new claims ready for seed-data.ts`);
  console.log(`  - ${updatedClaims.length} existing claims ready for update`);
  console.log("  - Run `npm run pipeline:apply` to apply changes to seed-data.ts");
  console.log("  - Then run `npm run build` to regenerate pages");
}

// ============================================================
// Utility: Generate slug from claim text
// ============================================================

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
    .replace(/-$/, "");
}

// ============================================================
// Utility: Generate a new Claim object from extracted data
// ============================================================

export function createClaimFromExtracted(
  paper: PubMedPaper,
  extracted: ExtractedClaim,
  score: ScoredClaim,
  existingClaimsCount: number
): { claim: Claim; study: Study } {
  const slug = generateSlug(extracted.text);
  const topicSlug = detectTopicSlug(extracted) || "supplements";
  const category = detectCategory(extracted);
  const now = new Date().toISOString();

  const studyId = `s-auto-${paper.pmid}`;

  const study: Study = {
    id: studyId,
    pmid: paper.pmid,
    doi: paper.doi,
    title: paper.title,
    journal: paper.journal,
    authors: paper.authors.join(", "),
    year: paper.year,
    sampleSize: extracted.sampleSize,
    duration: extracted.duration,
    intervention: extracted.intervention,
    outcome: extracted.outcome,
    effectSize: extracted.effectSize,
    result: extracted.summary,
    studyType: extracted.studyType,
    population: extracted.population,
    url: paper.url,
    strength: score.evidenceScore >= 85 ? 5 : score.evidenceScore >= 70 ? 4 : 3,
  };

  const claim: Claim = {
    id: `c-auto-${existingClaimsCount + 1}`,
    slug,
    text: extracted.text,
    summary: extracted.summary,
    category,
    topicSlug,
    evidenceScore: score.evidenceScore,
    humanRctScore: score.humanRctScore,
    metaScore: score.metaScore,
    mechanismScore: score.mechanismScore,
    safetyScore: score.safetyScore,
    confidence: score.confidence,
    rctCount: score.rctCount,
    metaCount: score.metaCount,
    studyCount: score.studyCount,
    dose: extracted.dose,
    population: [extracted.population],
    limitations: extracted.limitations,
    mechanism: extracted.mechanism,
    faq: extracted.faq,
    relatedSlugs: [],
    keywords: extracted.keywords,
    lastUpdated: now,
    createdAt: now,
  };

  return { claim, study };
}
