/**
 * framework-neutral handler for the health dashboard data source.
 *
 * supabase IS the source of truth. the per-record tables (cycles,
 * recoveries, sleeps, workouts, body_measurements) are populated by
 * the cron and the sync button — never by the request path.
 *
 * two entry points:
 *   - fetchHealthData: read-only path used by GET /api/health. assembles
 *     the dashboard payload from the per-record tables in parallel.
 *     never calls whoop/withings/openrouter.
 *   - computeAndCacheHealthPayload: live-fetch path used by the cron and
 *     by POST /api/health/sync. exchanges tokens, hits whoop/withings,
 *     upserts the per-record tables. only calls openrouter when the
 *     hashed input summary differs from the last cached copy.
 */

import { exchangeRefreshToken, whoopFetch, type WhoopEnv } from "./whoop";
import {
	exchangeWithingsRefreshToken,
	withingsGetMeas,
	type WithingsEnv,
} from "./withings";
import {
	buildTrendFromRecords,
	readTrendSince,
	upsertBatch,
	upsertBodyMeasurements,
	readBodyMeasurementsSince,
	readLatestBodyMeasurement,
	readHealthCopyCache,
	writeHealthCopyCache,
	readLatestRaw,
	readRecentRaw,
	readRecoveryByCycleId,
	type BodyMeasurementRow,
	type TrendPoint,
} from "./health-archive";

export type { TrendPoint };

export interface HealthEnv extends WhoopEnv, WithingsEnv {
	OPENROUTER_API_KEY?: string;
	OPENROUTER_MODEL?: string;
}

export interface BodyMeasurementOut {
	measuredAt: string;
	weightKg: number | null;
	bodyFatPct: number | null;
	fatMassKg: number | null;
	fatFreeMassKg: number | null;
	muscleMassKg: number | null;
	hydrationKg: number | null;
	boneMassKg: number | null;
	heightM: number | null;
	heartRateBpm: number | null;
	pulseWaveVelocityMs: number | null;
	vascularAgeYears: number | null;
	extracellularWaterKg: number | null;
	intracellularWaterKg: number | null;
	visceralFat: number | null;
	basalMetabolicRateKcal: number | null;
}

export interface BodyData {
	latest: BodyMeasurementOut | null;
	trend: BodyMeasurementOut[];
}

export interface HealthPayload {
	state: "ok" | "error";
	syncedAt: number;
	cycle: Record<string, unknown> | null;
	recovery: Record<string, unknown> | null;
	sleep: Record<string, unknown> | null;
	workouts: Record<string, unknown>[];
	trend: TrendPoint[];
	body: BodyData | null;
	copy: Record<string, unknown> | null;
	message?: string;
}

const SOURCE = "whoop";
const WITHINGS_SOURCE = "withings";
const TREND_DAYS = 30;
// window for live ingest of new measurements only — the archive read returns
// all-time data so the client can slice it on demand.
const BODY_LIVE_DAYS = 90;
const BODY_ARCHIVE_EPOCH = "1970-01-01T00:00:00.000Z";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash-lite";

/**
 * read-only entry point for GET /api/health. assembles the dashboard
 * payload by querying the per-record tables in parallel. never touches
 * whoop, withings, or openrouter — those are the cron's job.
 */
export async function fetchHealthData(env: HealthEnv): Promise<HealthPayload> {
	try {
		const sinceIso = new Date(
			Date.now() - TREND_DAYS * 24 * 60 * 60 * 1000,
		).toISOString();

		const [cycle, sleep, workouts, trend, body, copyCache] = await Promise.all([
			readLatestRaw(env, "health_cycles", SOURCE, "start_at"),
			readLatestRaw(env, "health_sleeps", SOURCE, "start_at"),
			readRecentRaw(env, "health_workouts", SOURCE, "start_at", 5),
			readTrendSince(env, SOURCE, sinceIso),
			readBodyArchive(env),
			readHealthCopyCache(env),
		]);

		// recovery is keyed by cycle external_id, so we need the cycle first.
		// worst case this adds one round-trip on top of the parallel batch.
		const recovery =
			cycle && cycle.id != null
				? await readRecoveryByCycleId(env, SOURCE, String(cycle.id))
				: null;

		return {
			state: "ok",
			syncedAt: copyCache ? new Date(copyCache.syncedAt).getTime() : Date.now(),
			cycle,
			recovery,
			sleep,
			workouts,
			trend,
			body,
			copy: copyCache?.copy ?? null,
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
			body: null,
			copy: null,
			message,
		};
	}
}

/**
 * live-fetch entry point used by the cron and POST /api/health/sync.
 * exchanges tokens, hits whoop + withings, upserts the per-record
 * tables, and regenerates editorial copy only when the hashed input
 * summary differs from the last cached copy.
 */
export async function computeAndCacheHealthPayload(
	env: HealthEnv,
): Promise<HealthPayload> {
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

		// withings: live fetch + upsert, then read the full archive for the
		// dashboard. separated from the read path so /api/health stays pure.
		const body = await syncBodyLive(env);

		const sinceIso = new Date(
			Date.now() - TREND_DAYS * 24 * 60 * 60 * 1000,
		).toISOString();
		let trend = await readTrendSince(env, SOURCE, sinceIso);

		// fallback: if the archive is empty (migration not run yet, or first
		// boot) fetch trend live from whoop so the chart isn't blank.
		if (trend.length === 0) {
			trend = await fetchTrendLive(accessToken);
		}

		// regen copy only when the summary inputs changed. otherwise reuse the
		// existing cached copy and just bump synced_at so the dashboard's
		// staleness indicator stays accurate.
		const summary = buildCopySummary({ cycle, recovery, sleep, trend });
		const inputHash = await hashSummary(summary);
		const cached = await readHealthCopyCache(env);
		let copy: Record<string, unknown> | null;
		if (cached && cached.inputHash === inputHash) {
			copy = cached.copy;
		} else {
			copy = await generateCopy(env, summary);
		}
		if (copy) {
			await writeHealthCopyCache(env, inputHash, copy);
		}

		return {
			state: "ok",
			syncedAt: Date.now(),
			cycle,
			recovery,
			sleep,
			workouts: workouts.slice(0, 5),
			trend,
			body,
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
			body: null,
			copy: null,
			message,
		};
	}
}

async function hashSummary(summary: Record<string, unknown>): Promise<string> {
	const buf = new TextEncoder().encode(JSON.stringify(summary));
	const digest = await crypto.subtle.digest("SHA-256", buf);
	return Array.from(new Uint8Array(digest))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

function rowToBody(row: BodyMeasurementRow): BodyMeasurementOut {
	return {
		measuredAt: row.measured_at,
		weightKg: row.weight_kg,
		bodyFatPct: row.body_fat_pct,
		fatMassKg: row.fat_mass_kg,
		fatFreeMassKg: row.fat_free_mass_kg,
		muscleMassKg: row.muscle_mass_kg,
		hydrationKg: row.hydration_kg,
		boneMassKg: row.bone_mass_kg,
		heightM: row.height_m,
		heartRateBpm: row.heart_rate_bpm,
		pulseWaveVelocityMs: row.pulse_wave_velocity_ms,
		vascularAgeYears: row.vascular_age_years,
		extracellularWaterKg: row.extracellular_water_kg,
		intracellularWaterKg: row.intracellular_water_kg,
		visceralFat: row.visceral_fat,
		basalMetabolicRateKcal: row.basal_metabolic_rate_kcal,
	};
}

/**
 * read body data straight from the supabase archive. used by the read
 * path; never calls withings.
 */
async function readBodyArchive(env: HealthEnv): Promise<BodyData | null> {
	try {
		const archiveRows = await readBodyMeasurementsSince(
			env,
			WITHINGS_SOURCE,
			BODY_ARCHIVE_EPOCH,
		);
		if (archiveRows.length === 0) {
			// archive may be empty if no weigh-ins are recent — fall back to
			// the all-time latest so the hero still has something to render.
			const latestRow = await readLatestBodyMeasurement(env, WITHINGS_SOURCE);
			if (!latestRow) return null;
			return { latest: rowToBody(latestRow), trend: [] };
		}
		const trend = archiveRows.map(rowToBody);
		const latest = trend[trend.length - 1] ?? null;
		return { latest, trend };
	} catch (err) {
		console.warn("readBodyArchive error:", err);
		return null;
	}
}

/**
 * cron-only path: fetch the recent withings page live, upsert into
 * supabase, and return the assembled body data. silently no-ops when
 * withings env isn't configured.
 */
async function syncBodyLive(env: HealthEnv): Promise<BodyData | null> {
	if (!env.WITHINGS_CLIENT_ID || !env.WITHINGS_CLIENT_SECRET) {
		return readBodyArchive(env);
	}
	try {
		const accessToken = await exchangeWithingsRefreshToken(env);
		const startMs = Date.now() - BODY_LIVE_DAYS * 24 * 60 * 60 * 1000;
		const page = await withingsGetMeas(accessToken, {
			meastype: "1,4,5,6,8,11,76,77,88,91,155,168,169,170,226",
			category: "1",
			startdate: String(Math.floor(startMs / 1000)),
		});

		if (page.measuregrps.length > 0) {
			await upsertBodyMeasurements(
				env,
				WITHINGS_SOURCE,
				page.measuregrps as unknown as Record<string, unknown>[],
			);
		}

		return readBodyArchive(env);
	} catch (err) {
		console.warn("withings syncBodyLive error:", err);
		return readBodyArchive(env);
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

async function fetchTrendLive(accessToken: string): Promise<TrendPoint[]> {
	const [cyclesRaw, recoveriesRaw, sleepsRaw] = await Promise.all([
		whoopFetch(accessToken, "/cycle?limit=25"),
		whoopFetch(accessToken, "/recovery?limit=25"),
		whoopFetch(accessToken, "/activity/sleep?limit=25"),
	]);

	const cycles = listRecords(cyclesRaw)
		.filter((c) => c.id != null && typeof c.start === "string")
		.map((c) => ({
			external_id: String(c.id),
			start_at: c.start as string,
			score: (c.score ?? null) as Record<string, unknown> | null,
		}));
	const recoveries = listRecords(recoveriesRaw)
		.filter((r) => r.cycle_id != null)
		.map((r) => ({
			external_id: String(r.cycle_id),
			score: (r.score ?? null) as Record<string, unknown> | null,
		}));
	const sleeps = listRecords(sleepsRaw)
		.filter((s) => typeof s.start === "string")
		.map((s) => ({
			start_at: s.start as string,
			score: (s.score ?? null) as Record<string, unknown> | null,
		}));

	return buildTrendFromRecords(cycles, recoveries, sleeps);
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

function buildCopySummary(shaped: {
	cycle: Record<string, unknown> | null;
	recovery: Record<string, unknown> | null;
	sleep: Record<string, unknown> | null;
	trend: TrendPoint[];
}): Record<string, unknown> {
	return {
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
}

async function generateCopy(
	env: HealthEnv,
	summary: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
	const model = env.OPENROUTER_MODEL || DEFAULT_MODEL;

	const systemPrompt = [
		"You write warm, editorial-tone health copy for a compact personal dashboard.",
		"Write naturally — connecting words like 'and', 'but', 'so', 'with' are welcome when they make the line read better.",
		"Vary phrasing day to day so it never feels templated.",
		"Output STRICT JSON only. No prose outside the JSON.",
		"Wrap exactly one key word in <em>...</em> for headline, strainCopy, sleepCopy.",
		"Wrap one number in <b>...</b> inside sub, strainCopy, and sleepCopy when it helps anchor the sentence.",
		"Use plain text (no <em>/<b>) inside the journal fields.",
		"Hard limit: every field is at most 2 sentences. Headline is one short phrase.",
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
