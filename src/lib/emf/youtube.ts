// EvidenceHub Media Factory (EMF) — YouTube Publisher
//
// Uploads generated MP4s to YouTube via the Data API v3 resumable upload
// protocol. Authentication uses OAuth 2.0 (required for uploads — an API key
// is NOT sufficient). Credentials are read from environment variables OR a
// youtube-tokens.json file written by `scripts/emf-youtube-auth.ts`.
//
// All functions degrade gracefully: without valid credentials they throw a
// clear, actionable error instead of crashing the batch.

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { getPlanItemDb } from "./db";

export interface YoutubeCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accessToken?: string;
}

export interface YoutubeMetadata {
  title: string;
  description: string;
  tags: string[];
  categoryId: string;
  privacyStatus: "public" | "unlisted" | "private";
}

export interface YoutubeUploadResult {
  id: string;
  url: string;
  title: string;
}

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const UPLOAD_API = "https://www.googleapis.com/upload/youtube/v3/videos";
const YOUTUBE_WATCH = "https://www.youtube.com/watch?v=";

/** Load YouTube credentials from env or youtube-tokens.json. */
export function loadYoutubeCredentials(): YoutubeCredentials | null {
  const envId = process.env.YOUTUBE_CLIENT_ID;
  const envSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const envRefresh = process.env.YOUTUBE_REFRESH_TOKEN;
  const envAccess = process.env.YOUTUBE_ACCESS_TOKEN;

  let json: Partial<YoutubeCredentials> = {};
  const jsonPath = path.resolve(process.cwd(), "youtube-tokens.json");
  if (existsSync(jsonPath)) {
    try {
      json = JSON.parse(readFileSync(jsonPath, "utf8"));
    } catch {
      /* ignore malformed token file */
    }
  }

  const clientId = envId ?? json.clientId;
  const clientSecret = envSecret ?? json.clientSecret;
  const refreshToken = envRefresh ?? json.refreshToken;
  const accessToken = envAccess ?? json.accessToken;

  if (!clientId || !clientSecret || !refreshToken) return null;
  return { clientId, clientSecret, refreshToken, accessToken };
}

/** Exchange the refresh token for a fresh access token. */
export async function refreshAccessToken(creds: YoutubeCredentials): Promise<string> {
  const body = new URLSearchParams({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    refresh_token: creds.refreshToken,
    grant_type: "refresh_token",
  });
  const resp = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!resp.ok) {
    throw new Error(`YouTube token refresh failed: ${resp.status} ${await resp.text()}`);
  }
  const data = (await resp.json()) as { access_token: string };
  return data.access_token;
}

/** Build upload metadata from a video base name (optionally enriched via DB). */
export async function buildYoutubeMetadata(baseName: string): Promise<YoutubeMetadata> {
  // Try to enrich from media_plan (item / category / pillar).
  let item = "Video";
  let category = "sleep";
  try {
    const plan = await getPlanItemDb(`${baseName}.mp4`);
    if (plan) {
      item = plan.item;
      category = plan.category;
    }
  } catch {
    /* DB optional */
  }

  // Fallback: parse item from filename like 2026W28_SUN_Foods_Kiwi_TA
  if (item === "Video") {
    const m = baseName.match(/_([A-Za-z0-9]+)_([A-Za-z0-9]+)_([A-Za-z])$/);
    if (m) item = m[2];
  }
  const cap = item.charAt(0).toUpperCase() + item.slice(1);

  const privacy = (process.env.YOUTUBE_PRIVACY as YoutubeMetadata["privacyStatus"]) || "unlisted";
  const categoryId = process.env.YOUTUBE_CATEGORY_ID || "26"; // Howto & Style

  return {
    title: `${cap} for Sleep — What the Evidence Says | EvidenceHub`,
    description:
      `Evidence-based look at ${item} and sleep, produced by EvidenceHub Media Factory.\n\n` +
      `This video summarizes peer-reviewed research, not medical advice. ` +
      `Consult a professional for personal health decisions.\n\n` +
      `#sleep #evidencebased #${item.toLowerCase().replace(/\s+/g, "")} #evidencehub`,
    tags: ["sleep", "evidencehub", item.toLowerCase().replace(/\s+/g, ""), "evidencebased", category],
    categoryId,
    privacyStatus: privacy,
  };
}

/**
 * Resumable upload of a local MP4 to YouTube.
 * Returns the video id + watch URL.
 */
export async function uploadVideoYoutube(
  filePath: string,
  meta: YoutubeMetadata,
  creds?: YoutubeCredentials
): Promise<YoutubeUploadResult> {
  const credentials = creds ?? loadYoutubeCredentials();
  if (!credentials) {
    throw new Error(
      "YouTube not authenticated. Run `npm run emf:youtube-auth` once to obtain tokens, " +
        "or set YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN in .env."
    );
  }

  const accessToken = credentials.accessToken ?? (await refreshAccessToken(credentials));

  const snippet = {
    title: meta.title,
    description: meta.description,
    tags: meta.tags,
    categoryId: meta.categoryId,
  };
  const status = { privacyStatus: meta.privacyStatus };
  const metaBody = JSON.stringify({ snippet, status });

  // Step 1 — request the resumable upload URL.
  const initResp = await fetch(`${UPLOAD_API}?uploadType=resumable&part=snippet,status,contentDetails`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": "video/mp4",
      "X-Upload-Content-Length": String(await fileSize(filePath)),
    },
    body: metaBody,
  });
  if (!initResp.ok) {
    throw new Error(`YouTube upload init failed: ${initResp.status} ${await initResp.text()}`);
  }
  const uploadUrl = initResp.headers.get("location");
  if (!uploadUrl) {
    throw new Error("YouTube did not return an upload URL.");
  }

  // Step 2 — PUT the binary bytes.
  const bytes = readFileSync(filePath);
  const putResp = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "video/mp4",
    },
    body: bytes,
  });
  if (!putResp.ok) {
    throw new Error(`YouTube upload failed: ${putResp.status} ${await putResp.text()}`);
  }
  const result = (await putResp.json()) as { id: string; snippet?: { title?: string } };
  return {
    id: result.id,
    url: `${YOUTUBE_WATCH}${result.id}`,
    title: result.snippet?.title ?? meta.title,
  };
}

async function fileSize(p: string): Promise<number> {
  const fs = await import("node:fs/promises");
  const stat = await fs.stat(p);
  return stat.size;
}
