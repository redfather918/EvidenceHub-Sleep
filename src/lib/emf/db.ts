// EvidenceHub Media Factory (EMF) — DB persistence (P1 / P2 / P3)
//
// Persists the planner output and generated media to Supabase. All functions
// degrade gracefully when Supabase is not configured (isDbMode() === false):
// they return boolean/empty results instead of throwing, so the engine keeps
// working offline. Mirrors the upsert style used in src/lib/db.ts.

import { getSupabase, isSupabaseConfigured } from "../supabase";
import type { Schedule, PlannedItem } from "./types";
import type { FluxResult } from "./assets";
import type { RenderManifest } from "./video";

export function isEmfDbReady(): boolean {
  return isSupabaseConfigured;
}

function toRow(item: PlannedItem) {
  return {
    id: item.fileName,
    week_key: item.weekKey,
    day_key: item.dayKey,
    category: item.category,
    pillar: item.pillar,
    item: item.item,
    template: item.template,
    template_code: item.templateCode,
    kind: item.kind,
    platforms: item.platforms,
    dimension: item.dimension,
    file_name: item.fileName,
    claim_slug: item.claimSlug ?? null,
    status: "planned",
  };
}

function rowToItem(r: Record<string, any>): PlannedItem {
  return {
    date: "",
    weekKey: r.week_key,
    dayKey: r.day_key,
    category: r.category,
    pillar: r.pillar,
    item: r.item,
    template: r.template,
    templateCode: r.template_code,
    kind: r.kind,
    platforms: Array.isArray(r.platforms) ? r.platforms : [],
    dimension: r.dimension,
    fileName: r.file_name,
    claimSlug: r.claim_slug ?? undefined,
  };
}

/** Upsert a whole schedule into media_plan (chunked). */
export async function upsertScheduleDb(schedule: Schedule): Promise<{ inserted: number; errors: string[] }> {
  const sb = getSupabase();
  if (!sb) return { inserted: 0, errors: ["Supabase not configured"] };
  const rows = schedule.items.map(toRow);
  const errors: string[] = [];
  let inserted = 0;
  const chunkSize = 100;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await sb.from("media_plan").upsert(chunk, { onConflict: "id" });
    if (error) errors.push(error.message);
    else inserted += chunk.length;
  }
  return { inserted, errors };
}

/** Load a week's planned items from media_plan. */
export async function loadScheduleDb(weekKey: string): Promise<PlannedItem[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("media_plan").select("*").eq("week_key", weekKey);
  if (error || !data) return null;
  return data.map(rowToItem);
}

/** Load a single planned item by its file_name (primary key). */
export async function getPlanItemDb(fileName: string): Promise<PlannedItem | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("media_plan").select("*").eq("file_name", fileName).maybeSingle();
  if (error || !data) return null;
  return rowToItem(data as Record<string, any>);
}

/** Upsert generated assets for a plan item. */
export async function upsertMediaAssetDb(mediaPlanId: string, assets: FluxResult[]): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const rows = assets.map((a) => ({
    media_plan_id: mediaPlanId,
    label: a.spec.label,
    type: a.spec.type,
    source: a.url ?? a.spec.fallback,
    status: a.status,
  }));
  const { error } = await sb.from("media_asset").upsert(rows, { onConflict: "media_plan_id,label" });
  return !error;
}

/** Upsert a render job (manifest / output) for a plan item. */
export async function upsertRenderJobDb(
  mediaPlanId: string,
  manifest: RenderManifest,
  status: string
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from("media_render_job").upsert(
    {
      media_plan_id: mediaPlanId,
      script_json: null,
      assets_json: null,
      ffmpeg_command: manifest.ffmpegCommand,
      video_path: status === "rendered" ? manifest.fileName : null,
      status,
    },
    { onConflict: "media_plan_id" }
  );
  return !error;
}

/** Record a successful platform publish (publish_queue) + mark plan published. */
export async function markPublishedDb(
  fileName: string,
  platform: string,
  url: string
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error: qErr } = await sb.from("publish_queue").upsert(
    { media_plan_id: fileName, platform, status: "posted", posted_at: new Date().toISOString(), url },
    { onConflict: "media_plan_id,platform" }
  );
  if (qErr) return false;
  const { error: pErr } = await sb
    .from("media_plan")
    .update({ status: "published", updated_at: new Date().toISOString() })
    .eq("file_name", fileName);
  return !pErr;
}
