// EvidenceHub Sleep — AI Claim Extractor (Evidence Engine Step 1-2)
// Extracts structured claims from paper abstracts using AI,
// then deduplicates against existing claims.

import type { PubMedPaper, ExtractedClaim, ClaimMatchResult } from "./types";
import { pipelineConfig, compoundTopicMap, categoryMap } from "./config";
import { getAllClaims } from "@/lib/data";
import { getAllClaimsDb } from "@/lib/db";
import type { Claim } from "@/lib/types";

// ============================================================
// Step 1: AI Claim Extraction
// ============================================================

/**
 * Build the AI prompt for extracting structured claims from a paper abstract.
 */
function buildExtractionPrompt(paper: PubMedPaper): string {
  return `You are a scientific evidence analyst. Extract structured claims from this sleep research paper.

Paper Title: ${paper.title}
Abstract: ${paper.abstract}
Journal: ${paper.journal}
Year: ${paper.year || "N/A"}

Extract ONE primary claim from this paper. Return as JSON with these fields:
{
  "text": "A concise claim statement (e.g., 'Glycine reduces sleep latency in healthy adults')",
  "summary": "2-3 sentence summary with key numbers",
  "intervention": "What was tested (e.g., '3g glycine before bed')",
  "outcome": "What was measured (e.g., 'Sleep latency, PSQI score')",
  "population": "Who was studied (e.g., 'Healthy adults with mild sleep complaints')",
  "effectSize": "Effect size if reported (e.g., 'd=0.65' or 'N/A')",
  "dose": "Recommended dose if applicable (e.g., '3g' or 'N/A')",
  "mechanism": ["Step 1", "Step 2", "Step 3", "Result"],
  "limitations": ["Limitation 1", "Limitation 2"],
  "contradictions": ["Any contradicting evidence, or empty array"],
  "faq": [{"q": "Question", "a": "Answer"}, ...],
  "keywords": ["keyword1", "keyword2", ...],
  "studyType": "rct|meta|observational|animal",
  "sampleSize": 100,
  "duration": "8 weeks",
  "confidence": "high|moderate|low"
}

Rules:
- Only extract claims supported by the abstract text
- Be conservative with confidence: "high" only for RCTs with clear results
- Include at least 2 limitations
- Generate 3-4 FAQ items that AI search engines might ask
- Keywords should include compound name, outcome, and population

Return ONLY the JSON object, no markdown formatting.`;
}

/**
 * Extract a structured claim from a paper using AI.
 * Supports DeepSeek, OpenAI, and mock mode.
 */
export async function extractClaim(paper: PubMedPaper): Promise<ExtractedClaim | null> {
  const { provider, apiKey, model, temperature } = pipelineConfig.ai;

  // Mock mode: generate a basic claim from the abstract without AI
  if (provider === "mock" || !apiKey) {
    return mockExtractClaim(paper);
  }

  const prompt = buildExtractionPrompt(paper);

  try {
    let response: string;

    if (provider === "deepseek") {
      response = await callDeepSeek(prompt, apiKey, model, temperature);
    } else {
      response = await callOpenAI(prompt, apiKey, model, temperature);
    }

    // Parse JSON from response (handle markdown code blocks)
    const jsonStr = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    return normalizeExtractedClaim(parsed, paper);
  } catch (err) {
    console.error(`  [AI] Extraction failed for PMID ${paper.pmid}: ${err}`);
    return mockExtractClaim(paper);
  }
}

/**
 * Call DeepSeek API for claim extraction.
 */
async function callDeepSeek(prompt: string, apiKey: string, model: string, temperature: number): Promise<string> {
  const resp = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature,
      max_tokens: 2000,
    }),
  });

  if (!resp.ok) {
    throw new Error(`DeepSeek API HTTP ${resp.status}: ${await resp.text()}`);
  }

  const data = await resp.json();
  return data.choices[0].message.content;
}

/**
 * Call OpenAI API for claim extraction.
 */
async function callOpenAI(prompt: string, apiKey: string, model: string, temperature: number): Promise<string> {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature,
      max_tokens: 2000,
    }),
  });

  if (!resp.ok) {
    throw new Error(`OpenAI API HTTP ${resp.status}: ${await resp.text()}`);
  }

  const data = await resp.json();
  return data.choices[0].message.content;
}

/**
 * Mock extraction: generate a basic claim from paper metadata without AI.
 * Used for testing the pipeline without API keys.
 */
function mockExtractClaim(paper: PubMedPaper): ExtractedClaim | null {
  const abstract = paper.abstract.toLowerCase();

  // Only process if abstract mentions sleep
  if (!abstract.includes("sleep") && !abstract.includes("insomnia") && !abstract.includes("circadian")) {
    return null;
  }

  // Detect compound from abstract
  let compound = "unknown";
  for (const key of Object.keys(compoundTopicMap)) {
    if (abstract.includes(key)) {
      compound = key;
      break;
    }
  }

  // Detect study type
  let studyType: ExtractedClaim["studyType"] = "observational";
  if (abstract.includes("randomized") || abstract.includes("randomised") || abstract.includes("rct")) {
    studyType = "rct";
  } else if (abstract.includes("meta-analysis") || abstract.includes("systematic review")) {
    studyType = "meta";
  } else if (abstract.includes("animal") || abstract.includes("mice") || abstract.includes("rats")) {
    studyType = "animal";
  }

  // Extract sample size from abstract
  const sampleMatch = abstract.match(/(\d+)\s*(participants|patients|subjects|adults|individuals)/);
  const sampleSize = sampleMatch ? parseInt(sampleMatch[1], 10) : 0;

  // Generate claim text
  const topicInfo = compoundTopicMap[compound];
  const claimText = topicInfo
    ? `${topicInfo.name} affects sleep outcomes in ${studyType === "rct" ? "human trials" : "research"}`
    : `Sleep intervention shows effects in ${studyType === "rct" ? "human trials" : "research"}`;

  return {
    text: claimText,
    summary: `${paper.title}. Published in ${paper.journal} (${paper.year || "N/A"}). PMID: ${paper.pmid}.`,
    intervention: compound !== "unknown" ? `${compound} supplementation` : "Sleep intervention",
    outcome: "Sleep quality, latency, or duration",
    population: "Adults (see study for details)",
    effectSize: "See full text",
    dose: "See study",
    mechanism: [compound !== "unknown" ? compound : "Intervention", "Biological pathway", "Sleep regulation", "Outcome improvement"],
    limitations: [
      "Sample size may be limited",
      "Single study — more research needed",
      "Population specificity may limit generalizability",
    ],
    contradictions: [],
    faq: [
      {
        q: `Does ${compound !== "unknown" ? compound : "this intervention"} improve sleep?`,
        a: `Based on this ${studyType.toUpperCase()} study published in ${paper.journal}, there is evidence suggesting effects on sleep outcomes. See the full study for details.`,
      },
      {
        q: "What is the recommended dose?",
        a: "Dose information varies by study. Refer to the original publication for specific dosing details.",
      },
      {
        q: "Is this evidence reliable?",
        a: `This is a ${studyType.toUpperCase()} study. ${studyType === "rct" ? "RCTs are considered high-quality evidence." : "More research may be needed to confirm findings."}`,
      },
    ],
    keywords: [compound !== "unknown" ? compound : "sleep", "sleep", studyType, paper.year?.toString() || ""].filter(Boolean),
    studyType,
    sampleSize,
    duration: "See study",
    confidence: studyType === "rct" ? "moderate" : "low",
  };
}

/**
 * Normalize the AI-extracted claim to ensure all fields are valid.
 */
function normalizeExtractedClaim(parsed: Record<string, unknown>, paper: PubMedPaper): ExtractedClaim {
  return {
    text: String(parsed.text || "Unknown claim"),
    summary: String(parsed.summary || paper.abstract.slice(0, 200)),
    intervention: String(parsed.intervention || "Unknown"),
    outcome: String(parsed.outcome || "Sleep outcomes"),
    population: String(parsed.population || "Adults"),
    effectSize: String(parsed.effectSize || "N/A"),
    dose: String(parsed.dose || "See study"),
    mechanism: Array.isArray(parsed.mechanism) ? parsed.mechanism.map(String) : [],
    limitations: Array.isArray(parsed.limitations) ? parsed.limitations.map(String) : ["Limited data"],
    contradictions: Array.isArray(parsed.contradictions) ? parsed.contradictions.map(String) : [],
    faq: Array.isArray(parsed.faq) ? parsed.faq.map((f: Record<string, unknown>) => ({ q: String(f.q || ""), a: String(f.a || "") })) : [],
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords.map(String) : [],
    studyType: (["rct", "meta", "observational", "animal"].includes(String(parsed.studyType)) ? String(parsed.studyType) : "observational") as ExtractedClaim["studyType"],
    sampleSize: Number(parsed.sampleSize) || 0,
    duration: String(parsed.duration || "See study"),
    confidence: (["high", "moderate", "low"].includes(String(parsed.confidence)) ? String(parsed.confidence) : "low") as ExtractedClaim["confidence"],
  };
}

// ============================================================
// Step 2: Claim Deduplication (Graph Merge)
// ============================================================

/**
 * Find a similar existing claim using text similarity.
 * Uses keyword overlap + text similarity for matching.
 *
 * @param extractedClaim The newly extracted claim
 * @returns Match result with similarity score
 */
export function findSimilarClaim(extractedClaim: ExtractedClaim): ClaimMatchResult {
  const existingClaims = getAllClaims();
  const threshold = pipelineConfig.dedup.similarityThreshold;

  let bestMatch: ClaimMatchResult = { matched: false, similarity: 0 };

  for (const existing of existingClaims) {
    const similarity = calculateSimilarity(extractedClaim, existing);

    if (similarity > bestMatch.similarity) {
      bestMatch = {
        matched: similarity >= threshold,
        existingSlug: similarity >= threshold ? existing.slug : undefined,
        similarity,
      };
    }
  }

  return bestMatch;
}

/**
 * DB-aware version of findSimilarClaim — reads from Supabase (production)
 * instead of the static seed array. This is what jobAiParse should call
 * to prevent duplicate claims with different slugs but similar text.
 */
export async function findSimilarClaimDb(extractedClaim: ExtractedClaim): Promise<ClaimMatchResult> {
  const existingClaims = await getAllClaimsDb();
  const threshold = pipelineConfig.dedup.similarityThreshold;

  let bestMatch: ClaimMatchResult = { matched: false, similarity: 0 };

  for (const existing of existingClaims) {
    const similarity = calculateSimilarity(extractedClaim, existing);

    if (similarity > bestMatch.similarity) {
      bestMatch = {
        matched: similarity >= threshold,
        existingSlug: similarity >= threshold ? existing.slug : undefined,
        similarity,
      };
    }
  }

  return bestMatch;
}

/**
 * Calculate similarity between an extracted claim and an existing claim.
 * Uses a weighted combination of:
 * - Text similarity (Jaccard on words)
 * - Keyword overlap
 * - Topic/compound match
 */
function calculateSimilarity(extracted: ExtractedClaim, existing: Claim): number {
  // 1. Text similarity (Jaccard coefficient on word sets)
  const textSim = jaccardSimilarity(
    tokenize(extracted.text),
    tokenize(existing.text)
  );

  // 2. Keyword overlap
  const extractedKeywords = new Set(extracted.keywords.map((k) => k.toLowerCase()));
  const existingKeywords = new Set(existing.keywords.map((k) => k.toLowerCase()));
  const keywordSim = jaccardSimilarity(extractedKeywords, existingKeywords);

  // 3. Topic match (check if they share a compound)
  const extractedText = extracted.text.toLowerCase();
  const existingText = existing.text.toLowerCase();
  let topicMatch = 0;
  for (const compound of Object.keys(compoundTopicMap)) {
    if (extractedText.includes(compound) && existingText.includes(compound)) {
      topicMatch = 1;
      break;
    }
  }

  // Weighted combination: text (40%) + keywords (30%) + topic (30%)
  const weighted = textSim * 0.4 + keywordSim * 0.3 + topicMatch * 0.3;

  return weighted;
}

/**
 * Jaccard similarity coefficient between two sets.
 */
function jaccardSimilarity<T>(setA: Set<T>, setB: Set<T>): number {
  if (setA.size === 0 && setB.size === 0) return 0;

  const intersection = new Set<T>();
  for (const item of setA) {
    if (setB.has(item)) intersection.add(item);
  }

  const union = new Set<T>([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * Tokenize text into a set of lowercase words (excluding stop words).
 */
function tokenize(text: string): Set<string> {
  const stopWords = new Set([
    "the", "a", "an", "in", "on", "at", "to", "for", "of", "and", "or", "is",
    "are", "was", "were", "be", "been", "being", "have", "has", "had", "do",
    "does", "did", "will", "would", "could", "should", "may", "might", "can",
    "this", "that", "these", "those", "with", "from", "by", "as", "it", "its",
    "show", "shows", "showed", "study", "studies", "result", "results",
    "sleep", "patients", "participants", "subjects", "adults",
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  return new Set(words);
}

// ============================================================
// Helper: Detect topic from extracted claim
// ============================================================

export function detectTopicSlug(extractedClaim: ExtractedClaim): string | null {
  const text = (extractedClaim.text + " " + extractedClaim.intervention + " " + extractedClaim.keywords.join(" ")).toLowerCase();

  for (const [compound, info] of Object.entries(compoundTopicMap)) {
    if (text.includes(compound)) {
      return info.slug;
    }
  }

  return null;
}

export function detectCategory(extractedClaim: ExtractedClaim): string {
  const text = (extractedClaim.text + " " + extractedClaim.keywords.join(" ")).toLowerCase();

  for (const [compound, category] of Object.entries(categoryMap)) {
    if (text.includes(compound)) {
      return category;
    }
  }

  return "Supplements";
}
