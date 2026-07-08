// EvidenceHub Media Factory (EMF) — Content matrix & taxonomy
//
// Encodes the content matrix from the PRD (§4): categories → pillars → items,
// plus the Template Matrix (§6.3). Also provides helpers to build the planner
// pools (evergreen item rotation + fresh study pool) from this taxonomy.

import type {
  ContentCategory,
  TemplateDef,
  TemplateId,
  EvergreenPoolEntry,
  FreshPoolEntry,
} from "./types";

// ============================================================
// Template Matrix (§6.3)
// ============================================================

export const TEMPLATES: TemplateDef[] = [
  {
    id: "question",
    code: "A",
    name: "Question",
    description: "Opens with a direct question, e.g. 'Can kiwi improve sleep?'",
  },
  {
    id: "scientists",
    code: "B",
    name: "Scientists",
    description: "Leads with the research, e.g. 'Scientists tested kiwi.'",
  },
  {
    id: "myth",
    code: "C",
    name: "Myth",
    description: "Challenges a misconception, e.g. 'Most people underestimate kiwi.'",
  },
  {
    id: "ranking",
    code: "D",
    name: "Ranking",
    description: "List/ranking angle, e.g. 'Top sleep foods.'",
  },
  {
    id: "evidence",
    code: "E",
    name: "Evidence",
    description: "Evidence-grade angle, e.g. 'Evidence level: ★★★★☆'",
  },
];

export const TEMPLATE_BY_ID: Record<TemplateId, TemplateDef> = TEMPLATES.reduce(
  (acc, t) => {
    acc[t.id] = t;
    return acc;
  },
  {} as Record<TemplateId, TemplateDef>
);

// ============================================================
// Content Matrix (§4)
// ============================================================

export const CONTENT_MATRIX: ContentCategory[] = [
  {
    slug: "sleep",
    name: "Sleep",
    pillars: [
      {
        slug: "foods",
        name: "Foods",
        targetCount: 100,
        items: ["kiwi", "walnut", "oats", "banana", "cherry", "milk"],
      },
      {
        slug: "supplements",
        name: "Supplements",
        targetCount: 100,
        items: ["glycine", "magnesium", "melatonin", "l-theanine", "taurine"],
      },
      {
        slug: "exercise",
        name: "Exercise",
        targetCount: 100,
        items: ["morning walk", "yoga", "resistance training", "cardio"],
      },
      {
        slug: "habits",
        name: "Habits",
        targetCount: 100,
        items: ["consistent schedule", "no screens", "cool room", "caffeine cutoff"],
      },
      {
        slug: "bedroom",
        name: "Bedroom",
        targetCount: 50,
        items: ["blackout curtains", "white noise", "cool temperature"],
      },
      {
        slug: "devices",
        name: "Devices",
        targetCount: 50,
        items: ["blue-light filter", "smartwatch do-not-disturb", "analog alarm"],
      },
      {
        slug: "sleep-myths",
        name: "Sleep Myths",
        targetCount: 100,
        items: ["8-hour myth", "alcohol helps sleep", "weekend catch-up"],
      },
      {
        slug: "sleep-science",
        name: "Sleep Science",
        targetCount: 100,
        items: ["circadian rhythm", "sleep stages", "deep sleep", "rem rebound"],
      },
    ],
  },
  {
    slug: "nutrition",
    name: "Nutrition",
    pillars: [
      { slug: "fiber", name: "Fiber", targetCount: 50, items: ["oats", "beans", "lentils"] },
      { slug: "protein", name: "Protein", targetCount: 50, items: ["whey", "casein", "eggs"] },
      { slug: "omega3", name: "Omega3", targetCount: 50, items: ["fish oil", "walnuts", "flax"] },
      { slug: "vegetables", name: "Vegetables", targetCount: 50, items: ["leafy greens", "broccoli"] },
      { slug: "fruit", name: "Fruit", targetCount: 50, items: ["berries", "kiwi", "cherry"] },
      { slug: "coffee", name: "Coffee", targetCount: 50, items: ["espresso", "cold brew"] },
    ],
  },
  {
    slug: "heart",
    name: "Heart",
    pillars: [
      { slug: "blood-pressure", name: "Blood Pressure", targetCount: 50, items: ["beetroot", "potassium", "hibiscus"] },
      { slug: "af", name: "AF", targetCount: 50, items: ["magnesium", "electrolytes"] },
      { slug: "hrv", name: "HRV", targetCount: 50, items: ["breathing", "cold exposure"] },
      { slug: "inflammation", name: "Inflammation", targetCount: 50, items: ["omega3", "curcumin", "polyphenols"] },
    ],
  },
];

// ============================================================
// Pool builders
// ============================================================

/**
 * Flatten the content matrix into an evergreen item pool.
 * `claimByItem` optionally maps an item keyword → claim slug so planned
 * items can link back to EvidenceHub claims.
 */
export function buildEvergreenPool(
  matrix: ContentCategory[] = CONTENT_MATRIX,
  claimByItem?: Record<string, string>
): EvergreenPoolEntry[] {
  const pool: EvergreenPoolEntry[] = [];
  for (const cat of matrix) {
    for (const pillar of cat.pillars) {
      const items = pillar.items && pillar.items.length ? pillar.items : [pillar.slug];
      for (const item of items) {
        pool.push({
          category: cat.slug,
          pillar: pillar.slug,
          item,
          claimSlug: claimByItem?.[item],
        });
      }
    }
  }
  return pool;
}

/**
 * Sample fresh-study pool (demo). In production this is populated daily from
 * new PubMed claims (see §7 of the PRD).
 */
export const FRESH_SEED_ITEMS: FreshPoolEntry[] = [
  { item: "2026 kiwi sleep latency study", source: "pubmed" },
  { item: "2026 magnesium REM study", source: "pubmed" },
  { item: "2026 circadian light study", source: "pubmed" },
  { item: "2026 glycine deep sleep trial", source: "pubmed" },
  { item: "2026 caffeine timing meta-analysis", source: "pubmed" },
  { item: "2026 blue-light melatonin study", source: "pubmed" },
  { item: "2026 exercise timing sleep study", source: "pubmed" },
];
