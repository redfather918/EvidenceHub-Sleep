// EvidenceHub Media Factory (EMF) — Asset Generator (P2)
//
// Builds the visual asset spec for a planned item (hook card, product PNG,
// evidence card, stars, logo) with Flux prompts, and optionally calls a Flux
// image endpoint when FLUX_API_KEY + FLUX_ENDPOINT are set and live mode is on.
//
// When Flux is not available, renderSvgCards() materializes professional
// 1080x1920 info-card PNGs directly from SVG (no API key, no external cost)
// via @resvg/resvg-js, so the video render still produces a valid MP4 locally.

import { Resvg } from "@resvg/resvg-js";
import { mkdir } from "node:fs/promises";
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
      label: "summary_card",
      type: "png",
      prompt: `Closing takeaway card with the key message for a ${templateCode} sleep video about ${cap}`,
      fallback: "assets/summary.png",
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

// ============================================================
// Programmatic SVG info cards (free, key-less fallback)
// ============================================================

const W = 1080;
const H = 1920;
const GOLD = "#F5C451";
const WHITE = "#FFFFFF";
const MUTED = "#9AA4BF";
const BG_TOP = "#0B1026";
const BG_BOTTOM = "#12183A";

export interface CardContext {
  hook?: string;
  item?: string;
  evidence?: string;
  ending?: string;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Greedy word-wrap to a max character count per line. */
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + " " + w).length <= maxChars) cur += " " + w;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function tspans(lines: string[], x: number, startY: number, lineH: number): string {
  return lines
    .map(
      (ln, i) =>
        `    <tspan x="${x}" dy="${i === 0 ? 0 : lineH}">${escapeXml(ln)}</tspan>`
    )
    .join("\n");
}

function baseSvg(inner: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${BG_TOP}"/>
      <stop offset="100%" stop-color="${BG_BOTTOM}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="80" y="150" width="120" height="8" rx="4" fill="${GOLD}"/>
${inner}
  <text x="${W / 2}" y="${H - 90}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="34" fill="${MUTED}" letter-spacing="2">EVIDENCEHUB · SLEEP SCIENCE</text>
</svg>`;
}

function hookSvg(hook?: string): string {
  const lines = wrapText(hook || "Better sleep starts here.", 20);
  const startY = H / 2 - (lines.length - 1) * 52;
  const inner = `  <text text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="88" font-weight="700" fill="${WHITE}">
${tspans(lines, W / 2, startY, 100)}
  </text>`;
  return baseSvg(inner);
}

function productSvg(item?: string): string {
  const name = (item || "Sleep").charAt(0).toUpperCase() + (item || "Sleep").slice(1);
  const initial = name.charAt(0).toUpperCase();
  const inner = `
  <circle cx="${W / 2}" cy="760" r="210" fill="none" stroke="${GOLD}" stroke-width="8"/>
  <text x="${W / 2}" y="810" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="240" font-weight="700" fill="${GOLD}">${escapeXml(initial)}</text>
  <text x="${W / 2}" y="1080" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="86" font-weight="700" fill="${WHITE}">${escapeXml(name)}</text>
  <text x="${W / 2}" y="1160" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="44" fill="${MUTED}">What the research says</text>`;
  return baseSvg(inner);
}

function evidenceSvg(evidence?: string): string {
  const body = evidence || "Backed by peer-reviewed research on sleep quality.";
  const lines = wrapText(body, 26);
  const startY = 720;
  const inner = `
  <rect x="120" y="640" width="12" height="${Math.max(600, lines.length * 64 + 140)}" rx="6" fill="${GOLD}"/>
  <text x="175" y="700" font-family="Arial, Helvetica, sans-serif" font-size="54" font-weight="700" fill="${GOLD}">What the evidence shows</text>
  <text x="175" y="${startY}" font-family="Arial, Helvetica, sans-serif" font-size="52" fill="${WHITE}">
${tspans(lines, 175, startY, 68)}
  </text>`;
  return baseSvg(inner);
}

function starsSvg(): string {
  const inner = `
  <text x="${W / 2}" y="900" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="170" fill="${GOLD}">&#9733; &#9733; &#9733; &#9733; &#9733;</text>
  <text x="${W / 2}" y="1060" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="56" font-weight="700" fill="${WHITE}">Backed by research</text>
  <text x="${W / 2}" y="1140" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="42" fill="${MUTED}">Not medical advice — consult a professional</text>`;
  return baseSvg(inner);
}

function logoSvg(): string {
  const inner = `
  <rect x="${W - 380}" y="${H - 260}" width="300" height="100" rx="22" fill="#1B2244" stroke="${GOLD}" stroke-width="2"/>
  <text x="${W - 230}" y="${H - 200}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="46" font-weight="700" fill="${WHITE}">EvidenceHub</text>`;
  return baseSvg(inner);
}

function summarySvg(ending?: string): string {
  const body = ending || "Small changes, better sleep.";
  const lines = wrapText(body, 26);
  const startY = 760;
  const inner = `
  <rect x="120" y="660" width="10" height="${Math.max(520, lines.length * 64 + 120)}" rx="5" fill="${GOLD}"/>
  <text x="170" y="720" font-family="Arial, Helvetica, sans-serif" font-size="46" font-weight="700" fill="${GOLD}">The takeaway</text>
  <text x="170" y="${startY}" font-family="Arial, Helvetica, sans-serif" font-size="48" fill="${WHITE}">
${tspans(lines, 170, startY, 64)}
  </text>`;
  return baseSvg(inner);
}

function svgForLabel(label: string, ctx: CardContext): string {
  if (label === "hook_card") return hookSvg(ctx.hook);
  if (label.endsWith("_product")) return productSvg(ctx.item);
  if (label === "evidence_card") return evidenceSvg(ctx.evidence);
  if (label === "stars") return starsSvg();
  if (label === "summary_card") return summarySvg(ctx.ending);
  if (label === "logo") return logoSvg();
  return hookSvg(ctx.hook);
}

/**
 * Materialize professional info-card PNGs at each spec.fallback so the ffmpeg
 * render has inputs even when Flux is not configured. Contextual cards
 * (hook / evidence / product) are always regenerated per item so each video
 * shows the correct text; static cards (stars / logo) are overwritten too for
 * simplicity. (When a real Flux image is downloaded, a different code path
 * writes it and renderSvgCards is not called for that asset.)
 *
 * @returns number of PNGs written
 */
export async function renderSvgCards(
  specs: AssetSpec[],
  ctx: CardContext,
  outBase = process.cwd()
): Promise<number> {
  let written = 0;
  for (const s of specs) {
    const full = path.resolve(outBase, s.fallback);
    try {
      const svg = svgForLabel(s.label, ctx);
      const resvg = new Resvg(svg, {
        fitTo: { mode: "width", value: W },
        font: { loadSystemFonts: true, defaultFontFamily: "Arial" },
      });
      const png = resvg.render().asPng();
      await mkdir(path.dirname(full), { recursive: true });
      const fs = await import("node:fs/promises");
      await fs.writeFile(full, png);
      written++;
    } catch (err) {
      console.warn(`  [Assets] SVG card ${s.label} failed: ${String(err)}`);
    }
  }
  return written;
}

// Backwards-compatible alias (legacy name used in older call sites).
export const writePlaceholderAssets = renderSvgCards;
