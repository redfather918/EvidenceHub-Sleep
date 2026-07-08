// EvidenceHub Media Factory (EMF) — YouTube OAuth bootstrap (one-time)
//
// Run once per machine: `npm run emf:youtube-auth`
//   1. reads YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET from .env
//   2. opens the Google consent screen (loopback redirect on :8080, or
//      manual "paste the code" fallback if the loopback can't bind)
//   3. exchanges the returned code for tokens
//   4. saves them to youtube-tokens.json and appends YOUTUBE_REFRESH_TOKEN to .env
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

import "dotenv/config";
import { writeFileSync, appendFileSync, existsSync } from "node:fs";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";

const REDIRECT_PORT = 8080;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}`;
const OOB = "urn:ietf:wg:oauth:2.0:oob";
const SCOPE = "https://www.googleapis.com/auth/youtube.upload";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

function die(msg: string): never {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

function buildConsentUrl(redirectUri: string, clientId: string): string {
  return (
    `${AUTH_URL}?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code&scope=${encodeURIComponent(SCOPE)}` +
    `&access_type=offline&prompt=consent`
  );
}

/** Try the loopback listener; resolve with the code, or null if it can't. */
function tryLoopback(consentUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", REDIRECT_URI);
      const c = url.searchParams.get("code");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        "<h2>EvidenceHub authorization complete ✅</h2>" +
          "<p>You can close this tab and return to the terminal.</p>"
      );
      server.close();
      resolve(c ?? null);
    });
    server.on("error", () => {
      server.close();
      resolve(null);
    });
    server.listen(REDIRECT_PORT, () => {
      console.log("Open this URL in your browser and authorize EvidenceHub:\n");
      console.log("  " + consentUrl + "\n");
      try {
        import("node:child_process").then(({ spawn }) => {
          const opener = process.platform === "win32" ? "cmd" : process.platform === "darwin" ? "open" : "xdg-open";
          const target = process.platform === "win32" ? ["/c", "start", "", consentUrl] : [consentUrl];
          spawn(opener, target, { detached: true, stdio: "ignore" }).unref();
        }).catch(() => {
          /* user can copy the URL manually */
        });
      } catch {
        /* user can copy the URL manually */
      }
    });
    // If the loopback never receives the code, give up and fall back to OOB.
    setTimeout(() => {
      server.close();
      resolve(null);
    }, 90_000);
  });
}

/** Read a line of input from the terminal (manual code paste). */
function readLine(promptText: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdin.resume();
    process.stdout.write(promptText);
    process.stdin.once("data", (d) => {
      resolve(d.toString().trim());
      process.stdin.pause();
    });
  });
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

  const loopbackUrl = buildConsentUrl(REDIRECT_URI, clientId);
  const oobUrl = buildConsentUrl(OOB, clientId);

  console.log("Starting local OAuth listener on " + REDIRECT_URI + " ...");
  const loopbackCode = await tryLoopback(loopbackUrl);

  let code: string;
  let usedRedirect: string;
  if (loopbackCode) {
    code = loopbackCode;
    usedRedirect = REDIRECT_URI;
  } else {
    console.log("\n⚠ Could not receive the code via localhost (port blocked / timeout).");
    console.log("Falling back to manual mode. Open this URL, authorize, then");
    console.log("copy the code Google shows you and paste it back here:\n");
    console.log("  " + oobUrl + "\n");
    code = await readLine("Paste the code here: ");
    if (!code) die("No code provided.");
    usedRedirect = OOB;
  }

  console.log("\nExchanging code for tokens ...");
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: usedRedirect,
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
    const cur = readFileSync(envPath, "utf8");
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
