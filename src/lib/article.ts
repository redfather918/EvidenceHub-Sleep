// EvidenceHub Sleep — Article composition (Module 5: Claim Article View)
//
// Turns a Claim (with its AI-extracted structured relations) into a
// long-form, editorial-style article. The prose is *composed* from the
// structured fields the pipeline's LLM step already produced (summary,
// mechanism, FAQ, limitations, study results) — i.e. the article is
// auto-generated from our database claims, not hand-written.
//
// A future enhancement can replace composeArticle's deterministic assembly
// with a live LLM prose layer (gated by an API key) for richer narrative.

import type { ClaimWithRelations, Claim, Study, FAQItem } from "./types";

export interface ArticleSection {
  id: string;
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface ArticleContent {
  slug: string;
  title: string;
  kicker: string;
  subtitle: string;
  readingMinutes: number;
  evidenceScore: number;
  confidence: string;
  updatedAt: string;
  lede: string;
  sections: ArticleSection[];
  faq: FAQItem[];
  relatedClaims: Claim[];
  studies: Study[];
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function estimateReadingMinutes(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function composeArticle(claim: ClaimWithRelations): ArticleContent {
  const corpus = [
    claim.text,
    claim.summary,
    claim.mechanism.join(" "),
    claim.limitations.join(" "),
    claim.faq.map((f) => `${f.q} ${f.a}`).join(" "),
  ].join(" ");

  const kicker = [claim.category, claim.topic?.name].filter(Boolean).join(" · ");

  const lede =
    `${capitalize(claim.text)} ` +
    `The current body of evidence comprises ${claim.studyCount} ` +
    `study${claim.studyCount === 1 ? "" : "ies"}` +
    `${claim.rctCount ? `, including ${claim.rctCount} randomized controlled trial${claim.rctCount === 1 ? "" : "s"}` : ""}` +
    `${claim.metaCount ? ` and ${claim.metaCount} meta-analys${claim.metaCount === 1 ? "is" : "es"}` : ""}. ` +
    `EvidenceHub rates the overall confidence at ${claim.evidenceScore}/100 (${claim.confidence}).`;

  const sections: ArticleSection[] = [];

  // 1. The Claim
  sections.push({
    id: "the-claim",
    heading: "The Claim",
    paragraphs: [
      claim.text,
      claim.population.length
        ? `This conclusion is most relevant to: ${claim.population.join(", ")}.`
        : "",
    ].filter(Boolean),
  });

  // 2. What the Research Shows
  if (claim.studies.length) {
    const top = [...claim.studies].slice(0, 4);
    sections.push({
      id: "what-the-research-shows",
      heading: "What the Research Shows",
      paragraphs: [
        `The conclusion draws on ${claim.studies.length} linked ` +
          `study${claim.studies.length === 1 ? "" : "ies"}. Highlights from the cited literature:`,
      ],
      bullets: top.map(
        (s) =>
          `${s.title} (${s.journal}${s.year ? `, ${s.year}` : ""}) — ${s.result}`
      ),
    });
  }

  // 3. How It Works
  if (claim.mechanism.length) {
    sections.push({
      id: "how-it-works",
      heading: "How It Works",
      paragraphs: ["The proposed biological pathway:"],
      bullets: claim.mechanism,
    });
  }

  // 4. Who Might Benefit
  if (claim.populationFits.length || claim.population.length) {
    const bullets = claim.populationFits.length
      ? claim.populationFits.map(
          (p) =>
            `${p.fit === "yes" ? "Likely" : p.fit === "check" ? "Possibly" : "Unlikely"}: ${p.group}` +
            `${p.note ? ` — ${p.note}` : ""}`
        )
      : claim.population;
    sections.push({
      id: "who-might-benefit",
      heading: "Who Might Benefit",
      paragraphs: ["Evidence fit by population:"],
      bullets,
    });
  }

  // 5. Recommended Dose
  if (claim.doseMappings.length || claim.dose) {
    sections.push({
      id: "recommended-dose",
      heading: "Recommended Dose",
      paragraphs: claim.doseMappings.length
        ? [
            "Dose-response data from the research:",
            ...claim.doseMappings.map(
              (d) => `${d.doseRange}${d.optimal ? " (optimal)" : ""}: ${d.effect}`
            ),
          ]
        : [claim.dose],
    });
  }

  // 6. Limitations & Caveats
  if (claim.limitations.length) {
    sections.push({
      id: "limitations",
      heading: "Limitations & Caveats",
      paragraphs: ["Important context when interpreting this evidence:"],
      bullets: claim.limitations,
    });
  }

  return {
    slug: claim.slug,
    title: claim.text,
    kicker,
    subtitle: claim.summary,
    readingMinutes: estimateReadingMinutes(corpus),
    evidenceScore: claim.evidenceScore,
    confidence: claim.confidence,
    updatedAt: claim.lastUpdated,
    lede,
    sections,
    faq: claim.faq,
    relatedClaims: claim.relatedClaims,
    studies: claim.studies,
  };
}
