// EvidenceHub Media Factory (EMF) — TikTok Publisher
//
// Uploads generated MP4s to TikTok via the **Content Posting API** (v2).
// This is the current, supported path (the older `video.publish` direct-post
// scope is deprecated). Flow per video:
//
//   1) POST /v2/post/publish/video/init/      -> publish_id + upload_url
//   2) POST /v2/post/publish/video/upload/    -> push the binary bytes
//   3) POST /v2/post/publish/video/status/fetch/ -> poll until SUCCEEDED/FAILED
//
// Auth: OAuth 2.0 Authorization-Code. Credentials come from environment
// variables OR a tiktok-tokens.json file written by `scripts/emf-tiktok-auth.ts`.
// All functions degrade gracefully: without valid creds they throw a clear,
// actionable error instead of crashing the batch.
//
// NOTE on captions: the Content Posting API (video.upload scope) does NOT
// accept a caption/hashtags in the upload request — the post lands on the
// account (or drafts, depending on app approval) and the caption is added
// in-app. We still BUILD a caption (logged + stored in metadata) so it can
// be pasted by hand, and so a future API tier that supports it can use it.

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { getPlanItemDb } from "./db";

export interface TiktokCredentials {
  clientKey: string;
  clientSecret: string;
  refreshToken: string;
  accessToken?: string;
}

export interface TiktokMetadata {
  caption: string; // hashtag-rich, used for in-app paste + logging
  hashtags: string[];
}

export interface TiktokUploadResult {
  id: string; // TikTok publish_id
  url: string; // publicly_available_post_url if SUCCEEDED, else ""
  caption: string;
  status: string; // SUCCEEDED | FAILED | IN_PROGRESS | ...
  failReason?: string;
}

const AUTH_API = "https://open.tiktokapis.com";
const TOKEN_URL = `${AUTH_API}/v2/oauth/token/`;

/** Load TikTok credentials from env or tiktok-tokens.json. */
export function loadTiktokCredentials(): TiktokCredentials | null {
  const envKey = process.env.TIKTOK_CLIENT_KEY;
  const envSecret = process.env.TIKTOK_CLIENT_SECRET;
  const envRefresh = process.env.TIKTOK_REFRESH_TOKEN;
  const envAccess = process.env.TIKTOK_ACCESS_TOKEN;

  let json: Partial<TiktokCredentials> = {};
  const jsonPath = path.resolve(process.cwd(), "tiktok-tokens.json");
  if (existsSync(jsonPath)) {
    try {
      json = JSON.parse(readFileSync(jsonPath, "utf8"));
    } catch {
      /* ignore malformed token file */
    }
  }

  const clientKey = envKey ?? json.clientKey;
  const clientSecret = envSecret ?? json.clientSecret;
  const refreshToken = envRefresh ?? json.refreshToken;
  const accessToken = envAccess ?? json.accessToken;

  if (!clientKey || !clientSecret || !refreshToken) return null;
  return { clientKey, clientSecret, refreshToken, accessToken };
}

/** Exchange the refresh token for a fresh access token. */
export async function refreshAccessToken(creds: TiktokCredentials): Promise<string> {
  const body = new URLSearchParams({
    client_key: creds.clientKey,
    client_secret: creds.clientSecret,
    grant_type: "refresh_token",
    refresh_token: creds.refreshToken,
  });
  const resp = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!resp.ok) {
    throw new Error(`TikTok token refresh failed: ${resp.status} ${await resp.text()}`);
  }
  const data = (await resp.json()) as { access_token: string };
  return data.access_token;
}

/** Build a caption from a video base name (optionally enriched via DB). */
export async function buildTiktokMetadata(baseName: string): Promise<TiktokMetadata> {
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

  if (item === "Video") {
    const m = baseName.match(/_([A-Za-z0-9]+)_([A-Za-z0-9]+)_([A-Za-z])$/);
    if (m) item = m[2];
  }
  const cap = item.charAt(0).toUpperCase() + item.slice(1);
  const tag = item.toLowerCase().replace(/\s+/g, "");
  const hashtags = ["sleep", "evidencebased", tag, "evidencehub", category];
  const caption =
    `${cap} for Sleep — what the evidence actually says 💤\n` +
    hashtags.map((h) => `#${h}`).join(" ");

  return { caption, hashtags };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Upload a local MP4 to TikTok via the Content Posting API.
 * Returns the publish_id + post URL (if published) + final status.
 */
export async function uploadVideoTiktok(
  filePath: string,
  meta: TiktokMetadata,
  creds?: TiktokCredentials
): Promise<TiktokUploadResult> {
  const credentials = creds ?? loadTiktokCredentials();
  if (!credentials) {
    throw new Error(
      "TikTok not authenticated. Run `npm run emf:tiktok-auth` once to obtain tokens, " +
        "or set TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET / TIKTOK_REFRESH_TOKEN in .env."
    );
  }

  const accessToken = credentials.accessToken ?? (await refreshAccessToken(credentials));

  // ── Step 1: request the upload session ───────────────────────
  const bytes = readFileSync(filePath);
  const size = bytes.length;
  const initResp = await fetch(`${AUTH_API}/v2/post/publish/video/init/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source: "FILE_UPLOAD",
      video_size: size,
      chunk_size: size,
      total_chunk_count: 1,
    }),
  });
  if (!initResp.ok) {
    throw new Error(`TikTok upload init failed: ${initResp.status} ${await initResp.text()}`);
  }
  const initJson = (await initResp.json()) as {
    data?: { publish_id?: string; upload_url?: string };
    error?: { code?: string; message?: string };
  };
  const publishId = initJson.data?.publish_id;
  const uploadUrl = initJson.data?.upload_url;
  if (!publishId || !uploadUrl) {
    throw new Error(
      `TikTok init did not return publish_id/upload_url: ${JSON.stringify(initJson.error ?? initJson)}`
    );
  }

  // ── Step 2: push the binary bytes ───────────────────────────
  const form = new FormData();
  form.append("publish_id", publishId);
  form.append("upload_url", uploadUrl);
  form.append("video", new Blob([bytes], { type: "video/mp4" }), "video.mp4");

  const upResp = await fetch(`${AUTH_API}/v2/post/publish/video/upload/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  if (!upResp.ok) {
    throw new Error(`TikTok video upload failed: ${upResp.status} ${await upResp.text()}`);
  }

  // ── Step 3: poll status (bounded) ──────────────────────────
  let status = "IN_PROGRESS";
  let url = "";
  let failReason: string | undefined;
  for (let i = 0; i < 10; i++) {
    const stResp = await fetch(`${AUTH_API}/v2/post/publish/video/status/fetch/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ publish_id: publishId }),
    });
    if (stResp.ok) {
      const stJson = (await stResp.json()) as {
        data?: {
          status?: string;
          publicaly_available_post_url?: string;
          fail_reason?: string;
        };
      };
      status = stJson.data?.status ?? "IN_PROGRESS";
      url = stJson.data?.publicaly_available_post_url ?? "";
      failReason = stJson.data?.fail_reason;
      if (status === "SUCCEEDED" || status === "FAILED") break;
    }
    await sleep(3000);
  }

  return { id: publishId, url, caption: meta.caption, status, failReason };
}
