// EvidenceHub Sleep — Pipeline Types
// Type definitions for the auto-update pipeline

// ============================================================
// PubMed Paper (raw ingestion output)
// ============================================================

export interface PubMedPaper {
  pmid: string;
  doi?: string;
  title: string;
  abstract: string;
  journal: string;
  authors: string[];
  year?: number;
  publicationDate?: string;
  url: string;
}

// ============================================================
// AI-Extracted Claim (from paper abstract)
// ============================================================

export interface ExtractedClaim {
  text: string;
  summary: string;
  intervention: string;
  outcome: string;
  population: string;
  effectSize: string;
  dose: string;
  mechanism: string[];
  limitations: string[];
  contradictions: string[];
  faq: { q: string; a: string }[];
  keywords: string[];
  studyType: "rct" | "meta" | "observational" | "animal";
  sampleSize: number;
  duration: string;
  confidence: "high" | "moderate" | "low";
}

// ============================================================
// Pipeline processing result
// ============================================================

export interface ClaimMatchResult {
  matched: boolean;
  existingSlug?: string;
  similarity: number;
}

export interface ScoredClaim {
  evidenceScore: number;
  confidence: "high" | "moderate" | "low";
  humanRctScore: number;
  metaScore: number;
  mechanismScore: number;
  safetyScore: number;
  rctCount: number;
  metaCount: number;
  studyCount: number;
}

export interface PipelineResult {
  papersFetched: number;
  claimsExtracted: number;
  claimsCreated: number;
  claimsUpdated: number;
  claimsSkipped: number;
  errors: string[];
  timestamp: string;
}

// ============================================================
// Pipeline config
// ============================================================

export interface PipelineConfig {
  pubmed: {
    apiKey?: string;
    maxResults: number;
    searchTerms: string[];
    dateRangeDays: number;
  };
  ai: {
    provider: "deepseek" | "openai" | "mock";
    apiKey?: string;
    model: string;
    temperature: number;
  };
  scoring: {
    rctWeight: number;
    metaWeight: number;
    humanWeight: number;
    consistencyWeight: number;
    effectSizeWeight: number;
    contradictionPenalty: number;
  };
  dedup: {
    similarityThreshold: number;
  };
  output: {
    seedDataPath: string;
    logPath: string;
  };
  dryRun: boolean;
}
