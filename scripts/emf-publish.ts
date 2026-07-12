// EvidenceHub Media Factory (EMF) — Batch Publisher
//
// Uploads produced MP4s to a platform. YouTube is implemented first
// (TikTok/others follow). Designed to "run the full flow" for a batch:
//
//   npm run emf:publish -- --platform=youtube --limit=2
//
// It scans output/videos for *.mp4, builds platform metadata, uploads each,
// and (when the DB is configured) records the publish in publish_queue.
// Failures are isolated per file so one bad upload doesn't abort the batch.

import { readdirSync, existsSync } from "node:fs";
import path from "node:path";
import {
  uploadVideoYoutube,
  buildYoutubeMetadata,
  loadYoutubeCredentials,
  type YoutubeCredentials,
} from "../src/lib/emf/youtube";
import {
  uploadVideoTiktok,
  buildTiktokMetadata,
  loadTiktokCredentials,
  type TiktokCredentials,
} from "../src/lib/emf/tiktok";
import { markPublishedDb, isEmfDbReady } from "../src/lib/emf/db";

interface Args {
  platform: string;
  limit: number;
  dir: string;
}

function parseArgs(argv: string[]): Args {
  const out: Args = { platform: "youtube", limit: 2, dir: "output/videos" };
  for (const a of argv) {
    if (a.startsWith("--platform=")) out.platform = a.split("=")[1];
    else if (a.startsWith("--limit=")) out.limit = parseInt(a.split("=")[1], 10) || 2;
    else if (a.startsWith("--dir=")) out.dir = a.split("=")[1];
  }
  return out;
}

async function publishYoutube(dir: string, limit: number, creds: YoutubeCredentials) {
  const files = readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".mp4"))
    .sort()
    .slice(0, limit);

  if (files.length === 0) {
    console.log(`No MP4 files found in ${dir}. Run \`npm run emf:generate -- --live\` first.`);
    return;
  }

  console.log(`\n[EMF Publish] platform=youtube  files=${files.length}\n`);
  let ok = 0;
  const dbReady = isEmfDbReady();

  for (const file of files) {
    const filePath = path.join(dir, file);
    const base = file.replace(/\.mp4$/i, "");
    try {
      const meta = await buildYoutubeMetadata(base);
      console.log(`↑ ${file}  →  "${meta.title}"`);
      const res = await uploadVideoYoutube(filePath, meta, creds);
      console.log(`  ✔ ${res.url}`);
      if (dbReady) {
        const marked = await markPublishedDb(file, "youtube", res.url);
        if (!marked) console.log(`  (DB publish record skipped — Supabase unavailable)`);
      }
      ok++;
    } catch (err) {
      console.error(`  ✗ ${file} failed: ${String(err)}`);
    }
  }
  console.log(`\nDone. ${ok}/${files.length} uploaded to YouTube.\n`);
}

async function publishTiktok(dir: string, limit: number, creds: TiktokCredentials) {
  const files = readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".mp4"))
    .sort()
    .slice(0, limit);

  if (files.length === 0) {
    console.log(`No MP4 files found in ${dir}. Run \`npm run emf:generate -- --live\` first.`);
    return;
  }

  console.log(`\n[EMF Publish] platform=tiktok  files=${files.length}\n`);
  let ok = 0;
  const dbReady = isEmfDbReady();

  for (const file of files) {
    const filePath = path.join(dir, file);
    const base = file.replace(/\.mp4$/i, "");
    try {
      const meta = await buildTiktokMetadata(base);
      console.log(`↑ ${file}`);
      console.log(`  caption: ${meta.caption.replace(/\n/g, " ")}`);
      const res = await uploadVideoTiktok(filePath, meta, creds);
      const postUrl = res.url ? `  → ${res.url}` : "";
      console.log(`  → status=${res.status}${postUrl}${res.failReason ? ` (${res.failReason})` : ""}`);
      if (dbReady) {
        const marked = await markPublishedDb(file, "tiktok", res.url || res.id);
        if (!marked) console.log(`  (DB publish record skipped — Supabase unavailable)`);
      }
      ok++;
    } catch (err) {
      console.error(`  ✗ ${file} failed: ${String(err)}`);
    }
  }
  console.log(`\nDone. ${ok}/${files.length} uploaded to TikTok.\n`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!existsSync(args.dir)) {
    console.error(`\n✗ Directory not found: ${args.dir}\n`);
    process.exit(1);
  }

  if (args.platform === "youtube") {
    const creds = loadYoutubeCredentials();
    if (!creds) {
      console.error(
        "\n✗ YouTube not authenticated.\n" +
          "  1. Set YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET in .env\n" +
          "  2. Run `npm run emf:youtube-auth` once to obtain YOUTUBE_REFRESH_TOKEN\n"
      );
      process.exit(1);
    }
    await publishYoutube(args.dir, args.limit, creds);
    return;
  }

  if (args.platform === "tiktok") {
    const creds = loadTiktokCredentials();
    if (!creds) {
      console.error(
        "\n✗ TikTok not authenticated.\n" +
          "  1. Set TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET in .env\n" +
          "  2. Run `npm run emf:tiktok-auth` once to obtain TIKTOK_REFRESH_TOKEN\n"
      );
      process.exit(1);
    }
    await publishTiktok(args.dir, args.limit, creds);
    return;
  }

  console.error(`Platform "${args.platform}" not implemented yet (youtube | tiktok).`);
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
