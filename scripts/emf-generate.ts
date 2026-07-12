#!/usr/bin/env tsx
// EvidenceHub Media Factory (EMF) — Production pipeline CLI (P1 → P3)
// For each planned item: script → assets → TTS → video, then persist.
//
// Default is DRY-RUN: deterministic scripts + asset/TTS/render specs, no
// external calls. Pass --live to actually call LLM / Flux / TTS / ffmpeg and
// persist to Supabase (requires the relevant API keys + ffmpeg on PATH).
//
// Usage:
//   npm run emf:generate                 # dry-run, all 35 items
//   npm run emf:generate -- --limit=3   # dry-run, first 3
//   npm run emf:generate -- --live --limit=3

import "dotenv/config";
import { generateSchedule } from "../src/lib/emf/planner";
import { buildEvergreenPool, FRESH_SEED_ITEMS, CONTENT_MATRIX } from "../src/lib/emf/taxonomy";
import { generateMediaForSchedule } from "../src/lib/emf/generate";

function nextMonday(from: Date): string {
  const d = new Date(from);
  const day = d.getDay();
  const delta = (8 - day) % 7 || 7;
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const live = process.argv.includes("--live");
  const limitArg = process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1];
  const limit = limitArg ? Number(limitArg) : undefined;
  const itemsArg = process.argv.find((a) => a.startsWith("--items="))?.split("=")[1];
  const onlyItems = itemsArg ? itemsArg.split(",").map((s) => s.trim()) : undefined;
  const excludeArg = process.argv.find((a) => a.startsWith("--exclude="))?.split("=")[1];
  const excludeItems = excludeArg ? excludeArg.split(",").map((s) => s.trim()) : undefined;

  const schedule = generateSchedule({
    startDate: nextMonday(new Date()),
    days: 7,
    postsPerDay: 5,
    evergreenRatio: 0.8,
    evergreenPool: buildEvergreenPool(CONTENT_MATRIX),
    freshPool: FRESH_SEED_ITEMS,
  });

  console.log(
    `\n[EMF Generate] mode=${live ? "LIVE (LLM/Flux/TTS/ffmpeg + DB)" : "DRY-RUN (deterministic + specs)"}`
  );
  console.log(`Schedule: ${schedule.items.length} items; processing ${limit ?? schedule.items.length}\n`);

  const pkgs = await generateMediaForSchedule(schedule, { live, limit, onlyItems, excludeItems });

  for (const p of pkgs) {
    console.log(`\n● ${p.plan.fileName}  [${p.plan.dimension}]`);
    console.log(`  HOOK: ${p.script.hook}`);
    console.log(`  ASSETS: ${p.assets.map((a) => `${a.spec.label}:${a.status}`).join(", ")}`);
    console.log(`  TTS: ${p.tts.status}${p.tts.audioPath ? " → " + p.tts.audioPath : ""}`);
    console.log(`  VIDEO: ${p.render.status}`);
    if (!live) console.log(`  FFMPEG: ${p.render.command}`);
    console.log(
      `  PERSISTED: plan=${p.persisted.mediaPlan} asset=${p.persisted.mediaAsset} render=${p.persisted.renderJob}`
    );
  }

  console.log(`\nDone. ${pkgs.length} production package(s).`);
}

main().catch((err) => {
  console.error("[EMF Generate] FATAL:", err);
  process.exit(1);
});
