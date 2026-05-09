#!/usr/bin/env bun
/**
 * one-shot probe: call withings getmeas with no meastype filter to discover
 * every measurement code the user's devices actually report. used for
 * deciding which columns to add to the body archive table.
 *
 * usage: bun run scripts/withings-probe.ts
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
	exchangeWithingsRefreshToken,
	withingsGetMeas,
	type WithingsEnv,
} from "../app/lib/withings";

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
	const env: WithingsEnv = {
		WITHINGS_CLIENT_ID:
			process.env.WITHINGS_CLIENT_ID ?? envFile.WITHINGS_CLIENT_ID,
		WITHINGS_CLIENT_SECRET:
			process.env.WITHINGS_CLIENT_SECRET ?? envFile.WITHINGS_CLIENT_SECRET,
		WITHINGS_REFRESH_TOKEN:
			process.env.WITHINGS_REFRESH_TOKEN ?? envFile.WITHINGS_REFRESH_TOKEN,
		NEXT_PUBLIC_SUPABASE_URL:
			process.env.NEXT_PUBLIC_SUPABASE_URL ?? envFile.NEXT_PUBLIC_SUPABASE_URL,
		SUPABASE_SERVICE_ROLE_KEY:
			process.env.SUPABASE_SERVICE_ROLE_KEY ??
			envFile.SUPABASE_SERVICE_ROLE_KEY,
	};

	const accessToken = await exchangeWithingsRefreshToken(env);

	// grab everything from the last 60 days, no meastype filter, no category filter
	const startMs = Date.now() - 60 * 24 * 60 * 60 * 1000;
	const page = await withingsGetMeas(accessToken, {
		startdate: String(Math.floor(startMs / 1000)),
	});

	console.log(`measuregrps: ${page.measuregrps.length}`);
	console.log("\ndistinct meastypes seen (with a sample real value):\n");

	const seen = new Map<
		number,
		{ count: number; sample: number; unit: number }
	>();
	for (const grp of page.measuregrps) {
		for (const m of grp.measures ?? []) {
			const t = m.type;
			if (typeof t !== "number") continue;
			const real =
				typeof m.value === "number" && typeof m.unit === "number"
					? m.value * Math.pow(10, m.unit)
					: NaN;
			const prev = seen.get(t);
			if (!prev) {
				seen.set(t, { count: 1, sample: real, unit: m.unit });
			} else {
				prev.count += 1;
			}
		}
	}

	const rows = Array.from(seen.entries())
		.sort((a, b) => a[0] - b[0])
		.map(([type, info]) => ({
			meastype: type,
			seen: info.count,
			sample: Number.isFinite(info.sample) ? info.sample.toFixed(3) : "—",
			unitExp: info.unit,
		}));
	console.table(rows);

	// also show one full measuregrp so we can eyeball the device + grp shape
	console.log("\nfirst measuregrp (raw):");
	console.log(JSON.stringify(page.measuregrps[0], null, 2));
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
