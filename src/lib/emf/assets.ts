// EvidenceHub Media Factory (EMF) — Asset Generator (P2)
//
// Builds the visual asset spec for a planned item (hook card, product PNG,
// evidence card, stars, logo) with Flux prompts, and optionally calls a Flux
// image endpoint when FLUX_API_KEY + FLUX_ENDPOINT are set and live mode is on.
// Without those, it returns "spec" entries (offline-safe) so the rest of the
// pipeline (TTS, video manifest) can still run.
//
// When Flux is not available, writePlaceholderAssets() materializes real
// colored PNGs at the fallback paths via ffmpeg, so the video render still
// produces a valid (placeholder) MP4 locally.

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, access } from "node:fs/promises";
import path from "node:path";

export type AssetType = "png" | "icon";

export interface AssetSpec {
  label: string;
  type: AssetType;
  prompt?: string; // Flux prompt for generation
  fallback: string; // local placeholder path
}

/** Visuals needed for the fixed 30s timeline (see config.DEFAULT_VIDEO_TEMPLATE). */
export function buildAssetSpecs(item: string, templateCode: string): AssetSpec[] {
  const cap = item.charAt(0).toUpperCase() + item.slice(1);
  return [
    {
      label: "hook_card",
      type: "png",
      prompt: `Bold minimal text card with the hook line for a ${templateCode} sleep video about ${cap}`,
      fallback: "assets/hook.png",
    },
    {
      label: `${item}_product`,
      type: "png",
      prompt: `Clean studio product photo of ${item}, soft lighting, plain background`,
      fallback: `assets/${item}.png`,
    },
    {
      label: "evidence_card",
      type: "png",
      prompt: `Minimal evidence-stats card, dark navy background, high-contrast text`,
      fallback: "assets/evidence.png",
    },
    {
      label: "stars",
      type: "icon",
      prompt: `Five-star rating graphic, gold stars, transparent background`,
      fallback: "assets/stars.png",
    },
    {
      label: "logo",
      type: "icon",
      prompt: `EvidenceHub logo bug, small, bottom-right`,
      fallback: "assets/logo.png",
    },
  ];
}

export interface FluxResult {
  spec: AssetSpec;
  status: "spec" | "generated";
  url?: string;
}

export interface AssetGenOptions {
  live?: boolean;
}

/** Generate assets via Flux when configured; otherwise return specs only. */
export async function generateAssetsWithFlux(
  specs: AssetSpec[],
  opts: AssetGenOptions = {}
): Promise<FluxResult[]> {
  const key = process.env.FLUX_API_KEY;
  const endpoint = process.env.FLUX_ENDPOINT;
  if (!opts.live || !key || !endpoint) {
    return specs.map((s) => ({ spec: s, status: "spec" as const }));
  }
  const out: FluxResult[] = [];
  for (const s of specs) {
    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ prompt: s.prompt ?? s.label, n: 1 }),
      });
      if (!resp.ok) throw new Error(`Flux HTTP ${resp.status}`);
      const data = await resp.json();
      out.push({ spec: s, status: "generated", url: data?.url ?? data?.data?.[0]?.url });
    } catch (err) {
      console.warn(`  [Flux] ${s.label} failed: ${String(err)}`);
      out.push({ spec: s, status: "spec" });
    }
  }
  return out;
}

/** Solid background colors used for offline placeholder stills (per slot). */
const PLACEHOLDER_COLORS: Record<string, string> = {
  hook_card: "0x12183A",
  evidence_card: "0x1F2937",
  stars: "0x3A2E05",
  logo: "0x0E3B3B",
};

/**
 * Materialize real PNGs at each spec.fallback so the ffmpeg render has inputs
 * even when Flux is not configured. Existing files are left untouched (so a
 * previously downloaded Flux image is not overwritten). No-op if ffmpeg is
 * unavailable — the render step will then degrade to manifest mode.
 */
export async function writePlaceholderAssets(
  specs: AssetSpec[],
  outBase = process.cwd()
): Promise<number> {
  let written = 0;
  try {
    await promisify(execFile)("ffmpeg", ["-version"]);
  } catch {
    console.warn("  [Assets] ffmpeg not found — skipping placeholder generation");
    return 0;
  }
  for (const s of specs) {
    const full = path.resolve(outBase, s.fallback);
    try {
      await access(full);
      continue; // already exists (e.g. real Flux image)
    } catch {
      /* not present → create placeholder */
    }
    const color = PLACEHOLDER_COLORS[s.label] ?? "0x222831";
    try {
      await mkdir(path.dirname(full), { recursive: true });
      await promisify(execFile)("ffmpeg", [
        "-y",
        "-f",
        "lavfi",
        "-i",
        `color=c=${color}:s=1080x1920:d=1`,
        "-frames:v",
        "1",
        full,
      ]);
      written++;
    } catch (err) {
      console.warn(`  [Assets] placeholder ${s.label} failed: ${String(err)}`);
    }
  }
  return written;
}
