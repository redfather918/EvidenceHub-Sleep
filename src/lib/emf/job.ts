// EvidenceHub Media Factory (EMF) — Scheduler job (P1 integration)
//
// Generates the upcoming week's content matrix and persists it to media_plan
// when Supabase is configured. Registered as the `emf` job in scripts/run-job.ts
// so it can run on the same daily cron as the rest of the pipeline.

import { generateSchedule } from "./planner";
import { buildEvergreenPool, FRESH_SEED_ITEMS, CONTENT_MATRIX } from "./taxonomy";
import { upsertScheduleDb, isEmfDbReady } from "./db";

function nextMonday(from: Date): string {
  const d = new Date(from);
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const delta = (8 - day) % 7 || 7;
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

export interface EmfJobResult {
  scheduled: boolean;
  startDate: string;
  items: number;
  inserted?: number;
  errors?: string[];
  reason?: string;
}

export async function jobEmf(opts: { startDate?: string; days?: number } = {}): Promise<EmfJobResult> {
  const start = opts.startDate ?? nextMonday(new Date());
  const schedule = generateSchedule({
    startDate: start,
    days: opts.days ?? 7,
    postsPerDay: 5,
    evergreenRatio: 0.8,
    evergreenPool: buildEvergreenPool(CONTENT_MATRIX),
    freshPool: FRESH_SEED_ITEMS,
  });

  if (isEmfDbReady()) {
    const r = await upsertScheduleDb(schedule);
    return {
      scheduled: true,
      startDate: start,
      items: schedule.items.length,
      inserted: r.inserted,
      errors: r.errors,
    };
  }

  return {
    scheduled: false,
    reason: "Supabase not configured (dry-run; nothing persisted)",
    startDate: start,
    items: schedule.items.length,
  };
}
