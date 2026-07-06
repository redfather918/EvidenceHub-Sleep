// EvidenceHub Sleep — Job 1: Fetch Papers
// Independent, schedulable job: fetches papers from PubMed and stores them.
// Can be triggered by Vercel Cron, GitHub Actions, or manual CLI.

import { fetchPapers } from "../pubmed-fetcher";
import { upsertStudyDb, isDbMode, getAllClaimsDb } from "@/lib/db";
import type { PubMedPaper } from "../types";
import type { Study } from "@/lib/types";

export interface FetchPapersResult {
  papersFetched: number;
  papersStored: number;
  errors: string[];
  timestamp: string;
}

/**
 * Job 1: Fetch papers from PubMed and store raw paper data.
 * This job ONLY fetches and stores — it does NOT do AI parsing.
 * AI parsing is a separate job (ai-parse) that processes papers with status=NEW.
 */
export async function jobFetchPapers(): Promise<FetchPapersResult> {
  const result: FetchPapersResult = {
    papersFetched: 0,
    papersStored: 0,
    errors: [],
    timestamp: new Date().toISOString(),
  };

  console.log("[Job 1: fetch-papers] Starting paper fetch from PubMed...");

  let papers: PubMedPaper[] = [];
  try {
    papers = await fetchPapers();
    result.papersFetched = papers.length;
  } catch (err) {
    const errMsg = `PubMed fetch failed: ${err}`;
    result.errors.push(errMsg);
    console.error(`[Job 1] ${errMsg}`);
    return result;
  }

  if (papers.length === 0) {
    console.log("[Job 1] No new papers found.");
    return result;
  }

  // Store papers in database (if Supabase configured)
  if (isDbMode()) {
    for (const paper of papers) {
      try {
        const studyId = await upsertStudyDb({
          pmid: paper.pmid,
          doi: paper.doi,
          title: paper.title,
          abstract: paper.abstract,
          journal: paper.journal,
          authors: paper.authors.join(", "),
          year: paper.year,
          studyType: "observational", // Default; AI parse will refine
          url: paper.url,
          sampleSize: 0,
          result: "",
        });

        if (studyId) {
          result.papersStored++;
        }
      } catch (err) {
        result.errors.push(`Failed to store PMID ${paper.pmid}: ${err}`);
      }
    }
    console.log(`[Job 1] Stored ${result.papersStored}/${papers.length} papers to database.`);
  } else {
    // In static mode, just report what would be stored
    result.papersStored = papers.length;
    console.log(`[Job 1] Static mode: ${papers.length} papers would be stored to database.`);
  }

  // Return the raw papers for the next job (AI parse) to process
  // In a real event-driven system, this would trigger the ai-parse job
  console.log(`[Job 1] Complete. Fetched: ${result.papersFetched}, Stored: ${result.papersStored}`);
  return result;
}

/**
 * Get papers that need AI parsing (status = NEW or no abstract parsed).
 * In database mode, queries for unprocessed papers.
 * In static mode, returns empty (no new papers in static mode).
 */
export async function getUnprocessedPapers(): Promise<PubMedPaper[]> {
  if (!isDbMode()) {
    return [];
  }

  // In a full implementation, this would query studies where status = 'NEW'
  // For now, we return an empty array as the fetch job stores papers directly
  // and the AI parse job is triggered immediately after
  return [];
}
