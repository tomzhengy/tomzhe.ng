import { NextResponse } from "next/server";
import { verifySessionCookie } from "../../../lib/auth";
import { readBiomarkerSeries } from "../../../lib/biomarkers";

// dev mirror of functions/api/biomarkers/series.ts. takes ?names=apob,ldl_c
// so the overlay can fetch every selected series in one round trip.
export const dynamic = "force-static";

export async function GET(request: Request) {
	if (process.env.NEXT_PHASE === "phase-production-build") {
		return NextResponse.json({ series: [] });
	}

	const env = {
		SITE_PASSWORD: process.env.SITE_PASSWORD,
		COOKIE_SECRET: process.env.COOKIE_SECRET,
		NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
		SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
	};

	const authed = await verifySessionCookie(request, env);
	if (!authed) {
		return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	}

	const url = new URL(request.url);
	const namesParam = url.searchParams.get("names") ?? "";
	const names = namesParam
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);

	const data = await readBiomarkerSeries(env, names);
	return NextResponse.json(data, {
		headers: { "cache-control": "no-store" },
	});
}
