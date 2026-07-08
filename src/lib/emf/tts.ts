// EvidenceHub Media Factory (EMF) — Text-to-Speech (P3)
//
// Synthesizes the narration voice track with Microsoft Edge TTS — a FREE,
// no-API-key neural voice service. Supports standard English voices and
// rotates across a pool so different videos don't sound monotone.
//
// Falls back to a "spec" entry (offline-safe, silent track) when not in live
// mode, so the rest of the pipeline (video manifest) still runs.

import { tts as edgeTts } from "edge-tts";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import type { VoiceConfig } from "./types";

export interface TtsResult {
  text: string;
  voice: VoiceConfig;
  status: "spec" | "rendered";
  audioPath?: string;
  voiceId?: string;
}

export interface TtsOptions {
  live?: boolean;
  outDir?: string;
  /** Edge TTS voice id, e.g. "en-US-JennyNeural". Picks pool[0] if omitted. */
  voiceId?: string;
}

/**
 * Free English neural voices (no API key required). Rotated across videos.
 *   Jenny    — female, warm & clear
 *   Christopher — male, deep & credible
 *   Guy      — male, neutral
 *   Aria     — female, upbeat
 */
export const EDGE_VOICE_POOL = [
  "en-US-JennyNeural",
  "en-US-ChristopherNeural",
  "en-US-GuyNeural",
  "en-US-AriaNeural",
];

function fallbackVoice(): VoiceConfig {
  return { provider: "edge-tts", voice: "A", speed: 1.05 };
}

/**
 * Local Windows SAPI fallback (offline, free, no network). Used when Edge TTS
 * is unreachable (e.g. region-blocked dev machine). Voice quality is lower
 * than neural but guarantees an audible English track for local testing.
 */
const SAPI_VOICE_MAP: Record<string, string> = {
  "en-US-JennyNeural": "Microsoft Zira Desktop",
  "en-US-ChristopherNeural": "Microsoft David Desktop",
  "en-US-GuyNeural": "Microsoft Mark Desktop",
  "en-US-AriaNeural": "Microsoft Zira Desktop",
};

async function synthesizeWithSapi(text: string, voiceId: string, outWav: string): Promise<boolean> {
  if (process.platform !== "win32") return false;
  // Must use Windows PowerShell 5.1 (System.Speech lives in .NET Framework,
  // not PowerShell 7 / .NET Core).
  const winPs =
    "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
  const voiceName = SAPI_VOICE_MAP[voiceId] ?? "Microsoft Zira Desktop";
  const safe = text.replace(/'/g, "''");
  const ps =
    `Add-Type -AssemblyName System.Speech; ` +
    `$s=New-Object System.Speech.Synthesis.SpeechSynthesizer; ` +
    `$s.SetOutputToWaveFile('${outWav}'); ` +
    `$s.SelectVoice('${voiceName}'); ` +
    `$s.Speak('${safe}'); ` +
    `$s.SetOutputToNull(); ` +
    `$s.Dispose()`;
  const encoded = Buffer.from(ps, "utf16le").toString("base64");
  await promisify(execFile)(winPs, ["-NoProfile", "-EncodedCommand", encoded], {
    windowsHide: true,
    timeout: 120_000, // guard against a hung synthesis blocking the whole batch
  });
  return true;
}

/** Probe WAV duration via ffprobe; returns null on failure. */
async function probeWavDuration(filePath: string): Promise<number | null> {
  try {
    const out = await promisify(execFile)("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);
    const d = parseFloat((out.stdout ?? "").toString().trim());
    return Number.isFinite(d) && d > 0 ? d : null;
  } catch {
    return null;
  }
}

/**
 * Validate that a SAPI-produced WAV is actually usable: non-trivial size,
 * correct RIFF/WAVE header, and a positive duration. (Windows sometimes
 * releases the file handle late, leaving a truncated/headerless wav that
 * would make ffmpeg emit a corrupt mp4.)
 */
async function isWavValid(p: string): Promise<boolean> {
  try {
    const fs = await import("node:fs/promises");
    const st = await fs.stat(p);
    if (st.size <= 44) return false;
    const fh = await fs.open(p, "r");
    const head = Buffer.alloc(12);
    await fh.read(head, 0, 12, 0);
    await fh.close();
    if (head.toString("ascii", 0, 4) !== "RIFF" || head.toString("ascii", 8, 12) !== "WAVE")
      return false;
    const d = await probeWavDuration(p);
    return d !== null && d > 0;
  } catch {
    return false;
  }
}

/** Convert a 1.0x-style speed to Edge TTS "+N%" / "-N%" rate string. */
function toEdgeRate(speed: number): string {
  const pct = Math.round((speed - 1) * 100);
  return pct === 0 ? "+0%" : pct > 0 ? `+${pct}%` : `${pct}%`;
}

/**
 * Synthesize narration. In live mode calls Edge TTS and writes an MP3.
 * Returns a spec entry (no file) when not live or on failure.
 */
export async function synthesizeVoice(
  text: string,
  voice: VoiceConfig,
  opts: TtsOptions = {}
): Promise<TtsResult> {
  const voiceId = opts.voiceId && EDGE_VOICE_POOL.includes(opts.voiceId)
    ? opts.voiceId
    : EDGE_VOICE_POOL[0];

  if (!opts.live) {
    return { text, voice, status: "spec", voiceId };
  }

  const outDir = opts.outDir ?? "output/audio";
  try {
    const buf: Buffer = await edgeTts(text, {
      voice: voiceId,
      rate: toEdgeRate(voice.speed ?? 1.05),
      volume: "+0%",
    });
    const fs = await import("node:fs/promises");
    await fs.mkdir(outDir, { recursive: true });
    const filePath = `${outDir}/voice_${Date.now()}.mp3`;
    await fs.writeFile(filePath, buf);
    return { text, voice, status: "rendered", audioPath: filePath, voiceId };
  } catch (err) {
    console.warn(`  [TTS] edge-tts failed: ${String(err)}`);
    // Fallback: local Windows SAPI (offline, free) for dev machines.
    if (process.platform === "win32") {
      try {
        const fs = await import("node:fs/promises");
        await fs.mkdir(outDir, { recursive: true });
        let wavPath: string | null = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          const candidate = path.resolve(outDir, `voice_${Date.now()}_a${attempt}.wav`);
          try {
            await synthesizeWithSapi(text, voiceId, candidate);
          } catch (e) {
            console.warn(`  [TTS] SAPI attempt ${attempt + 1} error: ${String(e)}`);
            continue;
          }
          if (await isWavValid(candidate)) {
            wavPath = candidate;
            break;
          }
          console.warn(`  [TTS] SAPI wav invalid (attempt ${attempt + 1}), retrying`);
        }
        if (wavPath) {
          return { text, voice, status: "rendered", audioPath: wavPath, voiceId };
        }
        console.warn(`  [TTS] SAPI produced no usable wav (English voice missing?) -> silent`);
      } catch (e2) {
        console.warn(`  [TTS] SAPI fallback failed: ${String(e2)}`);
      }
    }
    return { text, voice, status: "spec", voiceId };
  }
}
