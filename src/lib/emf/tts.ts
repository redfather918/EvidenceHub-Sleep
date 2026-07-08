// EvidenceHub Media Factory (EMF) — Text-to-Speech (P3)
//
// Synthesizes the narration voice track. Uses the OpenAI TTS endpoint when
// OPENAI_API_KEY is set and live mode is on; otherwise returns a spec entry
// (offline-safe). Voice is fixed per EMF spec (US Female / Voice A / 1.05x).

import type { VoiceConfig } from "./types";

export interface TtsResult {
  text: string;
  voice: VoiceConfig;
  status: "spec" | "rendered";
  audioPath?: string;
}

export interface TtsOptions {
  live?: boolean;
  outDir?: string;
}

/** Map EMF voice id → nearest OpenAI TTS voice. */
function mapVoice(v: VoiceConfig): string {
  if (v.voice === "A") return "nova";
  if (v.voice === "B") return "alloy";
  return "shimmer";
}

export async function synthesizeVoice(text: string, voice: VoiceConfig, opts: TtsOptions = {}): Promise<TtsResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!opts.live || !apiKey) {
    return { text, voice, status: "spec" };
  }
  try {
    const resp = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "tts-1",
        voice: mapVoice(voice),
        input: text,
        speed: voice.speed,
      }),
    });
    if (!resp.ok) throw new Error(`OpenAI TTS HTTP ${resp.status}`);
    const outDir = opts.outDir ?? "output/audio";
    const fs = await import("node:fs/promises");
    await fs.mkdir(outDir, { recursive: true });
    const filePath = `${outDir}/voice_${Date.now()}.mp3`;
    const buf = Buffer.from(await resp.arrayBuffer());
    await fs.writeFile(filePath, buf);
    return { text, voice, status: "rendered", audioPath: filePath };
  } catch (err) {
    console.warn(`  [TTS] failed: ${String(err)}`);
    return { text, voice, status: "spec" };
  }
}
