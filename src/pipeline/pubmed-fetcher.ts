// EvidenceHub Sleep — PubMed Paper Fetcher (Ingestion Layer)
// Fetches recent sleep-related papers from PubMed E-utilities API

import type { PubMedPaper } from "./types";
import { pipelineConfig } from "./config";

const EUTILS_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

/**
 * Search PubMed for papers matching the given search terms.
 * Returns a list of PMIDs.
 */
async function searchPubMed(term: string, maxResults: number, dateRangeDays: number): Promise<string[]> {
  const mindate = new Date();
  mindate.setDate(mindate.getDate() - dateRangeDays);
  const dateStr = `${mindate.getFullYear()}/${String(mindate.getMonth() + 1).padStart(2, "0")}/${String(mindate.getDate()).padStart(2, "0")}`;

  const params = new URLSearchParams({
    db: "pubmed",
    term: term,
    retmax: String(maxResults),
    sort: "date",
    datetype: "pdat",
    mindate: dateStr,
    retmode: "json",
  });

  if (pipelineConfig.pubmed.apiKey) {
    params.set("api_key", pipelineConfig.pubmed.apiKey);
  }

  const url = `${EUTILS_BASE}/esearch.fcgi?${params.toString()}`;

  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`PubMed esearch HTTP ${resp.status}: ${await resp.text()}`);
    }
    const data = await resp.json();
    const ids: string[] = data?.esearchresult?.idlist || [];
    return ids;
  } catch (err) {
    console.error(`  [PubMed] Search failed for "${term}": ${err}`);
    return [];
  }
}

/**
 * Fetch full paper details for a list of PMIDs using efetch.
 * Parses the XML response to extract structured paper data.
 */
async function fetchPaperDetails(pmids: string[]): Promise<PubMedPaper[]> {
  if (pmids.length === 0) return [];

  const params = new URLSearchParams({
    db: "pubmed",
    id: pmids.join(","),
    rettype: "abstract",
    retmode: "xml",
  });

  if (pipelineConfig.pubmed.apiKey) {
    params.set("api_key", pipelineConfig.pubmed.apiKey);
  }

  const url = `${EUTILS_BASE}/efetch.fcgi?${params.toString()}`;

  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`PubMed efetch HTTP ${resp.status}`);
    }
    const xml = await resp.text();
    return parsePubMedXML(xml);
  } catch (err) {
    console.error(`  [PubMed] Fetch failed for PMIDs ${pmids.join(",")}: ${err}`);
    return [];
  }
}

/**
 * Parse PubMed XML response into structured PubMedPaper objects.
 * Uses regex-based parsing to avoid external XML dependency.
 */
function parsePubMedXML(xml: string): PubMedPaper[] {
  const papers: PubMedPaper[] = [];

  // Split by <PubmedArticle> tags
  const articleRegex = /<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g;
  let match: RegExpExecArray | null;

  while ((match = articleRegex.exec(xml)) !== null) {
    const block = match[1];

    const pmid = extractTag(block, "PMID");
    if (!pmid) continue;

    const doi = extractAttributeTag(block, "ArticleId", "doi");
    const title = extractTag(block, "ArticleTitle") || "Untitled";
    const abstract = extractAbstract(block);
    const journal = extractTag(block, "Title") || extractTag(block, "ISOAbbreviation") || "Unknown";
    const year = extractYear(block);
    const pubDate = extractTag(block, "PubDate");
    const authors = extractAuthors(block);

    papers.push({
      pmid,
      doi: doi || undefined,
      title: cleanText(title),
      abstract: cleanText(abstract),
      journal: cleanText(journal),
      authors,
      year: year || undefined,
      publicationDate: pubDate || undefined,
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    });
  }

  return papers;
}

function extractTag(block: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = block.match(regex);
  return m ? m[1].trim() : null;
}

function extractAttributeTag(block: string, tag: string, attrValue: string): string | null {
  const regex = new RegExp(`<${tag}\\s+IdType=["']${attrValue}["'][^>]*>([^<]+)<\\/${tag}>`, "i");
  const m = block.match(regex);
  return m ? m[1].trim() : null;
}

function extractAbstract(block: string): string {
  // Try AbstractText tags (may have multiple with Label attributes)
  const regex = /<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/gi;
  const parts: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(block)) !== null) {
    parts.push(m[1].trim());
  }
  return parts.join(" ");
}

function extractYear(block: string): number | null {
  const yearMatch = block.match(/<Year>(\d{4})<\/Year>/);
  if (yearMatch) return parseInt(yearMatch[1], 10);
  const medlineDate = block.match(/<MedlineDate>(\d{4})/);
  if (medlineDate) return parseInt(medlineDate[1], 10);
  return null;
}

function extractAuthors(block: string): string[] {
  const authors: string[] = [];
  const authorRegex = /<Author[^>]*>([\s\S]*?)<\/Author>/gi;
  let m: RegExpExecArray | null;
  while ((m = authorRegex.exec(block)) !== null) {
    const lastName = extractTag(m[1], "LastName") || "";
    const initials = extractTag(m[1], "Initials") || "";
    if (lastName) {
      authors.push(initials ? `${lastName} ${initials}` : lastName);
    }
  }
  return authors;
}

function cleanText(text: string): string {
  return text
    .replace(/<[^>]+>/g, "") // Remove HTML tags
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Main entry point: search and fetch papers for all configured search terms.
 * Deduplicates by PMID.
 */
export async function fetchPapers(): Promise<PubMedPaper[]> {
  const { searchTerms, maxResults, dateRangeDays } = pipelineConfig.pubmed;
  console.log(`\n[PubMed] Searching ${searchTerms.length} terms, max ${maxResults} results each, last ${dateRangeDays} days`);

  const allPmids = new Set<string>();

  for (const term of searchTerms) {
    const pmids = await searchPubMed(term, maxResults, dateRangeDays);
    pmids.forEach((id) => allPmids.add(id));
    console.log(`  "${term}" → ${pmids.length} papers`);
    // Rate limit: 3 req/s without API key
    await sleep(350);
  }

  const uniquePmids = Array.from(allPmids);
  console.log(`[PubMed] Total unique PMIDs: ${uniquePmids.length}`);

  if (uniquePmids.length === 0) {
    console.log("[PubMed] No papers found. Check search terms or date range.");
    return [];
  }

  // Fetch in batches of 50 (PubMed efetch limit)
  const batchSize = 50;
  const allPapers: PubMedPaper[] = [];

  for (let i = 0; i < uniquePmids.length; i += batchSize) {
    const batch = uniquePmids.slice(i, i + batchSize);
    const papers = await fetchPaperDetails(batch);
    allPapers.push(...papers);
    console.log(`  Fetched batch ${Math.floor(i / batchSize) + 1}: ${papers.length} papers`);
    await sleep(350);
  }

  console.log(`[PubMed] Total papers fetched: ${allPapers.length}`);
  return allPapers;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
