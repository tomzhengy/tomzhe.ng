/**
 * framework-neutral handler for the health dashboard data source.
 *
 * called from two places:
 *   - functions/api/health.ts (cloudflare pages function, prod + wrangler dev)
 *   - app/api/health/route.ts (next.js dev, bun dev)
 *
 * flow per request:
 *   1. exchange rotating refresh token (via app/lib/whoop.ts)
 *   2. fetch today's cycle / recovery / sleep / recent workouts live
 *   3. upsert those records into supabase archive (best-effort, fire-and-forget)
 *   4. read the trend window (last 30 days) from supabase instead of calling
 *      whoop three more times — lifts the 25-day api limit and gives us a
 *      device-agnostic historical view
 *   5. generate varied editorial copy via openrouter
 */

import { exchangeRefreshToken, whoopFetch, type WhoopEnv } from "./whoop";
import { readTrendSince, upsertBatch, type TrendPoint } from "./health-archive";

export type { TrendPoint };

export interface HealthEnv extends WhoopEnv {
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODEL?: string;
}

export interface HealthPayload {
  state: "ok" | "error";
  syncedAt: number;
  cycle: Record<string, unknown> | null;
  recovery: Record<string, unknown> | null;
  sleep: Record<string, unknown> | null;
  workouts: Record<string, unknown>[];
  trend: TrendPoint[];
  copy: Record<string, unknown> | null;
  message?: string;
}

const SOURCE = "whoop";
const TREND_DAYS = 30;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash-lite";

export async function fetchHealthData(env: HealthEnv): Promise<HealthPayload> {
  try {
    ensureEnv(env);
    const accessToken = await exchangeRefreshToken(env);

    const [latestCycle, latestRecovery, latestSleep, latestWorkouts] =
      await Promise.all([
        whoopFetch(accessToken, "/cycle?limit=1"),
        whoopFetch(accessToken, "/recovery?limit=1"),
        whoopFetch(accessToken, "/activity/sleep?limit=1"),
        whoopFetch(accessToken, "/activity/workout?limit=25"),
      ]);

    const cycle = firstRecord(latestCycle);
    const recovery = firstRecord(latestRecovery);
    const sleep = firstRecord(latestSleep);
    const workouts = listRecords(latestWorkouts);

    // side-effect: archive what we saw. failures are logged but don't block.
    await upsertBatch(env, SOURCE, {
      cycles: cycle ? [cycle] : [],
      recoveries: recovery ? [recovery] : [],
      sleeps: sleep ? [sleep] : [],
      workouts,
    });

    const sinceIso = new Date(
      Date.now() - TREND_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
    const trend = await readTrendSince(env, SOURCE, sinceIso);

    const copy = await generateCopy(env, { cycle, recovery, sleep, trend });

    return {
      state: "ok",
      syncedAt: Date.now(),
      cycle,
      recovery,
      sleep,
      workouts: workouts.slice(0, 5),
      trend,
      copy,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      state: "error",
      syncedAt: Date.now(),
      cycle: null,
      recovery: null,
      sleep: null,
      workouts: [],
      trend: [],
      copy: null,
      message,
    };
  }
}

function ensureEnv(env: HealthEnv) {
  const missing: string[] = [];
  if (!env.WHOOP_CLIENT_ID) missing.push("WHOOP_CLIENT_ID");
  if (!env.WHOOP_CLIENT_SECRET) missing.push("WHOOP_CLIENT_SECRET");
  if (!env.OPENROUTER_API_KEY) missing.push("OPENROUTER_API_KEY");
  if (missing.length) {
    throw new Error(`missing env: ${missing.join(", ")}`);
  }
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

async function generateCopy(
  env: HealthEnv,
  shaped: {
    cycle: Record<string, unknown> | null;
    recovery: Record<string, unknown> | null;
    sleep: Record<string, unknown> | null;
    trend: TrendPoint[];
  },
): Promise<Record<string, unknown> | null> {
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
        authorization: `Bearer ${env.OPENROUTER_API_KEY!}`,
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
