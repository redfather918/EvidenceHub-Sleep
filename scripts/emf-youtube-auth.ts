// EvidenceHub Media Factory (EMF) — YouTube OAuth bootstrap (one-time)
//
// Run once per machine: `npm run emf:youtube-auth`
//
// Three ways to get the authorization code (tried in order):
//   A) --code <code>        — pass the code directly on the command line
//   B) loopback callback     — auto: local HTTP server catches the redirect
//   C) paste URL from browser — manual fallback when loopback fails
//
// After obtaining tokens, saves to youtube-tokens.json + appends REFRESH_TOKEN to .env.
//
// Setup (Google Cloud):
//   - create a project, enable "YouTube Data API v3"
//   - OAuth consent screen → "External", add your Google account as test user
//   - Credentials → OAuth client ID → type "Desktop app"
//   - copy the Client ID + Secret into .env

import "dotenv/config";
import { writeFileSync, appendFileSync, existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";

const FALLBACK_PORTS = [8080, 8081, 8082, 8083];
const SCOPE = "https://www.googleapis.com/auth/youtube.upload";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const LOOPBACK_TIMEOUT_MS = 120_000; // 2 minutes

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

/** Extract ?code=... from a full URL or a raw code string. */
function extractCode(raw: string): string | null {
  const trimmed = raw.trim();
  // Direct code: starts with "4/" or similar Google auth code pattern
  if (/^4\/[A-Za-z0-9_-]+/.test(trimmed)) return trimmed;
  // Full URL
  try {
    const u = new URL(trimmed);
    const c = u.searchParams.get("code") ?? u.hash.match(/[?&]code=([^&]+)/)?.[1];
    return c ?? null;
  } catch {
    return null;
  }
}

/**
 * Try to bind a loopback HTTP server, open the consent URL in the browser,
 * and wait for Google's ?code= redirect.
 */
function tryLoopback(ports: number[], clientId: string): Promise<string | null> {
  let idx = 0;
  return new Promise((resolve) => {
    function attempt() {
      if (idx >= ports.length) {
        resolve(null);
        return;
      }
      const port = ports[idx++];
      const redirectUri = `http://127.0.0.1:${port}`;
      const consentUrl = buildConsentUrl(redirectUri, clientId);

      let resolved = false;
      const server = createServer((req, res) => {
        const url = new URL(req.url ?? "/", redirectUri);
        const c = url.searchParams.get("code");
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(
          "<h2>EvidenceHub authorization complete ✅</h2>" +
            "<p>You can close this tab and return to the terminal.</p>"
        );
        resolved = true;
        server.close();
        resolve(c ?? null);
      });

      server.on("error", (_err) => {
        server.close();
        attempt(); // try next port
      });

      server.listen(port, "127.0.0.1", () => {
        console.log(`\n✅ Local OAuth listener running on http://127.0.0.1:${port}`);
        console.log("\n🌐 Opening Google authorization page in your browser...\n");
        console.log(`   If it doesn't open, copy this URL:\n   ${consentUrl}\n`);

        // Open browser
        try {
          import("node:child_process").then(({ spawn }) => {
            const opener =
              process.platform === "win32"
                ? "cmd"
                : process.platform === "darwin"
                  ? "open"
                  : "xdg-open";
            const target =
              process.platform === "win32"
                ? ["/c", "start", "", consentUrl]
                : [consentUrl];
            spawn(opener, target, { detached: true, stdio: "ignore" }).unref();
          });
        } catch {
          /* manual copy */
        }

        // Timeout
        setTimeout(() => {
          if (resolved) return;
          console.log("\n⏱ Loopback timeout — switching to manual mode.");
          resolved = true;
          server.close();
          resolve(null);
        }, LOOPBACK_TIMEOUT_MS);
      });
    }

    attempt();
  });
}

/**
 * Exchange an authorization code for tokens using the given redirect URI.
 */
async function exchangeCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
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
  if (!resp.ok) {
    throw new Error(`Token exchange failed (${redirectUri}): ${resp.status} ${await resp.text()}`);
  }
  return resp.json() as Promise<{ access_token: string; refresh_token: string; expires_in: number }>;
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

  // ── Method A: --code flag ──────────────────────────────────────
  const codeArgIdx = process.argv.indexOf("--code");
  if (codeArgIdx !== -1 && codeArgIdx + 1 < process.argv.length) {
    const code = process.argv[codeArgIdx + 1];
    console.log("\n🔑 Using authorization code from --code argument...\n");
    await completeAuth(code, clientId, clientSecret, undefined);
    return;
  }

  // ── Method B: Loopback callback ────────────────────────────────
  console.log("=== EvidenceHub YouTube OAuth Authorization ===\n");
  console.log("Step 1: We'll try to catch Google's callback automatically.");
  console.log("Step 2: If that doesn't work, you'll be asked to paste the code manually.\n");

  const loopCode = await tryLoopback(FALLBACK_PORTS, clientId);

  if (loopCode) {
    console.log("\n🎉 Got authorization code via loopback callback!\n");
    await completeAuth(loopCode, clientId, clientSecret, `http://127.0.0.1:${FALLBACK_PORTS[0]}`);
    return;
  }

  // ── Method C: Manual paste (URL or raw code) ───────────────────
  console.log("\n" + "═".repeat(60));
  console.log(" MANUAL CODE ENTRY ");
  console.log("═".repeat(60));
  console.log(
    "\nAfter clicking 'Allow' in your browser, Google tried to redirect to\n" +
      "http://127.0.0.1:8080?code=.... but couldn't reach our local server."
  );
  console.log("\nYour browser address bar should show a URL like:");
  console.log("  127.0.0.1:8080/?iss=https://accounts.google.com&code=4/0AXE...\n");
  console.log("You have TWO options:\n");
  console.log("  1) Paste the FULL URL from the address bar below"); 
  console.log("  2) Or paste just the code part (starts with 4/)\n");

  const pasted = await readLine("Paste code or URL here: ");
  const code = extractCode(pasted);
  if (!code) {
    die(
      "Could not find authorization code in what you pasted.\n" +
        "Expected something like '4/0AXEQx...' or a full URL starting with 'http://127.0.0.1'."
    );
  }
  console.log("\n🔑 Extracted authorization code. Exchanging for tokens...\n");
  // When pasting manually we don't know which port was used — try all
  await completeAuth(code, clientId, clientSecret, undefined);
}

/**
 * Complete OAuth flow: exchange code → save tokens → update .env.
 * If redirectUri is undefined, tries all fallback ports.
 */
async function completeAuth(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string | undefined
) {
  const candidates =
    redirectUri != null
      ? [redirectUri]
      : FALLBACK_PORTS.map((p) => `http://127.0.0.1:${p}`);

  let tok: { access_token: string; refresh_token: string; expires_in: number } | null = null;
  let lastErr = "";

  for (const uri of candidates) {
    try {
      tok = await exchangeCode(code, clientId, clientSecret, uri);
      break;
    } catch (e) {
      lastErr = String(e);
      // If it's a redirect_uri_mismatch, try next candidate
      if (!/redirect_uri_mismatch/.test(lastErr)) {
        die(lastErr);
      }
    }
  }
  if (!tok) die(`Token exchange failed for all redirect URIs: ${lastErr}`);
  if (!tok.refresh_token) die("No refresh_token returned. Re-run (prompt=consent is already set).");

  // Save tokens
  const store = {
    clientId,
    clientSecret,
    accessToken: tok.access_token,
    refreshToken: tok.refresh_token,
  };
  const jsonPath = path.resolve(process.cwd(), "youtube-tokens.json");
  writeFileSync(jsonPath, JSON.stringify(store, null, 2));
  console.log(`✔ Tokens saved to ${jsonPath}`);

  // Append REFRESH_TOKEN to .env
  const envPath = path.resolve(process.cwd(), ".env");
  if (existsSync(envPath)) {
    const cur = readFileSync(envPath, "utf8");
    const lines: string[] = [];
    if (!/YOUTUBE_CLIENT_ID=/.test(cur)) lines.push(`YOUTUBE_CLIENT_ID=${clientId}`);
    if (!/YOUTUBE_CLIENT_SECRET=/.test(cur)) lines.push(`YOUTUBE_CLIENT_SECRET=${clientSecret}`);
    if (!/YOUTUBE_REFRESH_TOKEN=/.test(cur))
      lines.push(`YOUTUBE_REFRESH_TOKEN=${tok.refresh_token}`);
    if (lines.length) {
      appendFileSync(envPath, "\n" + lines.join("\n") + "\n");
      console.log("✔ YOUTUBE_REFRESH_TOKEN appended to .env");
    }
  }

  console.log("\n" + "═".repeat(50));
  console.log(" AUTHORIZATION COMPLETE! ");
  console.log("═".repeat(50));
  console.log("\nYou can now upload videos:");
  console.log("  npm run emf:generate -- --live --limit=2");
  console.log("  npm run emf:publish -- --platform=youtube --limit=2\n");
}

main().catch((e) => die(String(e)));
