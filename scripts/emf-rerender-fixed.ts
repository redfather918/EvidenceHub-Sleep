#!/usr/bin/env tsx
// Surgical re-render: fix the "frozen-frame / programmatic PPT" visual bug
// WITHOUT re-running LLM / Flux / TTS / Supabase.
//
// For each of the 3 target videos we:
//   1. extract the (correct) narration audio already muxed in the bad video
//   2. rebuild the render manifest with the FIXED video.ts (continuous zoompan)
//   3. render + burn the existing ASS subtitles, overwriting the bad file in place
//
// Run from project root:  node_modules/.bin/tsx scripts/emf-rerender-fixed.ts
import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { buildRenderManifest, renderVideoWithFfmpeg } from "../src/lib/emf/video";

const run = promisify(execFile);

const items = [
  { base: "2026W29_MON_Supplements_Magnesium_TC", png: "magnesium.png" },
  { base: "2026W29_TUE_Exercise_Morning walk_TB", png: "morning walk.png" },
  { base: "2026W29_SAT_Sleep-myths_8-hour myth_TA", png: "8-hour myth.png" },
];

async function main() {
  await mkdir("output/_dev", { recursive: true });
  for (const it of items) {
    const bad = path.join("output/videos", `${it.base}.mp4`);
    const aud = path.join("output/_dev", `${it.base}.m4a`);
    const subtitlePath = path.join("output/subtitles", `${it.base}.ass`);

    console.log(`\n● ${it.base}`);
    console.log(`  extracting audio from existing video...`);
    await run("ffmpeg", ["-y", "-i", bad, "-vn", "-acodec", "copy", aud]);

    // Only the {Item} PNG must resolve through pickImage (label endsWith "_product").
    const assets: any[] = [
      { label: `${it.base}_product`, kind: "card", fallback: `assets/${it.png}` },
    ];
    const tts: any = { audioPath: aud, status: "ok", provider: "reuse" };

    const manifest = await buildRenderManifest(
      {} as any,
      assets,
      tts,
      it.base,
      "output/videos",
      subtitlePath
    );
    console.log(`  rendering with FIXED continuous zoompan (overwrites bad file)...`);
    const res = await renderVideoWithFfmpeg(manifest, "output/videos", true);
    console.log(`  -> status=${res.status} path=${res.videoPath ?? "(none)"}`);
  }
  console.log("\nDone.");
}

main().catch((e) => {
  console.error("[rerender-fixed] FATAL:", e);
  process.exit(1);
});
