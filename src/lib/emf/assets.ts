// EvidenceHub Media Factory (EMF) — Asset Generator (P2)
//
// Builds the visual asset spec for a planned item (hook card, product PNG,
// evidence card, stars, logo) with Flux prompts, and optionally calls a Flux
// image endpoint when FLUX_API_KEY + FLUX_ENDPOINT are set and live mode is on.
// Without those, it returns "spec" entries (offline-safe) so the rest of the
// pipeline (TTS, video manifest) can still run.

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
