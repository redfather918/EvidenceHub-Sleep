// EvidenceHub Media Factory (EMF) — YouTube OAuth bootstrap (one-time)
//
// Run once per machine: `npm run emf:youtube-auth`
//   1. reads YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET from .env
//   2. opens the Google consent screen (loopback redirect on :8080–:8082)
//   3. exchanges the returned code for tokens
//   4. saves them to youtube-tokens.json and appends YOUTUBE_REFRESH_TOKEN to .env
//
// After this, `npm run emf:publish` can upload non-interactively.
//
// Setup (Google Cloud):
//   - create a project, enable "YouTube Data API v3"
//   - OAuth consent screen → "External", add your Google account as test user
//   - Credentials → OAuth client ID → type "Desktop app"
//   - copy the Client ID + Secret into .env
//
// NOTE: Google deprecated urn:ietf:wg:oauth:2.0:oob (OOB) in 2022.
// This script uses localhost loopback only (multiple ports for resilience).

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

/**
 * Try to bind a loopback HTTP server on one of the given ports, open the browser
 * to the consent URL, and wait up to 90s for Google to redirect back with ?code=.
 * Returns the authorization code, or null if all ports fail or timeout.
 */
function tryLoopback(ports: number[], clientId: string): Promise<string | null> {
  let currentPortIdx = 0;
  let activeServer: ReturnType<typeof createServer> | null = null;

  return new Promise((resolve) => {
    function tryNextPort() {
      if (currentPortIdx >= ports.length) {
        resolve(null); // all ports exhausted
        return;
      }
      const port = ports[currentPortIdx];
      const redirectUri = `http://localhost:${port}`;
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
        // Port in use — try next
        server.close();
        currentPortIdx++;
        tryNextPort();
      });

      server.listen(port, () => {
        activeServer = server;
        const portStr = String(port);
        console.log(`Local OAuth listener running on http://localhost:${portStr}`);
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

        // Wait up to 90s for the callback.
        setTimeout(() => {
          if (!server.listening) return; // already closed
          server.close();
          resolve(null); // timeout — treat same as failure so we don't hang
        }, 90_000);
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

  const code = await tryLoopback(FALLBACK_PORTS, clientId);

  if (!code) {
    die(
      "Could not receive the OAuth callback.\n" +
        "Possible fixes:\n" +
        "  1. A firewall is blocking inbound connections to localhost.\n" +
        "  2. Ports " + FALLBACK_PORTS.join(", ") + " are all occupied.\n" +
        '  3. You did not click "Allow" in the browser within 90 seconds.\n' +
        "\nTry closing other apps using those ports and re-running."
    );
  }

  // Determine which port was used (from the active listener's port).
  // We used the first successful bind, so reconstruct from the URL that worked.
  const usedRedirectUri = `http://localhost:${FALLBACK_PORTS[0]}`;

  console.log("\nExchanging code for tokens ...");
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: usedRedirectUri,
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
