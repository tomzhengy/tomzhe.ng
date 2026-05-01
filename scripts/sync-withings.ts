#!/usr/bin/env bun
/**
 * withings archive backfill + gap-fill.
 *
 * usage:
 *   bun run scripts/sync-withings.ts                        # walk everything withings will give us
 *   bun run scripts/sync-withings.ts --since=2024-01-01     # only records newer than the date
 *
 * env (via .env.local or process.env, same as the live handler):
 *   WITHINGS_CLIENT_ID, WITHINGS_CLIENT_SECRET
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * no WITHINGS_REFRESH_TOKEN env is needed when the rotating token already
 * lives in supabase via the withings_tokens table; first-time runs can pass
 * one through env until the row is seeded.
 *
 * idempotent: upserts with merge-duplicates on (source, external_id). safe
 * to re-run.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  exchangeWithingsRefreshToken,
  withingsGetMeasAll,
  type WithingsEnv,
} from "../app/lib/withings";
import {
  upsertBodyMeasurements,
  type ArchiveEnv,
} from "../app/lib/health-archive";

const SOURCE = "withings";

// meastype codes we care about — the typed columns on
// health_body_measurements. raw `measuregrp` is also stored as jsonb so
// segmental composition / undocumented types remain accessible later.
//   1  weight                5  fat-free mass        6  body fat %
//   8  fat mass              11 heart pulse          76 muscle mass
//   77 hydration             88 bone mass            91 pulse wave velocity
//   155 vascular age         168 extracellular water 169 intracellular water
//   170 visceral fat         226 basal metabolic rate
const MEASTYPES = "1,5,6,8,11,76,77,88,91,155,168,169,170,226";

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

function parseArgs(): { since?: string } {
  const out: { since?: string } = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--since=")) out.since = arg.slice("--since=".length);
  }
  return out;
}

async function main() {
  const envFile = await loadEnvFile(join(process.cwd(), ".env.local"));
  const env: WithingsEnv & ArchiveEnv = {
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

  const missing: string[] = [];
  if (!env.WITHINGS_CLIENT_ID) missing.push("WITHINGS_CLIENT_ID");
  if (!env.WITHINGS_CLIENT_SECRET) missing.push("WITHINGS_CLIENT_SECRET");
  if (!env.NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length) {
    console.error(`missing env: ${missing.join(", ")}`);
    process.exit(1);
  }

  const args = parseArgs();
  const params: Record<string, string> = {
    meastype: MEASTYPES,
    category: "1",
  };
  if (args.since) {
    const startMs = new Date(args.since).getTime();
    if (Number.isNaN(startMs)) {
      console.error(`invalid --since date: ${args.since}`);
      process.exit(1);
    }
    params.startdate = String(Math.floor(startMs / 1000));
    console.log(`walking withings since ${args.since} (${params.startdate})`);
  } else {
    console.log("walking withings from the beginning (no --since flag)");
  }

  const accessToken = await exchangeWithingsRefreshToken(env);

  console.log("\nbody measurements:");
  let count = 0;
  let oldest: number | null = null;
  let newest: number | null = null;
  for await (const page of withingsGetMeasAll(accessToken, params)) {
    count += page.length;
    for (const grp of page) {
      const d = grp.date;
      if (typeof d === "number") {
        if (oldest == null || d < oldest) oldest = d;
        if (newest == null || d > newest) newest = d;
      }
    }
    await upsertBodyMeasurements(
      env,
      SOURCE,
      page as unknown as Record<string, unknown>[],
    );
    process.stdout.write(`  body: +${page.length} (total ${count})\r`);
  }
  process.stdout.write("\n");

  console.log("\ndone.");
  console.table({
    body: {
      count,
      oldest: oldest != null ? new Date(oldest * 1000).toISOString() : null,
      newest: newest != null ? new Date(newest * 1000).toISOString() : null,
    },
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
