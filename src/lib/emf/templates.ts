// EvidenceHub Media Factory (EMF) — Template Engine
//
// Turns a (item, template) pair + optional Claim context into a ScriptDraft
// (hook / body / ending). Deterministic assembly from structured Claim fields
// (PRD §3.4): no LLM required for the base layer, so it runs offline and is
// testable. An LLM can later enrich `body` prose without changing the shape.

import type { ScriptInput, ScriptDraft, ScriptClaimContext, MediaKind } from "./types";
import { TEMPLATE_BY_ID } from "./taxonomy";
import { DEFAULT_VOICE, DEFAULT_VIDEO_TEMPLATE } from "./config";

function stars(score?: number): string {
  const s = typeof score === "number" ? Math.max(0, Math.min(5, Math.round(score / 20))) : 0;
  return "★".repeat(s) + "☆".repeat(5 - s);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Generate a script draft for an item under a given template.
 * `claim` (from EvidenceHub DB) enriches the prose with real evidence.
 */
export function generateScript(input: ScriptInput): ScriptDraft {
  const { item, category, pillar, template, kind = "video", claim } = input;
  const tpl = TEMPLATE_BY_ID[template];
  const catLabel = category ? capitalize(category) : "this topic";
  const pillarLabel = pillar ? capitalize(pillar) : "this area";

  let hook = "";
  let body: string[] = [];
  let ending = "";

  switch (template) {
    case "question": {
      hook = `Can ${item} improve ${catLabel}?`;
      body = [
        claim?.summary ?? `${item} is increasingly studied for its effects on ${catLabel}.`,
        claim?.studyCount
          ? `The evidence base includes ${claim.studyCount} stud${claim.studyCount === 1 ? "y" : "ies"}` +
            `${claim.rctCount ? `, including ${claim.rctCount} randomized controlled trial${claim.rctCount === 1 ? "" : "s"}` : ""}.`
          : `Researchers have run multiple studies on ${item}.`,
      ];
      ending = claim?.population?.length
        ? `Most relevant for: ${claim.population.join(", ")}.`
        : `Worth adding to your routine if you care about ${catLabel}.`;
      break;
    }
    case "scientists": {
      hook = `Scientists tested ${item}.`;
      body = [
        claim?.studyCount
          ? `${claim.studyCount} human stud${claim.studyCount === 1 ? "y" : "ies"} looked at ${item}` +
            `${claim.metaCount ? `, plus ${claim.metaCount} meta-analys${claim.metaCount === 1 ? "is" : "es"}` : ""}.`
          : `Multiple peer-reviewed studies have examined ${item}.`,
        claim?.mechanism?.length
          ? `Proposed mechanism: ${claim.mechanism[0]}.`
          : `The mechanism links ${item} to ${catLabel} through established physiology.`,
        claim?.evidenceScore != null
          ? `EvidenceHub confidence score: ${claim.evidenceScore}/100 (${stars(claim.evidenceScore)}).`
          : `The evidence is documented in the literature.`,
      ];
      ending = `The data is in — ${item} is worth taking seriously.`;
      break;
    }
    case "myth": {
      hook = `Most people underestimate ${item}.`;
      body = [
        claim?.limitations?.length
          ? `Common caveat: ${claim.limitations[0]}`
          : `It's easy to dismiss ${item}, but the research says otherwise.`,
        claim?.summary ?? `${item} has measurable effects on ${catLabel}.`,
      ];
      ending = `Don't sleep on ${item}.`;
      break;
    }
    case "ranking": {
      hook = `Ranking the best ${pillarLabel.toLowerCase()} for ${catLabel} — does ${item} make the cut?`;
      body = [
        claim?.studyCount
          ? `${item} draws on ${claim.studyCount} stud${claim.studyCount === 1 ? "y" : "ies"}.`
          : `${item} is a contender in the ${pillarLabel.toLowerCase()} for ${catLabel}.`,
        claim?.evidenceScore != null
          ? `Evidence grade: ${stars(claim.evidenceScore)} (${claim.evidenceScore}/100).`
          : `See how it stacks up against the field.`,
      ];
      ending = `Add ${item} to your shortlist.`;
      break;
    }
    case "evidence": {
      hook = `Evidence level for ${item}: ${stars(claim?.evidenceScore)}`;
      body = [
        claim?.studyCount
          ? `${claim.studyCount} stud${claim.studyCount === 1 ? "y" : "ies"}` +
            `${claim.rctCount ? `, ${claim.rctCount} RCTs` : ""}` +
            `${claim.metaCount ? `, ${claim.metaCount} meta-analyses` : ""}.`
          : `Backed by peer-reviewed research.`,
        claim?.evidenceScore != null
          ? `Overall confidence: ${claim.evidenceScore}/100.`
          : `Confidence documented in the literature.`,
      ];
      ending = `Grade: ${stars(claim?.evidenceScore)} — ${item} earns its place.`;
      break;
    }
  }

  return {
    template,
    templateCode: tpl.code,
    kind,
    hook,
    body,
    ending,
    durationSec: kind === "video" || kind === "short" ? DEFAULT_VIDEO_TEMPLATE.totalSeconds : undefined,
    voice: DEFAULT_VOICE,
  };
}

/** Build a ScriptInput's claim context from a minimal EvidenceHub claim shape. */
export function claimContextFromClaim(claim: {
  summary?: string;
  studyCount?: number;
  rctCount?: number;
  metaCount?: number;
  evidenceScore?: number;
  mechanism?: string[];
  population?: string[];
  limitations?: string[];
}): ScriptClaimContext {
  return {
    summary: claim.summary,
    studyCount: claim.studyCount,
    rctCount: claim.rctCount,
    metaCount: claim.metaCount,
    evidenceScore: claim.evidenceScore,
    mechanism: claim.mechanism,
    population: claim.population,
    limitations: claim.limitations,
  };
}
