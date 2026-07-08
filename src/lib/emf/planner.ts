// EvidenceHub Media Factory (EMF) — Content Planner
//
// The "brain" of the distribution engine (PRD §3.2 / §7). Given a start date
// and the evergreen + fresh pools, it produces a deterministic day-by-day
// content matrix:
//   - 80% evergreen (cyclic rotation of category → pillar → item → template)
//   - 20% fresh (from the daily PubMed-derived pool)
//
// Determinism matters: the same (startDate, pools, config) always yields the
// same schedule, so runs are reproducible and auditable. No RNG.

import type {
  Schedule,
  ScheduleOptions,
  PlannedItem,
  TemplateId,
  MediaKind,
  Platform,
} from "./types";
import { TEMPLATE_BY_ID } from "./taxonomy";
import {
  DEFAULT_PLATFORMS,
  DEFAULT_TEMPLATE_ROTATION,
  DEFAULT_SCHEDULE_CONFIG,
} from "./config";

const DAY_KEYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

const EXT_BY_KIND: Record<MediaKind, string> = {
  video: "mp4",
  short: "mp4",
  image: "png",
  thread: "md",
  newsletter: "md",
};

/** ISO week number + year, e.g. { year: 2026, week: 28 }. */
export function isoWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // Mon=0
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // nearest Thursday
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((d.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7
    );
  return { year: d.getUTCFullYear(), week };
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function dayKey(date: Date): string {
  return DAY_KEYS[date.getDay()];
}

function fileNameFor(opts: {
  weekYear: number;
  week: number;
  day: string;
  pillar: string;
  item: string;
  templateCode: string;
  kind: MediaKind;
}): string {
  const pillar = capitalize(opts.pillar);
  const item = capitalize(opts.item);
  return `${opts.weekYear}W${pad2(opts.week)}_${opts.day}_${pillar}_${item}_T${opts.templateCode}.${EXT_BY_KIND[opts.kind]}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Generate a deterministic multi-day content schedule.
 *
 * Evergreen posts rotate through the pool; each evergreen post is assigned the
 * next template in `templateRotation`, so every item naturally cycles through
 * all templates (built-in A/B test). The last `floor(postsPerDay*(1-ratio))`
 * posts each day are fresh.
 */
export function generateSchedule(options: ScheduleOptions): Schedule {
  const {
    startDate,
    days,
    postsPerDay,
    evergreenRatio,
    evergreenPool,
    freshPool,
    platforms = DEFAULT_PLATFORMS,
    templateRotation = DEFAULT_TEMPLATE_ROTATION,
    kind = DEFAULT_SCHEDULE_CONFIG.kind,
  } = options;

  const evergreenCount = Math.max(0, Math.floor(postsPerDay * evergreenRatio));
  const freshPerDay = Math.max(0, postsPerDay - evergreenCount);

  const items: PlannedItem[] = [];
  let evergreenIdx = 0; // monotonic counter → stable rotation across days
  let freshIdx = 0;

  const start = new Date(`${startDate}T00:00:00`);

  for (let d = 0; d < days; d++) {
    const date = new Date(start);
    date.setDate(start.getDate() + d);
    const iso = date.toISOString().slice(0, 10);
    const { year: weekYear, week } = isoWeek(date);
    const dKey = dayKey(date);
    const weekKey = `${weekYear}-W${pad2(week)}`;

    for (let p = 0; p < postsPerDay; p++) {
      const isFresh = p >= evergreenCount;

      if (isFresh && freshPool.length > 0) {
        const fresh = freshPool[freshIdx % freshPool.length];
        freshIdx++;
        // Fresh posts always use the "scientists"/evidence angle for credibility.
        const tpl: TemplateId = "scientists";
        const tplDef = TEMPLATE_BY_ID[tpl];
        items.push({
          date: iso,
          weekKey,
          dayKey: dKey,
          category: "fresh",
          pillar: "study",
          item: fresh.item,
          template: tpl,
          templateCode: tplDef.code,
          kind,
          platforms,
          dimension: "fresh",
          fileName: fileNameFor({
            weekYear,
            week,
            day: dKey,
            pillar: "Study",
            item: fresh.item,
            templateCode: tplDef.code,
            kind,
          }),
          claimSlug: fresh.claimSlug,
        });
      } else {
        const ev = evergreenPool[evergreenIdx % evergreenPool.length];
        const tpl = templateRotation[evergreenIdx % templateRotation.length];
        evergreenIdx++;
        const tplDef = TEMPLATE_BY_ID[tpl];
        items.push({
          date: iso,
          weekKey,
          dayKey: dKey,
          category: ev.category,
          pillar: ev.pillar,
          item: ev.item,
          template: tpl,
          templateCode: tplDef.code,
          kind,
          platforms,
          dimension: "evergreen",
          fileName: fileNameFor({
            weekYear,
            week,
            day: dKey,
            pillar: ev.pillar,
            item: ev.item,
            templateCode: tplDef.code,
            kind,
          }),
          claimSlug: ev.claimSlug,
        });
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    startDate,
    days,
    postsPerDay,
    evergreenRatio,
    items,
  };
}

/** Convenience: summarize a schedule (counts by dimension / template). */
export function summarizeSchedule(schedule: Schedule): {
  total: number;
  evergreen: number;
  fresh: number;
  byTemplate: Record<string, number>;
} {
  const byTemplate: Record<string, number> = {};
  let evergreen = 0;
  let fresh = 0;
  for (const it of schedule.items) {
    byTemplate[it.template] = (byTemplate[it.template] ?? 0) + 1;
    if (it.dimension === "evergreen") evergreen++;
    else fresh++;
  }
  return { total: schedule.items.length, evergreen, fresh, byTemplate };
}
