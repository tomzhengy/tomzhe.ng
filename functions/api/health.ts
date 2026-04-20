/**
 * cloudflare pages function: GET /api/health
 *
 * fetches the user's latest whoop data (via refresh-token oauth flow) and
 * asks openrouter for varied editorial copy, returns a single combined json.
 * cached at the edge for 5 minutes.
 */

interface Env {
  WHOOP_CLIENT_ID: string;
  WHOOP_CLIENT_SECRET: string;
  WHOOP_REFRESH_TOKEN: string;
  OPENROUTER_API_KEY: string;
  OPENROUTER_MODEL?: string;
}

interface EventContext {
  request: Request;
  env: Env;
  waitUntil: (p: Promise<unknown>) => void;
}

const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
const WHOOP_API = "https://api.prod.whoop.com/developer/v2";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash-lite";
const CACHE_TTL_SECONDS = 300;

export const onRequestGet = async (ctx: EventContext) => {
  const { request, env, waitUntil } = ctx;

  const cache = (globalThis as unknown as { caches?: CacheStorage }).caches;
  const cacheKey = new Request(new URL(request.url).origin + "/api/health", {
    method: "GET",
  });

  if (cache && "default" in cache) {
    const edgeCache = (cache as unknown as { default: Cache }).default;
    const cached = await edgeCache.match(cacheKey);
    if (cached) return cached;
  }

  try {
    ensureEnv(env);

    const accessToken = await exchangeRefreshToken(env);

    const [
      latestCycle,
      latestRecovery,
      latestSleep,
      latestWorkouts,
      trendCycles,
      trendRecoveries,
      trendSleeps,
    ] = await Promise.all([
      whoopFetch(accessToken, "/cycle?limit=1"),
      whoopFetch(accessToken, "/recovery?limit=1"),
      whoopFetch(accessToken, "/activity/sleep?limit=1"),
      whoopFetch(accessToken, "/activity/workout?limit=5"),
      whoopFetch(accessToken, "/cycle?limit=30"),
      whoopFetch(accessToken, "/recovery?limit=30"),
      whoopFetch(accessToken, "/activity/sleep?limit=30"),
    ]);

    const cycle = firstRecord(latestCycle);
    const recovery = firstRecord(latestRecovery);
    const sleep = firstRecord(latestSleep);
    const workouts = listRecords(latestWorkouts);

    const trend = buildTrend(trendCycles, trendRecoveries, trendSleeps);

    const copy = await generateCopy(env, { cycle, recovery, sleep, trend });

    const payload = {
      state: "ok" as const,
      syncedAt: Date.now(),
      cycle,
      recovery,
      sleep,
      workouts,
      trend,
      copy,
    };

    const body = JSON.stringify(payload);
    const response = new Response(body, {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": `public, max-age=${CACHE_TTL_SECONDS}, s-maxage=${CACHE_TTL_SECONDS}`,
      },
    });

    if (cache && "default" in cache) {
      const edgeCache = (cache as unknown as { default: Cache }).default;
      waitUntil(edgeCache.put(cacheKey, response.clone()));
    }
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({
        state: "error",
        syncedAt: Date.now(),
        cycle: null,
        recovery: null,
        sleep: null,
        workouts: [],
        trend: [],
        copy: null,
        message,
      }),
      {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8" },
      },
    );
  }
};

function ensureEnv(env: Env) {
  const missing: string[] = [];
  if (!env.WHOOP_CLIENT_ID) missing.push("WHOOP_CLIENT_ID");
  if (!env.WHOOP_CLIENT_SECRET) missing.push("WHOOP_CLIENT_SECRET");
  if (!env.WHOOP_REFRESH_TOKEN) missing.push("WHOOP_REFRESH_TOKEN");
  if (!env.OPENROUTER_API_KEY) missing.push("OPENROUTER_API_KEY");
  if (missing.length) {
    throw new Error(`missing env: ${missing.join(", ")}`);
  }
}

async function exchangeRefreshToken(env: Env): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: env.WHOOP_REFRESH_TOKEN,
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
  const json = (await r.json()) as { access_token?: string };
  if (!json.access_token)
    throw new Error("whoop token response missing access_token");
  return json.access_token;
}

async function whoopFetch(accessToken: string, path: string): Promise<unknown> {
  const r = await fetch(`${WHOOP_API}${path}`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`whoop ${path} failed: ${r.status} ${t}`);
  }
  return r.json();
}

function firstRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const records = (raw as { records?: unknown[] }).records;
  if (!Array.isArray(records) || records.length === 0) return null;
  return records[0] as Record<string, unknown>;
}

function listRecords(raw: unknown): Record<string, unknown>[] {
  if (!raw || typeof raw !== "object") return [];
  const records = (raw as { records?: unknown[] }).records;
  if (!Array.isArray(records)) return [];
  return records as Record<string, unknown>[];
}

function buildTrend(
  cyclesRaw: unknown,
  recoveriesRaw: unknown,
  sleepsRaw: unknown,
) {
  const cycles = listRecords(cyclesRaw);
  const recoveries = listRecords(recoveriesRaw);
  const sleeps = listRecords(sleepsRaw);

  const cycleByDate = new Map<string, Record<string, unknown>>();
  for (const c of cycles) {
    const start = c.start as string | undefined;
    if (!start) continue;
    const key = start.slice(0, 10);
    cycleByDate.set(key, c);
  }

  const recByCycle = new Map<string, Record<string, unknown>>();
  for (const r of recoveries) {
    const cid = r.cycle_id;
    if (cid != null) recByCycle.set(String(cid), r);
  }

  const sleepByDate = new Map<string, Record<string, unknown>>();
  for (const s of sleeps) {
    const start = s.start as string | undefined;
    if (!start) continue;
    const key = start.slice(0, 10);
    sleepByDate.set(key, s);
  }

  const points: Array<{
    date: string;
    recovery: number | null;
    strain: number | null;
    sleep: number | null;
    hrv: number | null;
    rhr: number | null;
  }> = [];

  const keys = Array.from(cycleByDate.keys()).sort();
  for (const key of keys) {
    const c = cycleByDate.get(key)!;
    const cScore = (c.score ?? null) as Record<string, unknown> | null;
    const recoveryRec = recByCycle.get(String(c.id));
    const rScore = (recoveryRec?.score ?? null) as Record<
      string,
      unknown
    > | null;
    const sleepRec = sleepByDate.get(key);
    const sScore = (sleepRec?.score ?? null) as Record<string, unknown> | null;
    const stageSummary = (sScore?.stage_summary ?? null) as Record<
      string,
      number
    > | null;
    const asleepHrs = stageSummary
      ? Math.max(
          0,
          (stageSummary.total_in_bed_time_milli -
            (stageSummary.total_awake_time_milli ?? 0)) /
            3_600_000,
        )
      : null;

    points.push({
      date: key,
      recovery: numOrNull(rScore?.recovery_score),
      strain: numOrNull(cScore?.strain),
      sleep: asleepHrs,
      hrv: numOrNull(rScore?.hrv_rmssd_milli),
      rhr: numOrNull(rScore?.resting_heart_rate),
    });
  }

  return points;
}

function numOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

async function generateCopy(
  env: Env,
  shaped: {
    cycle: Record<string, unknown> | null;
    recovery: Record<string, unknown> | null;
    sleep: Record<string, unknown> | null;
    trend: Array<{
      recovery: number | null;
      strain: number | null;
      sleep: number | null;
    }>;
  },
) {
  const model = env.OPENROUTER_MODEL || DEFAULT_MODEL;

  const summary = {
    recovery_score:
      (shaped.recovery?.score as { recovery_score?: number } | undefined)
        ?.recovery_score ?? null,
    strain:
      (shaped.cycle?.score as { strain?: number } | undefined)?.strain ?? null,
    hrv:
      (shaped.recovery?.score as { hrv_rmssd_milli?: number } | undefined)
        ?.hrv_rmssd_milli ?? null,
    rhr:
      (shaped.recovery?.score as { resting_heart_rate?: number } | undefined)
        ?.resting_heart_rate ?? null,
    skin_temp:
      (shaped.recovery?.score as { skin_temp_celsius?: number } | undefined)
        ?.skin_temp_celsius ?? null,
    sleep_performance:
      (
        shaped.sleep?.score as
          | { sleep_performance_percentage?: number }
          | undefined
      )?.sleep_performance_percentage ?? null,
    sleep_efficiency:
      (
        shaped.sleep?.score as
          | { sleep_efficiency_percentage?: number }
          | undefined
      )?.sleep_efficiency_percentage ?? null,
    trend_recent_recoveries: shaped.trend
      .slice(-7)
      .map((t) => t.recovery)
      .filter((v): v is number => v != null),
  };

  const systemPrompt = [
    "You write brief, warm, editorial-tone health copy for a personal dashboard.",
    "Vary phrasing day to day so it never feels templated.",
    "Output STRICT JSON only. No prose outside the JSON.",
    "Wrap exactly one key word in <em>...</em> for headline, strainCopy, sleepCopy.",
    "Wrap one number in <b>...</b> inside sub and strainCopy and sleepCopy when it helps anchor the sentence.",
    "Use plain text (no <em>/<b>) inside the journal fields.",
    "Keep headline under 10 words. Keep sub to 1–2 sentences.",
  ].join(" ");

  const userPrompt = `Today's WHOOP summary: ${JSON.stringify(summary)}. Return JSON matching: { "headline": string, "sub": string, "strainCopy": string, "sleepCopy": string, "journal": { "weekly": string, "watch": string, "checkIn": string } }`;

  try {
    const r = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 500,
        temperature: 0.85,
      }),
    });
    if (!r.ok) return null;
    const json = (await r.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content);
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed;
  } catch {
    return null;
  }
}
