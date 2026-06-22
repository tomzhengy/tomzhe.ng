import { NextResponse } from "next/server";
import { verifySessionCookie } from "../../../lib/auth";

export const dynamic = "force-static";

export async function GET(request: Request) {
	if (process.env.NEXT_PHASE === "phase-production-build") {
		return NextResponse.json({ authed: false });
	}
	const env = {
		SITE_PASSWORD: process.env.SITE_PASSWORD,
		COOKIE_SECRET: process.env.COOKIE_SECRET,
	};
	const authed = await verifySessionCookie(request, env);
	return NextResponse.json(
		{ authed },
		{ headers: { "cache-control": "no-store" } },
	);
}
