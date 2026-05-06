import { NextResponse } from "next/server";
import { computeAndCacheHealthPayload } from "../../../lib/health-source";

// in production, functions/api/health/sync.ts handles this on cloudflare
// pages. this route is the next.js dev mirror so the sync button works
// under bun dev. force-static keeps next happy with output: "export";
// at build time we no-op since the cloudflare function takes precedence.
export const dynamic = "force-static";

export async function POST() {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return NextResponse.json({
      state: "error",
      syncedAt: Date.now(),
      cycle: null,
      recovery: null,
      sleep: null,
      workouts: [],
      trend: [],
      body: null,
      copy: null,
      message:
        "static build placeholder · cloudflare pages function handles prod",
    });
  }

  const payload = await computeAndCacheHealthPayload({
    WHOOP_CLIENT_ID: process.env.WHOOP_CLIENT_ID,
    WHOOP_CLIENT_SECRET: process.env.WHOOP_CLIENT_SECRET,
    WHOOP_REFRESH_TOKEN: process.env.WHOOP_REFRESH_TOKEN,
    WITHINGS_CLIENT_ID: process.env.WITHINGS_CLIENT_ID,
    WITHINGS_CLIENT_SECRET: process.env.WITHINGS_CLIENT_SECRET,
    WITHINGS_REFRESH_TOKEN: process.env.WITHINGS_REFRESH_TOKEN,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  return NextResponse.json(payload, {
    headers: { "cache-control": "no-store" },
  });
}
