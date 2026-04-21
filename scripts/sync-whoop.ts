#!/usr/bin/env bun
/**
 * whoop archive backfill + gap-fill.
 *
 * usage:
 *   bun run scripts/sync-whoop.ts                        # walk everything whoop will give us
 *   bun run scripts/sync-whoop.ts --since=2025-01-01     # only records newer than the date
 *
 * env (via .env.local or process.env, same as the live handler):
 *   WHOOP_CLIENT_ID, WHOOP_CLIENT_SECRET
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * no WHOOP_REFRESH_TOKEN env is needed — the rotating token lives in
 * supabase via the whoop_tokens table, maintained by the shared client.
 *
 * idempotent: upserts with merge-duplicates. safe to re-run.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  exchangeRefreshToken,
  whoopFetchAll,
  type WhoopEnv,
} from "../app/lib/whoop";
import { upsertBatch, type ArchiveEnv } from "../app/lib/health-archive";

const SOURCE = "whoop";

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

async function walkAndArchive(
  env: WhoopEnv & ArchiveEnv,
  accessToken: string,
  path: string,
  key: "cycles" | "recoveries" | "sleeps" | "workouts",
  params: Record<string, string>,
): Promise<{ count: number; oldest: string | null; newest: string | null }> {
  let count = 0;
  let oldest: string | null = null;
  let newest: string | null = null;

  for await (const page of whoopFetchAll(accessToken, path, params)) {
    count += page.length;
    for (const rec of page) {
      const start = (rec.start as string | undefined) ?? null;
      if (start) {
        if (!oldest || start < oldest) oldest = start;
        if (!newest || start > newest) newest = start;
      }
    }
    await upsertBatch(env, SOURCE, { [key]: page });
    process.stdout.write(`  ${key}: +${page.length} (total ${count})\r`);
  }
  process.stdout.write("\n");
  return { count, oldest, newest };
}

async function main() {
  const envFile = await loadEnvFile(join(process.cwd(), ".env.local"));
  const env: WhoopEnv & ArchiveEnv = {
    WHOOP_CLIENT_ID: process.env.WHOOP_CLIENT_ID ?? envFile.WHOOP_CLIENT_ID,
    WHOOP_CLIENT_SECRET:
      process.env.WHOOP_CLIENT_SECRET ?? envFile.WHOOP_CLIENT_SECRET,
    WHOOP_REFRESH_TOKEN:
      process.env.WHOOP_REFRESH_TOKEN ?? envFile.WHOOP_REFRESH_TOKEN,
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? envFile.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY:
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      envFile.SUPABASE_SERVICE_ROLE_KEY,
  };

  const missing: string[] = [];
  if (!env.WHOOP_CLIENT_ID) missing.push("WHOOP_CLIENT_ID");
  if (!env.WHOOP_CLIENT_SECRET) missing.push("WHOOP_CLIENT_SECRET");
  if (!env.NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length) {
    console.error(`missing env: ${missing.join(", ")}`);
    process.exit(1);
  }

  const args = parseArgs();
  const baseParams: Record<string, string> = { limit: "25" };
  if (args.since) {
    // whoop v2 accepts `start` as an iso datetime
    baseParams.start = new Date(args.since).toISOString();
    console.log(`walking whoop since ${baseParams.start}`);
  } else {
    console.log("walking whoop from the beginning (no --since flag)");
  }

  const accessToken = await exchangeRefreshToken(env);

  console.log("\ncycles:");
  const cycles = await walkAndArchive(
    env,
    accessToken,
    "/cycle",
    "cycles",
    baseParams,
  );
  console.log("\nrecoveries:");
  const recoveries = await walkAndArchive(
    env,
    accessToken,
    "/recovery",
    "recoveries",
    baseParams,
  );
  console.log("\nsleeps:");
  const sleeps = await walkAndArchive(
    env,
    accessToken,
    "/activity/sleep",
    "sleeps",
    baseParams,
  );
  console.log("\nworkouts:");
  const workouts = await walkAndArchive(
    env,
    accessToken,
    "/activity/workout",
    "workouts",
    baseParams,
  );

  console.log("\ndone.");
  console.table({
    cycles: {
      count: cycles.count,
      oldest: cycles.oldest,
      newest: cycles.newest,
    },
    recoveries: {
      count: recoveries.count,
      oldest: recoveries.oldest,
      newest: recoveries.newest,
    },
    sleeps: {
      count: sleeps.count,
      oldest: sleeps.oldest,
      newest: sleeps.newest,
    },
    workouts: {
      count: workouts.count,
      oldest: workouts.oldest,
      newest: workouts.newest,
    },
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
