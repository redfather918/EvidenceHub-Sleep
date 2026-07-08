// EvidenceHub Media Factory (EMF) — Core domain types
//
// Phase 0: the "brain" of the AI Distribution Engine. These types describe
// the content matrix, the planner output (PlannedItem / Schedule), and the
// script draft produced by the Template Engine. They are storage-agnostic;
// the same shapes will later be persisted to Supabase (media_plan, etc.).

// ============================================================
// Platforms & media kinds
// ============================================================

export type Platform =
  | "youtube"
  | "tiktok"
  | "instagram"
  | "pinterest"
  | "x"
  | "linkedin"
  | "reddit"
  | "newsletter";

export type MediaKind = "video" | "short" | "image" | "thread" | "newsletter";

// ============================================================
// Templates (the Template Matrix, §6.3 of the PRD)
// ============================================================

export type TemplateId = "question" | "scientists" | "myth" | "ranking" | "evidence";

export interface TemplateDef {
  id: TemplateId;
  code: "A" | "B" | "C" | "D" | "E";
  name: string;
  description: string;
}

// ============================================================
// Content matrix (§4 of the PRD)
// ============================================================

export interface ContentPillar {
  slug: string; // "foods"
  name: string; // "Foods"
  targetCount: number; // 100 — evergreen items kept in rotation
  items?: string[]; // seed items (demo / fallback); full pool comes from Claim DB
}

export interface ContentCategory {
  slug: string; // "sleep"
  name: string; // "Sleep"
  pillars: ContentPillar[];
}

// ============================================================
// Voice & video production specs (§8 of the PRD)
// ============================================================

export interface VoiceConfig {
  provider: string; // "us-female"
  voice: string; // "A"
  speed: number; // 1.05
}

export interface VideoTimelineSegment {
  start: number; // seconds
  end: number; // seconds
  label: string; // "Hook" | "{Item} PNG" | "Evidence" | "Stars" | "Summary" | "Logo"
}

export interface VideoTemplate {
  totalSeconds: number;
  segments: VideoTimelineSegment[];
}

// ============================================================
// Planner inputs & output
// ============================================================

export interface EvergreenPoolEntry {
  category: string; // "sleep"
  pillar: string; // "foods"
  item: string; // "kiwi"
  claimSlug?: string; // linked claim if available
}

export interface FreshPoolEntry {
  item: string; // "2026 kiwi sleep study" (usually a fresh claim headline)
  claimSlug?: string;
  source?: string; // "pubmed"
}

export type ContentDimension = "evergreen" | "fresh";

export interface PlannedItem {
  date: string; // ISO date (YYYY-MM-DD)
  weekKey: string; // "2026-W28"
  dayKey: string; // "MON"
  category: string; // "sleep"
  pillar: string; // "foods"
  item: string; // "kiwi"
  template: TemplateId; // "scientists"
  templateCode: "A" | "B" | "C" | "D" | "E";
  kind: MediaKind; // "video"
  platforms: Platform[]; // publish targets
  dimension: ContentDimension; // "evergreen" | "fresh"
  fileName: string; // "2026W28_Mon_Foods_Kiwi_TC.mp4"
  claimSlug?: string;
}

export interface ScheduleOptions {
  startDate: string; // ISO date
  days: number; // e.g. 7
  postsPerDay: number; // e.g. 5
  evergreenRatio: number; // 0.8
  evergreenPool: EvergreenPoolEntry[];
  freshPool: FreshPoolEntry[];
  platforms?: Platform[]; // default publish targets
  templateRotation?: TemplateId[]; // order templates are assigned
  kind?: MediaKind; // media kind for produced items
}

export interface Schedule {
  generatedAt: string;
  startDate: string;
  days: number;
  postsPerDay: number;
  evergreenRatio: number;
  items: PlannedItem[];
}

// ============================================================
// Template Engine — script draft
// ============================================================

export interface ScriptClaimContext {
  text?: string;
  summary?: string;
  studyCount?: number;
  rctCount?: number;
  metaCount?: number;
  evidenceScore?: number;
  mechanism?: string[];
  population?: string[];
  limitations?: string[];
}

export interface ScriptInput {
  item: string;
  category?: string; // "sleep"
  pillar?: string; // "foods"
  template: TemplateId;
  kind?: MediaKind;
  claim?: ScriptClaimContext;
}

export interface ScriptDraft {
  template: TemplateId;
  templateCode: "A" | "B" | "C" | "D" | "E";
  kind: MediaKind;
  hook: string;
  body: string[];
  ending: string;
  durationSec?: number;
  voice: VoiceConfig;
}
