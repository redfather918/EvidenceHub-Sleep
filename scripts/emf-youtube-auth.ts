// EvidenceHub Media Factory (EMF) — YouTube OAuth bootstrap (one-time)
//
// Run once per machine: `npm run emf:youtube-auth`
//   1. reads YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET from .env
//   2. opens the Google consent screen (loopback redirect on 127.0.0.1:8080–8082)
//   3. if the loopback callback is not received, falls back to: paste the full
//      redirect URL from the browser's address bar (it contains ?code=...)
//   4. exchanges the code for tokens
//   5. saves them to youtube-tokens.json and appends YOUTUBE_REFRESH_TOKEN to .env
//
// After this, `npm run emf:publish` can upload non-interactively.
//
// Setup (Google Cloud):
//   - create a project, enable "YouTube Data API v3"
//   - OAuth consent screen → "External", add your Google account as test user
//   - Credentials → OAuth client ID → type "Desktop app"
//   - copy the Client ID + Secret into .env

import "dotenv/config";
import { writeFileSync, appendFileSync, existsSync } from "node:fs";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";

const FALLBACK_PORTS = [8080, 8081, 8082];
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

/** Read a line of input from the terminal. */
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

/** Try to extract ?code from a URL the user pastes. */
function extractCodeFromUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    // Accept both ?code=... and the #code=... (hash) variants.
    const c = u.searchParams.get("code") ?? u.hash.match(/[?&]code=([^&]+)/)?.[1];
    return c ?? null;
  } catch {
    return null;
  }
}

/**
 * Try to bind a loopback HTTP server on one of the given ports, open the browser
 * to the consent URL, and wait up to 70s for Google to redirect back with ?code=.
 * Returns the authorization code, or null if all ports fail or timeout.
 */
function tryLoopback(ports: number[], clientId: string): Promise<string | null> {
  let currentPortIdx = 0;
  return new Promise((resolve) => {
    function tryNextPort() {
      if (currentPortIdx >= ports.length) {
        resolve(null);
        return;
      }
      const port = ports[currentPortIdx];
      const redirectUri = `http://127.0.0.1:${port}`;
      const consentUrl = buildConsentUrl(redirectUri, clientId);

      const server = createServer((req, res) => {
        const url = new URL(req.url ?? "/", redirectUri);
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
        currentPortIdx++;
        tryNextPort();
      });

      server.listen(port, "127.0.0.1", () => {
        console.log(`Local OAuth listener running on http://127.0.0.1:${port}`);
        console.log("\nOpen this URL in your browser and authorize EvidenceHub:\n");
        console.log("  " + consentUrl + "\n");
        try {
          import("node:child_process").then(({ spawn }) => {
            const opener =
              process.platform === "win32" ? "cmd" : process.platform === "darwin" ? "open" : "xdg-open";
            const target = process.platform === "win32" ? ["/c", "start", "", consentUrl] : [consentUrl];
            spawn(opener, target, { detached: true, stdio: "ignore" }).unref();
          });
        } catch {
          /* user copies URL manually */
        }

        setTimeout(() => {
          if (!server.listening) return;
          server.close();
          resolve(null);
        }, 70_000);
      });
    }

    tryNextPort();
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

  // Try the loopback callback first.
  const loopCode = await tryLoopback(FALLBACK_PORTS, clientId);

  let code: string | null = loopCode;
  let usedRedirect: string | undefined;

  if (code) {
    usedRedirect = `http://127.0.0.1:${FALLBACK_PORTS[0]}`;
  } else {
    // Fallback: ask the user to paste the full redirect URL from the browser
    // address bar. After clicking "Allow", Google redirects the browser to
    // http://127.0.0.1:8080?code=... — even if our local server is not
    // reachable, the address bar still contains that URL with the code.
    console.log("\n⚠ We could not receive the callback automatically.");
    console.log("After clicking 'Allow' in the browser, copy the FULL address from");
    console.log("the browser's URL bar (it looks like http://127.0.0.1:8080/?code=...)");
    console.log("and paste it back here:\n");
    const pasted = await readLine("Paste the redirect URL here: ");
    code = extractCodeFromUrl(pasted);
    if (!code) {
      die("Could not find ?code= in what you pasted. Please re-run and try again.");
    }
    // The redirect_uri used in the token exchange must match the consent URL's.
    // We don't know which port the browser used, so try them all.
    usedRedirect = undefined;
  }

  console.log("\nExchanging code for tokens ...");
  const exchange = async (redirectUri: string) => {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    });
    const resp = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    return { resp, ok: resp.ok, text: await resp.text() };
  };

  // Try each possible redirect URI for the token exchange.
  const candidates =
    usedRedirect != null
      ? [usedRedirect]
      : FALLBACK_PORTS.map((p) => `http://127.0.0.1:${p}`);

  let tok: { access_token: string; refresh_token: string; expires_in: number } | null = null;
  for (const uri of candidates) {
    const { resp, ok, text } = await exchange(uri);
    if (ok) {
      tok = (await resp.json()) as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
      };
      break;
    }
    // If it's a redirect_uri mismatch, try the next candidate.
    if (!/redirect_uri_mismatch/.test(text)) {
      die(`Token exchange failed: ${resp.status} ${text}`);
    }
  }
  if (!tok) die("Token exchange failed for all redirect URIs (redirect_uri_mismatch).");
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
