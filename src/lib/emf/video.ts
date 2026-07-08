// EvidenceHub Media Factory (EMF) — Video Generator (P3)
//
// Builds an ffmpeg render manifest from the fixed 30s timeline + generated
// assets + voice track. When ffmpeg is available on PATH and live mode is on,
// it executes the render; otherwise it returns the manifest (offline-safe).
//
// Cross-platform: the render is executed via execFile("ffmpeg", argsArray)
// (no shell wrapper), so it works on Windows PowerShell / CMD / Git Bash alike.
//
// Subtitle burning uses a two-pass approach to avoid Windows path escaping
// issues inside filter_complex strings:
//   Pass 1: concat stills + audio → _<name>.phase1.mp4
//   Pass 2: burn SRT subtitles onto Pass 1 output → <name>.mp4

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, unlink } from "node:fs/promises";
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
  /** SRT path if subtitles were generated; undefined means no subtitles. */
  subtitlePath?: string;
  /** Intermediate pass-1 output (still cards + audio, before subtitle burn). */
  phase1Path: string;
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
    case "Summary":
      return "assets/summary.png";
    case "Logo":
      return "assets/logo.png";
    default:
      return "assets/hook.png";
  }
}

/** Probe media duration (seconds) via ffprobe; returns null on failure. */
export async function getMediaDuration(filePath: string): Promise<number | null> {
  try {
    const out = await promisify(execFile)("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);
    const d = parseFloat((out.stdout ?? "").toString().trim());
    return Number.isFinite(d) && d > 0 ? d : null;
  } catch {
    return null;
  }
}

/** Quote a single arg for display only when it contains spaces. */
function quoteForDisplay(a: string): string {
  return /\s/.test(a) ? `"${a}"` : a;
}

export async function buildRenderManifest(
  draft: ScriptDraft,
  assets: AssetSpec[],
  tts: TtsResult,
  fileNameBase: string,
  outDir = "output/videos",
  subtitlePath?: string | null
): Promise<RenderManifest> {
  const templateSegs = DEFAULT_VIDEO_TEMPLATE.segments;
  const templateTotal = DEFAULT_VIDEO_TEMPLATE.totalSeconds;

  // Drive the timeline from the narration so there is never a silent tail.
  let totalDuration = templateTotal;
  const audioDur = tts.audioPath ? await getMediaDuration(tts.audioPath) : null;
  if (audioDur && audioDur > 0) totalDuration = audioDur;
  const scale = totalDuration / templateTotal;

  const segs: RenderSegment[] = templateSegs.map((seg) => ({
    label: seg.label,
    image: pickImage(seg.label, assets),
    start: Math.round(seg.start * scale * 100) / 100,
    end: Math.round(seg.end * scale * 100) / 100,
  }));
  const n = segs.length;

  // ---- Phase 1: concat still images + audio into intermediate MP4 ----
  const args: string[] = ["-y"];

  for (const s of segs) {
    args.push("-loop", "1", "-t", String(Math.max(0.1, s.end - s.start)), "-i", s.image);
  }

  const hasAudio = Boolean(tts.audioPath) && Boolean(audioDur);
  if (hasAudio) {
    args.push("-i", tts.audioPath as string);
  } else {
    args.push("-f", "lavfi", "-i", `anullsrc=channel_layout=stereo:sample_rate=44100:d=${templateTotal}`);
  }
  const audioInputIndex = n;

  const scaleParts = segs.map(
    (_, i) =>
      `[${i}:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1[v${i}]`
  );
  const concatInputs = segs.map((_, i) => `[v${i}]`).join("");
  const filter = `${scaleParts.join(";")};${concatInputs}concat=n=${n}:v=1:a=0[vout]`;

  args.push("-filter_complex", filter);
  args.push("-map", "[vout]");
  args.push("-map", `${audioInputIndex}:a`);
  args.push("-shortest");
  args.push("-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-r", "30");

  const phase1Path = path.join(outDir, `_${fileNameBase}.phase1.mp4`);
  args.push(phase1Path);

  const ffmpegCommand = `ffmpeg ${args.map(quoteForDisplay).join(" ")}`;

  return {
    fileName: `${fileNameBase}.mp4`,
    durationSec: totalDuration,
    audio: tts.audioPath,
    segments: segs,
    subtitlePath: subtitlePath ?? undefined,
    phase1Path,
    ffmpegArgs: args,
    ffmpegCommand,
  };
}

/** Build Phase 2 args: burn ASS subtitles onto the phase-1 video.
 *  The assPath must be a RELATIVE path from process.cwd() — absolute Windows
 *  paths with drive letters (C:\...) break the libass filter parser.
 *
 *  NOTE: We deliberately do NOT pass `force_style=` here. This ffmpeg build's
 *  `ass` filter rejects the `force_style` option ("Option not found"), which
 *  aborts the render. All styling (font size, colour, box, bold, position) is
 *  instead defined in the ASS file's [V4+ Styles] section, which libass applies
 *  reliably. Keep the two in sync via subtitles.ts.
 */
function buildSubtitleBurnArgs(
  phase1Path: string,
  assRelPath: string,
  finalPath: string
): string[] {
  return [
    "-y",
    "-i", phase1Path,
    "-vf", `ass='${assRelPath}'`,
    "-c:v", "libx264", "-pix_fmt", "yuv420p",
    "-c:a", "copy",
    finalPath,
  ];
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

    // Phase 1: render still cards + audio.
    await promisify(execFile)("ffmpeg", manifest.ffmpegArgs, { cwd: process.cwd() });

    // Validate phase 1 output.
    if (!(await isMp4Valid(manifest.phase1Path))) {
      console.warn(`  [Video] phase-1 output corrupt`);
      throw new Error("corrupt phase-1 mp4");
    }

    // Phase 2: burn subtitles (if available).
    const finalPath = path.join(outDir, manifest.fileName);
    if (manifest.subtitlePath) {
      // Pass a path RELATIVE to cwd: absolute Windows paths with a drive-letter
      // colon (C:\...) break the libass filter parser even inside single quotes.
      const assRel = path.relative(process.cwd(), manifest.subtitlePath).replace(/\\/g, "/");
      const subArgs = buildSubtitleBurnArgs(manifest.phase1Path, assRel, finalPath);
      await promisify(execFile)("ffmpeg", subArgs, { cwd: process.cwd() });

      // Clean up intermediate file.
      try { await unlink(manifest.phase1Path); } catch { /* ignore */ }

      if (!(await isMp4Valid(finalPath))) {
        throw new Error("corrupt final mp4 after subtitle burn");
      }
      return { status: "rendered", command: manifest.ffmpegCommand + " + subtitles", videoPath: finalPath };
    }

    // No subtitles — rename phase 1 to final name.
    const fs = await import("node:fs/promises");
    await fs.rename(manifest.phase1Path, finalPath);
    return { status: "rendered", command: manifest.ffmpegCommand, videoPath: finalPath };
  } catch (err) {
    console.warn(`  [Video] render failed: ${String(err)}`);
    return { status: "manifest", command: manifest.ffmpegCommand };
  }
}

/** True if the file is a readable mp4 with a video stream and positive duration. */
export async function isMp4Valid(filePath: string): Promise<boolean> {
  try {
    const out = await promisify(execFile)("ffprobe", [
      "-v", "error",
      "-show_entries", "stream=codec_type:format=duration",
      "-of", "json",
      filePath,
    ]);
    const data = JSON.parse((out.stdout ?? "{}").toString());
    const dur = parseFloat(data?.format?.duration);
    const hasVideo = (data?.streams ?? []).some((s: any) => s.codec_type === "video");
    return hasVideo && Number.isFinite(dur) && dur > 0;
  } catch {
    return false;
  }
}
