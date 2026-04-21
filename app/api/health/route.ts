import { NextResponse } from "next/server";
import { fetchHealthData } from "../../lib/health-source";

// in production we serve this via functions/api/health.ts on cloudflare pages.
// in `bun dev` (next.js dev server) this route runs instead so the dashboard
// has a working /api/health endpoint locally. force-static keeps next happy
// with output: "export" — at build time we return a placeholder that never
// ships to prod because the pages function takes precedence.
export const dynamic = "force-static";

export async function GET() {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return NextResponse.json({
      state: "error",
      syncedAt: Date.now(),
      cycle: null,
      recovery: null,
      sleep: null,
      workouts: [],
      trend: [],
      copy: null,
      message:
        "static build placeholder · cloudflare pages function handles prod",
    });
  }

  const payload = await fetchHealthData({
    WHOOP_CLIENT_ID: process.env.WHOOP_CLIENT_ID,
    WHOOP_CLIENT_SECRET: process.env.WHOOP_CLIENT_SECRET,
    WHOOP_REFRESH_TOKEN: process.env.WHOOP_REFRESH_TOKEN,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL,
  });

  return NextResponse.json(payload);
}
