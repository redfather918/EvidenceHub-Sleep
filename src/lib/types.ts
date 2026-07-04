// EvidenceHub Sleep — Type Definitions

export interface Claim {
  id: string;
  slug: string;
  text: string;
  summary: string;
  category: string;
  topicSlug: string;

  // Evidence scoring
  evidenceScore: number;
  humanRctScore: number;
  metaScore: number;
  mechanismScore: number;
  safetyScore: number;
  confidence: "high" | "moderate" | "low";

  // Counts
  rctCount: number;
  metaCount: number;
  studyCount: number;

  // Details
  dose: string;
  population: string[];
  limitations: string[];
  mechanism: string[];
  faq: FAQItem[];
  relatedSlugs: string[];

  // SEO
  keywords: string[];

  // Timestamps
  lastUpdated: string;
  createdAt: string;
}

export interface Study {
  id: string;
  pmid?: string;
  doi?: string;
  title: string;
  journal: string;
  authors: string;
  year?: number;
  sampleSize: number;
  duration?: string;
  intervention?: string;
  outcome?: string;
  effectSize?: string;
  result: string;
  studyType: "rct" | "meta" | "observational" | "animal";
  population?: string;
  url?: string;
  strength?: number; // evidence link strength 1-5
}

export interface FAQItem {
  q: string;
  a: string;
}

export interface Topic {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon?: string;
  claimCount: number;
}

export interface DoseMapping {
  compound: string;
  doseRange: string;
  effect: string;
  optimal: boolean;
}

export interface PopulationFit {
  group: string;
  fit: "yes" | "check" | "no";
  note?: string;
}

export interface ClaimWithRelations extends Claim {
  studies: Study[];
  doseMappings: DoseMapping[];
  populationFits: PopulationFit[];
  relatedClaims: Claim[];
  topic?: Topic;
}

// API response types
export interface ClaimApiResponse {
  slug: string;
  text: string;
  confidence: number;
  confidenceLevel: string;
  rcts: number;
  meta: number;
  dose: string;
  population: string[];
  evidenceScore: number;
  lastUpdated: string;
}

export interface EvidenceApiResponse {
  topic: string;
  summary: string;
  strength: string;
  studies: number;
  claims: { slug: string; text: string; score: number }[];
}
