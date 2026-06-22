import { NextResponse } from "next/server";
import { verifySessionCookie } from "../../../lib/auth";
import { readBiomarkerList } from "../../../lib/biomarkers";

export const dynamic = "force-static";

export async function GET(request: Request) {
	if (process.env.NEXT_PHASE === "phase-production-build") {
		return NextResponse.json({ biomarkers: [], categories: [], uploads: [] });
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

	const data = await readBiomarkerList(env);
	return NextResponse.json(data, {
		headers: { "cache-control": "no-store" },
	});
}
