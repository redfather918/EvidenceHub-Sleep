// EvidenceHub Media Factory (EMF) — targeted subtitle re-burn
//
// Re-renders a single already-generated video with a NEW subtitle font size
// (read from src/lib/emf/subtitles.ts + video.ts) WITHOUT re-running the LLM
// script generator or TTS. The exact narration and timing are reconstructed
// from the existing .ass file, and the existing assets/*.png + narration wav
// are reused. Useful for tweaking subtitle styling after a render.
//
// Usage: tsx scripts/emf-reburn.ts

import { readFileSync } from "node:fs";
import type { ScriptDraft } from "../src/lib/emf/types";
import { DEFAULT_VOICE } from "../src/lib/emf/config";
import { writeAssFile } from "../src/lib/emf/subtitles";
import {
  buildRenderManifest,
  renderVideoWithFfmpeg,
  getMediaDuration,
} from "../src/lib/emf/video";

const BASE = "2026W28_SUN_Foods_Kiwi_TA";
const AUDIO = "output/audio/voice_1783553973401_a0.wav";

/** Reconstruct the ScriptDraft from an existing ASS file so text + timing
 *  (and therefore the subtitle cue list) are reproduced exactly. */
function reconstructScriptFromAss(assPath: string): ScriptDraft {
  const raw = readFileSync(assPath, "utf-8");
  const lines = raw
    .split("\n")
    .filter((l) => l.startsWith("Dialogue:"));
  const texts = lines.map((l) => l.substring(l.lastIndexOf(",,") + 2).trim());
  const clean = texts.map((t) => t.replace(/\\N/g, " "));

  const hook = clean[0];
  const ending = clean[clean.length - 1];
  const body = clean.slice(1, -1);

  return {
    template: "question",
    templateCode: "A",
    kind: "video",
    hook,
    body,
    ending,
    voice: DEFAULT_VOICE,
  };
}

async function main() {
  const script = reconstructScriptFromAss(`output/subtitles/${BASE}.ass`);

  const audioDur = await getMediaDuration(AUDIO);
  if (!audioDur || audioDur <= 0) {
    throw new Error(`Could not probe audio duration for ${AUDIO}`);
  }
  console.log(`  [Reburn] audio duration = ${audioDur.toFixed(2)}s`);

  // Regenerate the ASS with the (now larger) font size baked into subtitles.ts.
  const subtitlePath = await writeAssFile(script, audioDur, BASE, "output/subtitles");
  if (!subtitlePath) throw new Error("subtitle generation failed");
  console.log(`  [Reburn] subtitle file → ${subtitlePath}`);

  const tts = {
    text: [script.hook, ...script.body, script.ending].join(". "),
    status: "ok",
    audioPath: AUDIO,
  };

  // Minimal asset specs — only the product card needs a label match so
  // pickImage() resolves "kiwi.png"; the rest are hardcoded in pickImage().
  const assets = [{ label: "kiwi_product", fallback: "assets/kiwi.png" }];

  const manifest = await buildRenderManifest(
    script as any,
    assets as any,
    tts as any,
    BASE,
    "output/videos",
    subtitlePath
  );

  const render = await renderVideoWithFfmpeg(manifest, "output/videos", true);
  console.log(`  [Reburn] status = ${render.status}; video = ${render.videoPath ?? "(none)"}`);
  if (render.status !== "rendered") process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
