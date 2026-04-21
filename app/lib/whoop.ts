/**
 * low-level whoop v2 client.
 *
 * concerns: oauth refresh-token flow (with supabase-persisted rotation),
 * single-page fetches, and cursor-paginated full walks. used by the live
 * /api/health handler and by scripts/sync-whoop.ts for backfills.
 */

export interface WhoopEnv {
  WHOOP_CLIENT_ID?: string;
  WHOOP_CLIENT_SECRET?: string;
  WHOOP_REFRESH_TOKEN?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

export const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
export const WHOOP_API = "https://api.prod.whoop.com/developer/v2";

export async function exchangeRefreshToken(env: WhoopEnv): Promise<string> {
  if (!env.WHOOP_CLIENT_ID || !env.WHOOP_CLIENT_SECRET) {
    throw new Error("missing WHOOP_CLIENT_ID / WHOOP_CLIENT_SECRET");
  }

  const currentToken =
    (await readStoredRefreshToken(env)) || env.WHOOP_REFRESH_TOKEN;
  if (!currentToken) {
    throw new Error(
      "no refresh token available — seed whoop_tokens or set WHOOP_REFRESH_TOKEN",
    );
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: currentToken,
    client_id: env.WHOOP_CLIENT_ID,
    client_secret: env.WHOOP_CLIENT_SECRET,
    scope: "offline",
  });
  const r = await fetch(WHOOP_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`whoop token exchange failed: ${r.status} ${t}`);
  }
  const json = (await r.json()) as {
    access_token?: string;
    refresh_token?: string;
  };
  if (!json.access_token) {
    throw new Error("whoop token response missing access_token");
  }

  if (json.refresh_token && json.refresh_token !== currentToken) {
    await writeStoredRefreshToken(env, json.refresh_token);
  }

  return json.access_token;
}

export async function whoopFetch(
  accessToken: string,
  path: string,
): Promise<unknown> {
  const r = await fetch(`${WHOOP_API}${path}`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`whoop ${path} failed: ${r.status} ${t}`);
  }
  return r.json();
}

interface WhoopPage {
  records: Record<string, unknown>[];
  next_token?: string | null;
}

/**
 * walks a paginated whoop endpoint via `nextToken` cursors until exhausted.
 * yields each page so callers can process incrementally. pass extra query
 * params via `params` (eg `{ start: '2025-01-01T00:00:00.000Z', limit: '25' }`).
 */
export async function* whoopFetchAll(
  accessToken: string,
  path: string,
  params: Record<string, string> = {},
): AsyncGenerator<Record<string, unknown>[]> {
  const basePath = path;
  let nextToken: string | undefined = undefined;
  const limit = params.limit ?? "25";

  while (true) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (k === "limit") continue;
      qs.set(k, v);
    }
    qs.set("limit", limit);
    if (nextToken) qs.set("nextToken", nextToken);

    const page = (await whoopFetch(
      accessToken,
      `${basePath}?${qs.toString()}`,
    )) as WhoopPage | null;

    if (!page || !Array.isArray(page.records)) return;
    if (page.records.length > 0) yield page.records;
    if (!page.next_token) return;
    nextToken = page.next_token;
  }
}

async function readStoredRefreshToken(env: WhoopEnv): Promise<string | null> {
  const base = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return null;
  try {
    const r = await fetch(
      `${base}/rest/v1/whoop_tokens?id=eq.current&select=refresh_token`,
      { headers: { apikey: key, authorization: `Bearer ${key}` } },
    );
    if (!r.ok) return null;
    const rows = (await r.json()) as Array<{ refresh_token?: string }>;
    const val = rows?.[0]?.refresh_token;
    return val && val.length > 0 ? val : null;
  } catch {
    return null;
  }
}

async function writeStoredRefreshToken(
  env: WhoopEnv,
  refreshToken: string,
): Promise<void> {
  const base = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return;
  try {
    await fetch(`${base}/rest/v1/whoop_tokens?id=eq.current`, {
      method: "PATCH",
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
        prefer: "return=minimal",
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
        updated_at: new Date().toISOString(),
      }),
    });
  } catch {
    // swallow: persistence failures shouldn't fail the request in-flight.
  }
}
