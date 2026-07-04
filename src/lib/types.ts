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

// ============================================================
// v2 Production Types — Match packages/database/schema.prisma
// These types align with the 15-table PostgreSQL production schema.
// Used by: Pipeline, API SDK, Evidence Engine, Content Ecosystem.
// ============================================================

// --- Enums (mirror Prisma enums) ---

export type StudyTypeV2 = "rct" | "meta" | "systematic" | "observational" | "animal" | "trial";
export type EvidenceStrength = "strong" | "moderate" | "weak";
export type EffectDirection = "positive" | "negative" | "neutral";
export type ConfidenceLevel = "high" | "moderate" | "low";
export type PopulationFitLevel = "yes" | "check" | "no";
export type ContentChannel = "web" | "faq" | "podcast" | "video" | "twitter" | "linkedin" | "newsletter";
export type ContentStatus = "draft" | "published" | "archived";
export type PipelineStatus = "running" | "success" | "failed" | "partial";
export type ApiKeyStatus = "active" | "suspended" | "revoked";
export type ApiTier = "free" | "pro" | "enterprise";

// --- v2 Table Types ---

export interface TopicV2 {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon?: string;
  claimCount: number;
  seoTitle?: string;
  seoDesc?: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClaimV2 {
  id: string;
  slug: string;
  text: string;
  summary: string;
  category: string;
  topicId?: string;

  // Evidence scoring
  evidenceScore: number;
  confidence: ConfidenceLevel;

  // Study counts
  rctCount: number;
  metaCount: number;
  studyCount: number;

  // v2 upgraded fields
  dose?: string;
  doseRange?: string;
  doseOptimal?: string;
  population: string[];
  limitations: string[];
  mechanism: string[];
  keywords: string[];
  contradictions: string[];
  effectSize?: Record<string, string>;
  relatedSlugs: string[];

  // SEO
  seoTitle?: string;
  seoDesc?: string;

  // Timestamps
  lastUpdated: string;
  createdAt: string;
}

export interface StudyV2 {
  id: string;
  pmid?: string;
  doi?: string;
  title: string;
  abstract?: string;
  journal: string;
  authors: string;
  year?: number;
  sampleSize: number;
  duration?: string;
  intervention?: string;
  outcome?: string;
  effectSize?: string;
  result: string;
  studyType: StudyTypeV2;
  population?: string;
  url?: string;
  strength: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClaimStudyMap {
  id: string;
  claimId: string;
  studyId: string;
  strength: EvidenceStrength;
  effectDirection: EffectDirection;
  note?: string;
  createdAt: string;
}

export interface EvidenceMetric {
  id: string;
  claimId: string;
  rctCount: number;
  metaCount: number;
  cohortCount: number;
  animalCount: number;
  humanEvidenceScore: number;
  consistencyScore: number;
  effectSizeScore: number;
  mechanismScore: number;
  safetyScore: number;
  finalScore: number;
  contradictionPenalty: number;
  computedAt: string;
}

export interface DoseMappingV2 {
  id: string;
  claimId: string;
  compound: string;
  doseRange: string;
  effect: string;
  optimal: boolean;
}

export interface PopulationFitV2 {
  id: string;
  claimId: string;
  group: string;
  fit: PopulationFitLevel;
  note?: string;
}

export interface FAQRow {
  id: string;
  claimId: string;
  question: string;
  answer: string;
  sortOrder: number;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  asin?: string;
  iherbId?: string;
  url?: string;
  imageUrl?: string;
  price?: number;
  currency: string;
  form?: string;
  dosePerServing?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClaimProduct {
  id: string;
  claimId: string;
  productId: string;
  reason?: string;
  matchScore: number;
  createdAt: string;
}

export interface ContentAsset {
  id: string;
  claimId?: string;
  channel: ContentChannel;
  title: string;
  body: string;
  url?: string;
  status: ContentStatus;
  metadata?: Record<string, unknown>;
  createdAt: string;
  publishedAt?: string;
}

export interface Reference {
  id: string;
  claimId: string;
  studyId?: string;
  type: string;
  title: string;
  url: string;
  citation?: string;
  pmid?: string;
  doi?: string;
  createdAt: string;
}

export interface PipelineRun {
  id: string;
  status: PipelineStatus;
  papersFetched: number;
  claimsExtracted: number;
  claimsNew: number;
  claimsUpdated: number;
  claimsSkipped: number;
  errorsCount: number;
  log?: string;
  errorMessage?: string;
  dryRun: boolean;
  aiProvider?: string;
  startedAt: string;
  finishedAt?: string;
}

export interface ApiKey {
  id: string;
  keyHash: string;
  keyPrefix: string;
  name: string;
  email?: string;
  tier: ApiTier;
  status: ApiKeyStatus;
  dailyLimit: number;
  requestsToday: number;
  resetAt?: string;
  createdAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
}

export interface ApiUsageLog {
  id: string;
  apiKeyId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

// --- v2 Composite Types (for API responses with relations) ---

export interface ClaimV2WithRelations extends ClaimV2 {
  topic?: TopicV2;
  evidenceMetric?: EvidenceMetric;
  studies?: (StudyV2 & { strength: EvidenceStrength; effectDirection: EffectDirection })[];
  doseMappings?: DoseMappingV2[];
  populationFits?: PopulationFitV2[];
  faqs?: FAQRow[];
  claimProducts?: (ClaimProduct & { product: Product })[];
  contentAssets?: ContentAsset[];
  references?: Reference[];
}

// --- Content Ecosystem Types ---

export interface ContentGenerationRequest {
  claimId: string;
  channels: ContentChannel[];
  publishImmediately?: boolean;
}

export interface ContentGenerationResult {
  claimId: string;
  generated: {
    channel: ContentChannel;
    title: string;
    body: string;
    status: ContentStatus;
  }[];
}

// --- API Monetization Types ---

export interface CreateApiKeyRequest {
  name: string;
  email?: string;
  tier: ApiTier;
}

export interface CreateApiKeyResponse {
  keyId: string;
  apiKey: string; // Only returned once, never stored in plaintext
  keyPrefix: string;
  tier: ApiTier;
  dailyLimit: number;
}

export interface ApiUsageSummary {
  apiKeyId: string;
  totalRequests: number;
  requestsToday: number;
  dailyLimit: number;
  remainingToday: number;
  averageResponseTime: number;
  topEndpoints: { endpoint: string; count: number }[];
}
