/**
 * supabase helpers for the health archive tables.
 *
 * direct fetch() against the postgrest rest api — no @supabase/supabase-js
 * dependency (matches the pattern set in whoop.ts). service_role key bypasses
 * rls; never expose to client.
 */

export interface ArchiveEnv {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

export interface TrendPoint {
  date: string;
  recovery: number | null;
  strain: number | null;
  sleep: number | null;
  hrv: number | null;
  rhr: number | null;
}

interface UpsertRow {
  source: string;
  external_id: string;
  // everything else varies per table
  [key: string]: unknown;
}

function supaConfig(env: ArchiveEnv): { base: string; key: string } | null {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  return {
    base: env.NEXT_PUBLIC_SUPABASE_URL,
    key: env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

async function upsert(
  env: ArchiveEnv,
  table: string,
  rows: UpsertRow[],
): Promise<void> {
  if (rows.length === 0) return;
  const cfg = supaConfig(env);
  if (!cfg) return;
  try {
    const r = await fetch(`${cfg.base}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        apikey: cfg.key,
        authorization: `Bearer ${cfg.key}`,
        "content-type": "application/json",
        prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(rows),
    });
    if (!r.ok) {
      const body = await r.text();
      // log loudly but don't throw — archive failures shouldn't nuke reads.
      console.warn(`supabase upsert ${table} failed: ${r.status} ${body}`);
    }
  } catch (err) {
    console.warn(`supabase upsert ${table} error:`, err);
  }
}

function toCycleRow(
  source: string,
  r: Record<string, unknown>,
): UpsertRow | null {
  const id = r.id;
  const start = r.start as string | undefined;
  if (id == null || !start) return null;
  return {
    source,
    external_id: String(id),
    start_at: start,
    end_at: (r.end as string | null) ?? null,
    score: r.score ?? null,
    raw: r,
  };
}

function toRecoveryRow(
  source: string,
  r: Record<string, unknown>,
): UpsertRow | null {
  const cid = r.cycle_id;
  if (cid == null) return null;
  return {
    source,
    external_id: String(cid),
    score: r.score ?? null,
    raw: r,
  };
}

function toSleepRow(
  source: string,
  r: Record<string, unknown>,
): UpsertRow | null {
  const id = r.id;
  const start = r.start as string | undefined;
  const end = r.end as string | undefined;
  if (id == null || !start || !end) return null;
  return {
    source,
    external_id: String(id),
    start_at: start,
    end_at: end,
    nap: Boolean(r.nap),
    score: r.score ?? null,
    raw: r,
  };
}

function toWorkoutRow(
  source: string,
  r: Record<string, unknown>,
): UpsertRow | null {
  const id = r.id;
  const start = r.start as string | undefined;
  if (id == null || !start) return null;
  return {
    source,
    external_id: String(id),
    start_at: start,
    end_at: (r.end as string | null) ?? null,
    sport_name: (r.sport_name as string | null) ?? null,
    score: r.score ?? null,
    raw: r,
  };
}

export async function upsertBatch(
  env: ArchiveEnv,
  source: string,
  batch: {
    cycles?: Record<string, unknown>[];
    recoveries?: Record<string, unknown>[];
    sleeps?: Record<string, unknown>[];
    workouts?: Record<string, unknown>[];
  },
): Promise<void> {
  const cycles = (batch.cycles ?? [])
    .map((r) => toCycleRow(source, r))
    .filter((v): v is UpsertRow => v != null);
  const recoveries = (batch.recoveries ?? [])
    .map((r) => toRecoveryRow(source, r))
    .filter((v): v is UpsertRow => v != null);
  const sleeps = (batch.sleeps ?? [])
    .map((r) => toSleepRow(source, r))
    .filter((v): v is UpsertRow => v != null);
  const workouts = (batch.workouts ?? [])
    .map((r) => toWorkoutRow(source, r))
    .filter((v): v is UpsertRow => v != null);

  await Promise.all([
    upsert(env, "health_cycles", cycles),
    upsert(env, "health_recoveries", recoveries),
    upsert(env, "health_sleeps", sleeps),
    upsert(env, "health_workouts", workouts),
  ]);
}

async function selectRange<T = Record<string, unknown>>(
  env: ArchiveEnv,
  table: string,
  source: string,
  sinceIso: string,
  select: string,
  orderCol: string = "start_at",
): Promise<T[]> {
  const cfg = supaConfig(env);
  if (!cfg) return [];
  const url =
    `${cfg.base}/rest/v1/${table}` +
    `?source=eq.${encodeURIComponent(source)}` +
    `&${orderCol}=gte.${encodeURIComponent(sinceIso)}` +
    `&select=${encodeURIComponent(select)}` +
    `&order=${orderCol}.asc&limit=1000`;
  const r = await fetch(url, {
    headers: { apikey: cfg.key, authorization: `Bearer ${cfg.key}` },
  });
  if (!r.ok) return [];
  return (await r.json()) as T[];
}

async function selectByIds<T = Record<string, unknown>>(
  env: ArchiveEnv,
  table: string,
  source: string,
  ids: string[],
  select: string,
): Promise<T[]> {
  if (ids.length === 0) return [];
  const cfg = supaConfig(env);
  if (!cfg) return [];
  const idList = ids.map((v) => `"${v}"`).join(",");
  const url =
    `${cfg.base}/rest/v1/${table}` +
    `?source=eq.${encodeURIComponent(source)}` +
    `&external_id=in.(${encodeURIComponent(idList)})` +
    `&select=${encodeURIComponent(select)}&limit=1000`;
  const r = await fetch(url, {
    headers: { apikey: cfg.key, authorization: `Bearer ${cfg.key}` },
  });
  if (!r.ok) return [];
  return (await r.json()) as T[];
}

function numOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * build the trend points from archive tables. joins cycles + recoveries +
 * sleeps by date (same logic as the removed buildTrend, but reading from
 * supabase rather than live whoop).
 */
export async function readTrendSince(
  env: ArchiveEnv,
  source: string,
  sinceIso: string,
): Promise<TrendPoint[]> {
  const [cycles, sleeps] = await Promise.all([
    selectRange<{
      external_id: string;
      start_at: string;
      score: Record<string, unknown> | null;
    }>(env, "health_cycles", source, sinceIso, "external_id,start_at,score"),
    selectRange<{
      start_at: string;
      score: Record<string, unknown> | null;
    }>(env, "health_sleeps", source, sinceIso, "start_at,score"),
  ]);

  const cycleIds = cycles.map((c) => c.external_id);
  const recoveries = await selectByIds<{
    external_id: string;
    score: Record<string, unknown> | null;
  }>(env, "health_recoveries", source, cycleIds, "external_id,score");

  const recByCycle = new Map<string, Record<string, unknown> | null>();
  for (const r of recoveries) {
    recByCycle.set(r.external_id, r.score);
  }

  const sleepByDate = new Map<string, Record<string, unknown> | null>();
  for (const s of sleeps) {
    const key = s.start_at.slice(0, 10);
    sleepByDate.set(key, s.score);
  }

  const points: TrendPoint[] = [];
  for (const c of cycles) {
    const date = c.start_at.slice(0, 10);
    const cScore = c.score;
    const rScore = recByCycle.get(c.external_id) ?? null;
    const sScore = sleepByDate.get(date) ?? null;
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
      date,
      recovery: numOrNull(
        (rScore as { recovery_score?: number } | null)?.recovery_score,
      ),
      strain: numOrNull((cScore as { strain?: number } | null)?.strain),
      sleep: asleepHrs,
      hrv: numOrNull(
        (rScore as { hrv_rmssd_milli?: number } | null)?.hrv_rmssd_milli,
      ),
      rhr: numOrNull(
        (rScore as { resting_heart_rate?: number } | null)?.resting_heart_rate,
      ),
    });
  }

  return points;
}
