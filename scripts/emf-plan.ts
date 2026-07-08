// EvidenceHub Media Factory (EMF) — Phase 0 demo / validation script
//
// Runs fully offline (no DB, no LLM). It builds the evergreen + fresh pools
// from the taxonomy, asks the Content Planner for a one-week schedule, prints
// the matrix, then renders a sample script via the Template Engine.
//
// Run:  npx tsx scripts/emf-plan.ts [startDate YYYY-MM-DD] [days]

import { CONTENT_MATRIX, FRESH_SEED_ITEMS, buildEvergreenPool } from "../src/lib/emf/taxonomy";
import { generateSchedule, summarizeSchedule, isoWeek } from "../src/lib/emf/planner";
import { generateScript } from "../src/lib/emf/templates";
import type { TemplateId } from "../src/lib/emf/types";

function nextMonday(from: Date): string {
  const d = new Date(from);
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const delta = (8 - day) % 7 || 7;
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

const startDate = process.argv[2] ?? nextMonday(new Date());
const days = Number(process.argv[3] ?? 7);

const evergreenPool = buildEvergreenPool(CONTENT_MATRIX);
const freshPool = FRESH_SEED_ITEMS;

const schedule = generateSchedule({
  startDate,
  days,
  postsPerDay: 5,
  evergreenRatio: 0.8,
  evergreenPool,
  freshPool,
});

console.log("=== EvidenceHub Media Factory — Phase 0 demo ===");
console.log(`Start: ${startDate}  Days: ${days}  Posts/day: ${schedule.postsPerDay}`);
console.log(`Evergreen pool size: ${evergreenPool.length}  Fresh pool size: ${freshPool.length}`);

const summary = summarizeSchedule(schedule);
console.log(
  `\nSchedule totals: ${summary.total} items | evergreen ${summary.evergreen} (${Math.round(
    (summary.evergreen / summary.total) * 100
  )}%) | fresh ${summary.fresh} (${Math.round((summary.fresh / summary.total) * 100)}%)`
);
console.log("By template:", summary.byTemplate);

console.log("\n--- Daily matrix (fileName | dimension | category/pillar/item | template) ---");
for (const it of schedule.items) {
  console.log(
    `${it.fileName.padEnd(42)} ${it.dimension.padEnd(9)} ${it.category}/${it.pillar}/${it.item}  [${it.templateCode}]`
  );
}

// Render sample scripts for the first evergreen + first fresh item.
const samples = [
  schedule.items.find((i) => i.dimension === "evergreen"),
  schedule.items.find((i) => i.dimension === "fresh"),
].filter(Boolean) as typeof schedule.items;

console.log("\n--- Sample scripts ---");
for (const s of samples) {
  const draft = generateScript({
    item: s.item,
    category: s.category === "fresh" ? undefined : s.category,
    pillar: s.category === "fresh" ? undefined : s.pillar,
    template: s.template as TemplateId,
  });
  console.log(`\n[${s.fileName}]  (${draft.kind}, ${draft.durationSec ?? "-"}s, voice ${draft.voice.provider}/${draft.voice.voice}@${draft.voice.speed}x)`);
  console.log(`HOOK:    ${draft.hook}`);
  draft.body.forEach((b, i) => console.log(`BODY[${i + 1}]: ${b}`));
  console.log(`ENDING:  ${draft.ending}`);
}

console.log(`\nWeek key sample: ${schedule.items[0].weekKey} (isoWeek of ${startDate} = ${JSON.stringify(isoWeek(new Date(startDate)))})`);
console.log("OK — EMF engine ran offline with no errors.");
