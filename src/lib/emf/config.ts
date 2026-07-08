// EvidenceHub Media Factory (EMF) — Default production config
//
// Centralizes the fixed production specs from the PRD (§8): voice, video
// timeline, default platforms, and the evergreen/fresh split. Keep these as
// the single source of truth so Planner / Template Engine stay consistent.

import type {
  Platform,
  MediaKind,
  VoiceConfig,
  VideoTemplate,
  TemplateId,
} from "./types";

// §8.1 — Voice is fixed forever (US Female / Voice A / 1.05x).
export const DEFAULT_VOICE: VoiceConfig = {
  provider: "us-female",
  voice: "A",
  speed: 1.05,
};

// §8.2 — Fixed 30s video timeline. Every video shares this structure.
export const DEFAULT_VIDEO_TEMPLATE: VideoTemplate = {
  totalSeconds: 30,
  segments: [
    { start: 0, end: 2, label: "Hook" },
    { start: 2, end: 6, label: "{Item} PNG" },
    { start: 6, end: 14, label: "Evidence" },
    { start: 14, end: 22, label: "Stars" },
    { start: 22, end: 28, label: "Summary" },
    { start: 28, end: 30, label: "Logo" },
  ],
};

// Default publish targets when a PlannedItem does not override them.
export const DEFAULT_PLATFORMS: Platform[] = [
  "youtube",
  "tiktok",
  "instagram",
  "x",
  "pinterest",
];

// §8.3 — Default posting hours per platform (24h).
export const DEFAULT_PUBLISH_HOURS: Record<Platform, number[]> = {
  tiktok: [8, 10, 12, 14, 16, 18, 20],
  youtube: [9, 11, 13, 15, 17, 19, 21],
  instagram: [9, 12, 15, 18, 20, 21],
  pinterest: [10, 13, 16, 19, 21],
  x: [8, 11, 13, 15, 17, 19, 21, 22],
  linkedin: [9, 12, 15, 17],
  reddit: [10, 14, 18, 21],
  newsletter: [8, 18],
};

// Which media kind each platform primarily consumes.
export const PLATFORM_KIND_MAP: Record<Platform, MediaKind> = {
  youtube: "video",
  tiktok: "short",
  instagram: "short",
  pinterest: "image",
  x: "thread",
  linkedin: "thread",
  reddit: "thread",
  newsletter: "newsletter",
};

// §6.3 / §7 — Template rotation order used by the Planner.
export const DEFAULT_TEMPLATE_ROTATION: TemplateId[] = [
  "question",
  "scientists",
  "myth",
  "ranking",
  "evidence",
];

// §7 — Schedule split: 80% evergreen, 20% fresh.
export const DEFAULT_SCHEDULE_CONFIG = {
  postsPerDay: 5,
  evergreenRatio: 0.8,
  kind: "video" as MediaKind,
};
