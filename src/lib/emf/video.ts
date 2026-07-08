// EvidenceHub Media Factory (EMF) — Video Generator (P3)
//
// Builds an ffmpeg render manifest from the fixed 30s timeline + generated
// assets + voice track. When ffmpeg is available on PATH and live mode is on,
// it executes the render; otherwise it returns the manifest (offline-safe).
//
// Cross-platform: the render is executed via execFile("ffmpeg", argsArray)
// (no shell wrapper), so it works on Windows PowerShell / CMD / Git Bash alike.

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir } from "node:fs/promises";
import path from "node:path";
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
  ffmpegArgs: string[];
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

/** Quote a single arg for display only when it contains spaces. */
function quoteForDisplay(a: string): string {
  return /\s/.test(a) ? `"${a}"` : a;
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
  const n = segs.length;

  const args: string[] = ["-y"];

  // Video segment inputs (looped stills, each clipped to its segment length).
  for (const s of segs) {
    args.push("-loop", "1", "-t", String(s.end - s.start), "-i", s.image);
  }

  // Audio: real TTS track when available, otherwise a silent lavfi track so
  // the output is valid for platforms that require an audio stream.
  const hasAudio = Boolean(tts.audioPath);
  if (hasAudio) {
    args.push("-i", tts.audioPath as string);
  } else {
    args.push("-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100:d=30");
  }
  const audioInputIndex = n; // audio is the last input

  // Scale + pad every still to 1080x1920 (9:16), then concat.
  const scaleParts = segs.map(
    (_, i) =>
      `[${i}:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1[v${i}]`
  );
  const concatInputs = segs.map((_, i) => `[v${i}]`).join("");
  const filter = `${scaleParts.join(";")};${concatInputs}concat=n=${n}:v=1:a=0[vout]`;

  args.push("-filter_complex", filter);
  args.push("-map", "[vout]");
  if (hasAudio || true) {
    args.push("-map", `${audioInputIndex}:a`);
  }
  args.push("-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-r", "30");
  args.push(path.join(outDir, `${fileNameBase}.mp4`));

  const ffmpegCommand = `ffmpeg ${args.map(quoteForDisplay).join(" ")}`;

  return {
    fileName: `${fileNameBase}.mp4`,
    durationSec: DEFAULT_VIDEO_TEMPLATE.totalSeconds,
    audio: tts.audioPath,
    segments: segs,
    ffmpegArgs: args,
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
    await mkdir(outDir, { recursive: true });
    // Cross-platform: invoke ffmpeg directly with an argv array (no shell).
    await promisify(execFile)("ffmpeg", manifest.ffmpegArgs);
    const videoPath = path.join(outDir, manifest.fileName);
    return { status: "rendered", command: manifest.ffmpegCommand, videoPath };
  } catch (err) {
    console.warn(`  [Video] render failed: ${String(err)}`);
    return { status: "manifest", command: manifest.ffmpegCommand };
  }
}
