// EvidenceHub Media Factory (EMF) — YouTube OAuth bootstrap (one-time)
//
// Run once per machine: `npm run emf:youtube-auth`
//   1. reads YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET from .env
//   2. opens the Google consent screen (loopback redirect on :8080)
//   3. exchanges the returned code for tokens
//   4. saves them to youtube-tokens.json and prints the .env lines
//
// After this, `npm run emf:publish` can upload non-interactively.
//
// Setup (Google Cloud):
//   - create a project, enable "YouTube Data API v3"
//   - OAuth consent screen → "External" (or Internal), add your Google account
//     as a test user
//   - Credentials → OAuth client ID → type "Desktop app" (or "Web", then use
//     http://localhost:8080 as an authorized redirect URI)
//   - copy the Client ID + Secret into .env

import { writeFileSync, appendFileSync, existsSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";

const REDIRECT_PORT = 8080;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}`;
const SCOPE = "https://www.googleapis.com/auth/youtube.upload";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

function die(msg: string): never {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

async function main() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    die(
      "Missing YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET.\n" +
        "Add them to .env (see setup notes in scripts/emf-youtube-auth.ts)."
    );
  }

  const consent =
    `${AUTH_URL}?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_type=code&scope=${encodeURIComponent(SCOPE)}` +
    `&access_type=offline&prompt=consent`;

  console.log("\nOpen this URL in your browser and authorize EvidenceHub:\n");
  console.log("  " + consent + "\n");

  // Best-effort: open the browser automatically.
  const { spawn } = await import("node:child_process");
  try {
    const opener = process.platform === "win32" ? "cmd" : process.platform === "darwin" ? "open" : "xdg-open";
    const target = process.platform === "win32" ? ["/c", "start", "", consent] : [consent];
    spawn(opener, target, { detached: true, stdio: "ignore" }).unref();
  } catch {
    /* user can copy the URL manually */
  }

  const code = await new Promise<string>((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", REDIRECT_URI);
      const c = url.searchParams.get("code");
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<h2>EvidenceHub authorization complete ✅</h2><p>You can close this tab and return to the terminal.</p>");
      server.close();
      if (c) resolve(c);
      else reject(new Error("No ?code in redirect"));
    });
    server.on("error", reject);
    server.listen(REDIRECT_PORT, () => console.log(`Local OAuth listener on ${REDIRECT_URI} ...`));
    setTimeout(() => reject(new Error("Timed out waiting for authorization")), 120_000);
  });

  console.log("\nExchanging code for tokens ...");
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: REDIRECT_URI,
  });
  const resp = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!resp.ok) die(`Token exchange failed: ${resp.status} ${await resp.text()}`);
  const tok = (await resp.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  if (!tok.refresh_token) die("No refresh_token returned. Re-run with prompt=consent (already set).");

  const store = {
    clientId,
    clientSecret,
    accessToken: tok.access_token,
    refreshToken: tok.refresh_token,
  };
  const jsonPath = path.resolve(process.cwd(), "youtube-tokens.json");
  writeFileSync(jsonPath, JSON.stringify(store, null, 2));
  console.log(`\n✔ Tokens saved to ${jsonPath}\n`);

  // Also append to .env for convenience (idempotent-ish: only if missing).
  const envPath = path.resolve(process.cwd(), ".env");
  if (existsSync(envPath)) {
    const cur = await import("node:fs/promises").then((f) => f.readFile(envPath, "utf8"));
    const lines: string[] = [];
    if (!/YOUTUBE_CLIENT_ID=/.test(cur)) lines.push(`YOUTUBE_CLIENT_ID=${clientId}`);
    if (!/YOUTUBE_CLIENT_SECRET=/.test(cur)) lines.push(`YOUTUBE_CLIENT_SECRET=${clientSecret}`);
    if (!/YOUTUBE_REFRESH_TOKEN=/.test(cur)) lines.push(`YOUTUBE_REFRESH_TOKEN=${tok.refresh_token}`);
    if (lines.length) appendFileSync(envPath, "\n" + lines.join("\n") + "\n");
  }

  console.log("You can now run:\n");
  console.log("  npm run emf:publish -- --platform=youtube --limit=2\n");
}

main().catch((e) => die(String(e)));
