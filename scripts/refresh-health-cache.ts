#!/usr/bin/env bun
/**
 * refresh the health_payload_cache row in supabase.
 *
 * runs on the github actions cron every ~15min. does the full live
 * fetch (whoop + withings + openrouter copy) that /api/health used
 * to do per-request, and writes the result so /api/health can serve
 * it instantly.
 *
 * usage:
 *   bun run scripts/refresh-health-cache.ts
 *
 * env (via .env.local or process.env):
 *   WHOOP_CLIENT_ID, WHOOP_CLIENT_SECRET
 *   WITHINGS_CLIENT_ID, WITHINGS_CLIENT_SECRET (optional)
 *   OPENROUTER_API_KEY, OPENROUTER_MODEL (optional)
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
	computeAndCacheHealthPayload,
	type HealthEnv,
} from "../app/lib/health-source";

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
	const env: HealthEnv = {
		WHOOP_CLIENT_ID: process.env.WHOOP_CLIENT_ID ?? envFile.WHOOP_CLIENT_ID,
		WHOOP_CLIENT_SECRET:
			process.env.WHOOP_CLIENT_SECRET ?? envFile.WHOOP_CLIENT_SECRET,
		WHOOP_REFRESH_TOKEN:
			process.env.WHOOP_REFRESH_TOKEN ?? envFile.WHOOP_REFRESH_TOKEN,
		WITHINGS_CLIENT_ID:
			process.env.WITHINGS_CLIENT_ID ?? envFile.WITHINGS_CLIENT_ID,
		WITHINGS_CLIENT_SECRET:
			process.env.WITHINGS_CLIENT_SECRET ?? envFile.WITHINGS_CLIENT_SECRET,
		WITHINGS_REFRESH_TOKEN:
			process.env.WITHINGS_REFRESH_TOKEN ?? envFile.WITHINGS_REFRESH_TOKEN,
		OPENROUTER_API_KEY:
			process.env.OPENROUTER_API_KEY ?? envFile.OPENROUTER_API_KEY,
		OPENROUTER_MODEL: process.env.OPENROUTER_MODEL ?? envFile.OPENROUTER_MODEL,
		NEXT_PUBLIC_SUPABASE_URL:
			process.env.NEXT_PUBLIC_SUPABASE_URL ?? envFile.NEXT_PUBLIC_SUPABASE_URL,
		SUPABASE_SERVICE_ROLE_KEY:
			process.env.SUPABASE_SERVICE_ROLE_KEY ??
			envFile.SUPABASE_SERVICE_ROLE_KEY,
	};

	const missing: string[] = [];
	if (!env.WHOOP_CLIENT_ID) missing.push("WHOOP_CLIENT_ID");
	if (!env.WHOOP_CLIENT_SECRET) missing.push("WHOOP_CLIENT_SECRET");
	if (!env.OPENROUTER_API_KEY) missing.push("OPENROUTER_API_KEY");
	if (!env.NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
	if (!env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
	if (missing.length) {
		console.error(`missing env: ${missing.join(", ")}`);
		process.exit(1);
	}

	const started = Date.now();
	const payload = await computeAndCacheHealthPayload(env);
	const elapsed = Date.now() - started;

	if (payload.state === "error") {
		console.error(`refresh failed in ${elapsed}ms:`, payload.message);
		process.exit(1);
	}

	console.log(`refreshed health cache in ${elapsed}ms`);
	console.log(
		`  cycle:${payload.cycle ? "y" : "n"} recovery:${payload.recovery ? "y" : "n"} sleep:${payload.sleep ? "y" : "n"} workouts:${payload.workouts.length} trend:${payload.trend.length} body:${payload.body?.trend.length ?? 0} copy:${payload.copy ? "y" : "n"}`,
	);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
