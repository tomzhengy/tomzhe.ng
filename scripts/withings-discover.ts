#!/usr/bin/env bun
/**
 * one-off discovery script: lists every meastype currently being returned
 * by your withings account, with sample values, so you can decide which
 * fields to surface in the dashboard.
 *
 * usage: bun run scripts/withings-discover.ts
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  exchangeWithingsRefreshToken,
  withingsGetMeas,
  type WithingsEnv,
} from "../app/lib/withings";

const TYPE_NAMES: Record<number, string> = {
  1: "weight (kg)",
  4: "height (m)",
  5: "fat-free mass (kg)",
  6: "fat ratio (%)",
  8: "fat mass (kg)",
  9: "diastolic bp (mmHg)",
  10: "systolic bp (mmHg)",
  11: "heart pulse (bpm)",
  12: "temperature (°C)",
  54: "spo2 (%)",
  71: "body temperature (°C)",
  73: "skin temperature (°C)",
  76: "muscle mass (kg)",
  77: "hydration (kg)",
  88: "bone mass (kg)",
  91: "pulse wave velocity (m/s)",
  123: "vo2 max",
  130: "afib classification",
  135: "qrs interval (ms)",
  136: "pr interval (ms)",
  137: "qt interval (ms)",
  138: "corrected qt interval (ms)",
  139: "afib detection (ppg)",
  155: "vascular age",
  167: "nerve health score (feet)",
  168: "extracellular water (kg)",
  169: "intracellular water (kg)",
  170: "visceral fat (rating, unitless)",
  174: "segmental fat-free mass",
  175: "segmental muscle mass",
  196: "electrodermal activity (feet)",
  226: "basal metabolic rate (kcal/day)",
};

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

  // fetch all categories, no meastype filter, last 365 days
  const startDate = Math.floor((Date.now() - 365 * 86400000) / 1000);
  const page = await withingsGetMeas(accessToken, {
    startdate: String(startDate),
  });

  const counts = new Map<number, number>();
  const samples = new Map<
    number,
    { value: number; unit: number; algo?: number }
  >();
  for (const grp of page.measuregrps) {
    for (const m of grp.measures) {
      counts.set(m.type, (counts.get(m.type) ?? 0) + 1);
      if (!samples.has(m.type)) {
        samples.set(m.type, { value: m.value, unit: m.unit, algo: m.algo });
      }
    }
  }

  console.log(
    `\nfound ${page.measuregrps.length} measure groups in last 365 days`,
  );
  console.log(
    `total individual measures: ${[...counts.values()].reduce((s, n) => s + n, 0)}`,
  );
  console.log("\nunique types:\n");

  const sorted = [...counts.entries()].sort((a, b) => a[0] - b[0]);
  for (const [type, count] of sorted) {
    const name = TYPE_NAMES[type] ?? "(unknown / undocumented)";
    const sample = samples.get(type);
    const realValue = sample ? sample.value * Math.pow(10, sample.unit) : null;
    console.log(
      `  type ${String(type).padStart(3)}  ${name.padEnd(38)} count=${String(count).padStart(4)}  sample=${realValue != null ? realValue.toFixed(3) : "?"}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
