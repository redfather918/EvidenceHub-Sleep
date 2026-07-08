// EvidenceHub Media Factory (EMF) — Video Generator (P3)
//
// Builds an ffmpeg render manifest from the fixed 30s timeline + generated
// assets + voice track. When ffmpeg is available on PATH and live mode is on,
// it executes the render; otherwise it returns the manifest (offline-safe).

import type { ScriptDraft } from "./types";
import type { AssetSpec } from "./assets";
import type { TtsResult } from "./tts";
import { DEFAULT_VIDEO_TEMPLATE } from "./config";

export interface RenderSegment {
  label: string;
  image: string;
  start: number;
  end: number;
}

export interface RenderManifest {
  fileName: string;
  durationSec: number;
  audio?: string;
  segments: RenderSegment[];
  ffmpegCommand: string;
}

function pickImage(label: string, assets: AssetSpec[]): string {
  switch (label) {
    case "{Item} PNG":
      return assets.find((a) => a.label.endsWith("_product"))?.fallback ?? "assets/hook.png";
    case "Evidence":
      return "assets/evidence.png";
    case "Stars":
      return "assets/stars.png";
    case "Logo":
      return "assets/logo.png";
    default:
      return "assets/hook.png";
  }
}

export function buildRenderManifest(
  draft: ScriptDraft,
  assets: AssetSpec[],
  tts: TtsResult,
  fileNameBase: string,
  outDir = "output/videos"
): RenderManifest {
  const segs: RenderSegment[] = DEFAULT_VIDEO_TEMPLATE.segments.map((seg) => ({
    label: seg.label,
    image: pickImage(seg.label, assets),
    start: seg.start,
    end: seg.end,
  }));

  const inputs = segs.map((s) => `-loop 1 -t ${s.end - s.start} -i ${s.image}`).join(" ");
  const scale = segs
    .map((_, i) => `[${i}:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1[v${i}]`)
    .join(";");
  const concat = segs.map((_, i) => `[v${i}]`).join("");
  const audioInput = tts.audioPath ? `-i ${tts.audioPath}` : "";
  const audioMap = tts.audioPath ? ` -map ${segs.length}:a` : "";

  const ffmpegCommand =
    `ffmpeg -y ${inputs} ${audioInput} ` +
    `-filter_complex "${scale};${concat}concat=n=${segs.length}:v=1:a=0[vout]" ` +
    `-map "[vout]"${audioMap} -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest ${outDir}/${fileNameBase}.mp4`;

  return {
    fileName: `${fileNameBase}.mp4`,
    durationSec: DEFAULT_VIDEO_TEMPLATE.totalSeconds,
    audio: tts.audioPath,
    segments: segs,
    ffmpegCommand,
  };
}

export interface RenderResult {
  status: "manifest" | "rendered";
  command: string;
  videoPath?: string;
}

async function hasFfmpeg(): Promise<boolean> {
  try {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    await promisify(execFile)("ffmpeg", ["-version"]);
    return true;
  } catch {
    return false;
  }
}

export async function renderVideoWithFfmpeg(
  manifest: RenderManifest,
  outDir = "output/videos",
  live = false
): Promise<RenderResult> {
  if (!live || !(await hasFfmpeg())) {
    return { status: "manifest", command: manifest.ffmpegCommand };
  }
  try {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const fs = await import("node:fs/promises");
    await fs.mkdir(outDir, { recursive: true });
    await promisify(execFile)("bash", ["-lc", manifest.ffmpegCommand]);
    return { status: "rendered", command: manifest.ffmpegCommand, videoPath: `${outDir}/${manifest.fileName}` };
  } catch (err) {
    console.warn(`  [Video] render failed: ${String(err)}`);
    return { status: "manifest", command: manifest.ffmpegCommand };
  }
}
