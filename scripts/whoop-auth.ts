#!/usr/bin/env bun
/**
 * one-time whoop oauth handshake to produce a refresh token.
 *
 * usage: bun run scripts/whoop-auth.ts
 *
 * reads WHOOP_CLIENT_ID, WHOOP_CLIENT_SECRET, WHOOP_OAUTH_REDIRECT_URI
 * from .env.local (or process.env). prints an authorization url for the
 * user to open; after the redirect, the user pastes the full callback
 * url back into the terminal and the script exchanges the code for a
 * refresh token.
 *
 * paste the resulting refresh_token into .env.local as WHOOP_REFRESH_TOKEN
 * (and into cloudflare pages env vars for production).
 */

import { createInterface } from "node:readline/promises";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
const TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
const SCOPES = [
  "offline",
  "read:recovery",
  "read:cycles",
  "read:sleep",
  "read:workout",
  "read:profile",
  "read:body_measurement",
];

async function loadEnvFile(path: string): Promise<Record<string, string>> {
  try {
    const text = readFileSync(path, "utf8");
    const out: Record<string, string> = {};
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      out[key] = val;
    }
    return out;
  } catch {
    return {};
  }
}

async function main() {
  const envFile = await loadEnvFile(join(process.cwd(), ".env.local"));
  const clientId = process.env.WHOOP_CLIENT_ID ?? envFile.WHOOP_CLIENT_ID;
  const clientSecret =
    process.env.WHOOP_CLIENT_SECRET ?? envFile.WHOOP_CLIENT_SECRET;
  const redirectUri =
    process.env.WHOOP_OAUTH_REDIRECT_URI ??
    envFile.WHOOP_OAUTH_REDIRECT_URI ??
    "http://localhost:3000/whoop-callback";

  if (!clientId || !clientSecret) {
    console.error(
      "missing WHOOP_CLIENT_ID or WHOOP_CLIENT_SECRET in .env.local",
    );
    process.exit(1);
  }

  const state = randomBytes(16).toString("hex");
  const authUrl = new URL(AUTH_URL);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", SCOPES.join(" "));
  authUrl.searchParams.set("state", state);

  console.log("\n1. open this url in a browser and approve:\n");
  console.log(authUrl.toString());
  console.log(
    "\n2. the browser will redirect to",
    redirectUri,
    "with ?code=... in the query string (the page may 404, that's ok).",
  );
  console.log("\n3. paste the FULL redirected url below.\n");

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const pasted = (await rl.question("redirected url: ")).trim();
  rl.close();

  let callback: URL;
  try {
    callback = new URL(pasted);
  } catch {
    console.error("that doesn't look like a url. aborting.");
    process.exit(1);
  }

  const code = callback.searchParams.get("code");
  const returnedState = callback.searchParams.get("state");
  if (!code) {
    console.error("no ?code= in the url. aborting.");
    process.exit(1);
  }
  if (returnedState !== state) {
    console.error("state mismatch. aborting.");
    process.exit(1);
  }

  console.log("\nexchanging code for tokens...");
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });
  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!r.ok) {
    const t = await r.text();
    console.error(`token exchange failed: ${r.status} ${t}`);
    process.exit(1);
  }
  const json = (await r.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };
  if (!json.refresh_token) {
    console.error(
      "response did not include a refresh_token. did you include the 'offline' scope?",
    );
    console.error(json);
    process.exit(1);
  }

  console.log("\nsuccess. add this to .env.local:\n");
  console.log(`WHOOP_REFRESH_TOKEN=${json.refresh_token}`);
  console.log(
    "\nalso add it to cloudflare pages env vars (settings → environment variables) for production.",
  );
  console.log(
    `\naccess_token expires in ${json.expires_in}s · scope: ${json.scope}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
