// EvidenceHub Media Factory (EMF) — Subtitle Generator
//
// Generates timed subtitle files in ASS format (compatible with ffmpeg's
// libass-based `ass` video filter). Uses relative paths so the filter can
// locate the file without Windows drive-letter escaping issues.
//
// Style: large white bold text, black outline, semi-transparent dark
// background box, bottom-centered — readable on mobile at 9:16.

import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { ScriptDraft } from "./types";

export interface SubtitleEntry {
  startTime: number; // seconds
  endTime: number;   // seconds
  text: string;
}

/** Format seconds to ASS timestamp "H:MM:SS.cc". */
function assTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const cs = Math.floor((sec % 1) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

/**
 * Split narration into timed subtitle entries spread across the audio duration.
 */
export function buildSubtitles(script: ScriptDraft, audioDur: number): SubtitleEntry[] {
  const segments: { text: string; weight: number }[] = [
    { text: script.hook, weight: 1.2 },
    ...script.body.map((s) => ({ text: s, weight: 1 })),
    { text: script.ending, weight: 1 },
  ];

  const totalWeight = segments.reduce((s, seg) => s + seg.weight, 0);
  let elapsed = 0;
  const entries: SubtitleEntry[] = [];

  for (const seg of segments) {
    const dur = (seg.weight / totalWeight) * audioDur;
    const words = seg.text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      if (!cur) cur = w;
      else if ((cur + " " + w).length <= 48) cur += " " + w;
      else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);

    if (lines.length === 0) continue;

    const segDur = dur / lines.length;
    for (const line of lines) {
      entries.push({ startTime: elapsed, endTime: elapsed + segDur, text: line });
      elapsed += segDur + 0.15; // small gap between lines
    }
  }

  return entries;
}

/**
 * Write an ASS subtitle file. Returns relative path (from project root) on success.
 *
 * IMPORTANT: The returned path is RELATIVE so that ffmpeg's `ass` filter can
 * find it when CWD is set to the project root. Absolute paths with drive letters
 * (C:\...) break the filter parser on Windows.
 */
export async function writeAssFile(
  script: ScriptDraft,
  audioDurSec: number,
  baseName: string,
  outDir = "output/subtitles"
): Promise<string | null> {
  try {
    const entries = buildSubtitles(script, audioDurSec);
    if (entries.length === 0) return null;

    await mkdir(outDir, { recursive: true });
    const fs = await import("node:fs/promises");

    // ASS header with mobile-friendly styling.
    const assHeader = `[Script Info]
Title: EvidenceHub Subtitles
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0

[V4+ Styles]
Format: Name,Fontname,FontSize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: Default,Arial,64,&H00FFFFFF,&H000000FF,&H00000000,&HCC000000,1,0,0,0,100,100,0,0,3,2,1,2,60,60,90,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    const body = entries
      .map((e) =>
        `Dialogue: 0,${assTime(e.startTime)},${assTime(e.endTime)},Default,,0,0,0,,${e.text.replace(/\\n/g, "\\N")}`
      )
      .join("\n");

    const fileName = `${baseName}.ass`;
    const filePath = path.resolve(outDir, fileName);
    await fs.writeFile(filePath, assHeader + body, "utf-8");

    // Return RELATIVE path for ffmpeg's ass filter (avoids Windows path issues).
    const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
    console.log(`  [Subtitles] wrote ${entries.length} entries → ${fileName}`);
    return relPath;
  } catch (err) {
    console.warn(`  [Subtitles] failed: ${String(err)}`);
    return null;
  }
}
