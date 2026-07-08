// EvidenceHub Media Factory (EMF) — Production orchestrator (P1 → P3)
//
// End-to-end for each planned item:
//   script (LLM/deterministic) → assets (Flux/spec) → TTS → video manifest/rendered
// and persists to Supabase when configured + live. Dry-run (default) stays
// fully offline and emits a ProductionPackage per item.

import type { Schedule, PlannedItem, ScriptDraft } from "./types";
import { generateScriptWithLLM } from "./llm";
import { buildAssetSpecs, generateAssetsWithFlux, renderSvgCards, type FluxResult } from "./assets";
import { synthesizeVoice, EDGE_VOICE_POOL } from "./tts";
import { buildRenderManifest, renderVideoWithFfmpeg, isMp4Valid } from "./video";
import { writeAssFile } from "./subtitles";
import { upsertScheduleDb, upsertMediaAssetDb, upsertRenderJobDb, isEmfDbReady } from "./db";

export interface MediaGenOptions {
  live?: boolean;
  limit?: number;
}

export interface ProductionPackage {
  plan: PlannedItem;
  script: ScriptDraft;
  assets: FluxResult[];
  tts: { text: string; status: string; audioPath?: string };
  render: { fileName: string; status: string; command: string; videoPath?: string };
  persisted: { mediaPlan: boolean; mediaAsset: boolean; renderJob: boolean };
}

export async function generateMediaForSchedule(
  schedule: Schedule,
  opts: MediaGenOptions = {}
): Promise<ProductionPackage[]> {
  const items = opts.limit && opts.limit > 0 ? schedule.items.slice(0, opts.limit) : schedule.items;
  const dbReady = isEmfDbReady();

  if (opts.live && dbReady) {
    const r = await upsertScheduleDb(schedule);
    console.log(`  [DB] media_plan upsert: ${r.inserted} inserted, ${r.errors.length} errors`);
  }

  const packages: ProductionPackage[] = [];

  for (const item of items) {
    const idx = items.indexOf(item);
    // Rotate English Edge TTS voices so videos don't sound monotone.
    const voiceId = EDGE_VOICE_POOL[idx % EDGE_VOICE_POOL.length];

    const script = await generateScriptWithLLM({
      item: item.item,
      category: item.category === "fresh" ? undefined : item.category,
      pillar: item.category === "fresh" ? undefined : item.pillar,
      template: item.template,
      kind: item.kind,
    });

    const assetSpecs = buildAssetSpecs(item.item, item.templateCode);
    const assets = await generateAssetsWithFlux(assetSpecs, { live: opts.live });

    // Materialize professional SVG info-card PNGs (key-less, free).
    if (opts.live) {
      const w = await renderSvgCards(
        assetSpecs,
        {
          hook: script.hook,
          item: item.item,
          evidence: script.body.slice(0, 2).join(" "),
          ending: script.ending,
        },
        process.cwd()
      );
      if (w > 0) console.log(`  [Assets] rendered ${w} SVG card(s) for ${item.item}`);
    }

    const narration = [script.hook, ...script.body, script.ending].join(". ");
    const tts = await synthesizeVoice(narration, script.voice, { live: opts.live, outDir: "output/audio", voiceId });

    const baseName = item.fileName.replace(/\.[^.]+$/, "");

    // Generate SRT subtitles from script (time-aligned to audio duration).
    let subtitlePath: string | null = null;
    if (opts.live && tts.audioPath) {
      try {
        const { getMediaDuration } = await import("./video");
        const audioDur = await getMediaDuration(tts.audioPath);
        if (audioDur && audioDur > 0) {
          subtitlePath = await writeAssFile(script, audioDur, baseName, "output/subtitles");
        }
      } catch (e) {
        console.warn(`  [Subtitles] probe failed: ${String(e)}`);
      }
    }

    const manifest = await buildRenderManifest(script, assetSpecs, tts, baseName, "output/videos", subtitlePath);
    let render = await renderVideoWithFfmpeg(manifest, "output/videos", Boolean(opts.live));

    // Safety net: if the audio-backed render failed/corrupted, retry once with
    // a silent track so we never emit a broken mp4. (Mainly defends the local
    // Windows SAPI fallback; on the server edge-tts audio is always valid.)
    if (Boolean(opts.live) && render.status !== "rendered" && tts.audioPath) {
      console.warn(`  [Video] retrying ${item.item} with silent audio`);
      const silentTts = { ...tts, audioPath: undefined };
      const silentManifest = await buildRenderManifest(script, assetSpecs, silentTts, baseName, "output/videos", subtitlePath);
      render = await renderVideoWithFfmpeg(silentManifest, "output/videos", true);
    }

    const persisted = { mediaPlan: Boolean(opts.live && dbReady), mediaAsset: false, renderJob: false };
    if (opts.live && dbReady) {
      persisted.mediaAsset = await upsertMediaAssetDb(item.fileName, assets);
      persisted.renderJob = await upsertRenderJobDb(item.fileName, manifest, render.status);
    }

    packages.push({
      plan: item,
      script,
      assets,
      tts: { text: narration, status: tts.status, audioPath: tts.audioPath },
      render: {
        fileName: manifest.fileName,
        status: render.status,
        command: render.command,
        videoPath: render.videoPath,
      },
      persisted,
    });
  }

  return packages;
}
