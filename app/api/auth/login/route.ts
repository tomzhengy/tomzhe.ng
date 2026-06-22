import { NextResponse } from "next/server";
import {
	checkPassword,
	issueSessionCookie,
	sessionExpiryFromNow,
} from "../../../lib/auth";

// in production, functions/api/auth/login.ts handles this on cloudflare
// pages. this route is the next.js dev mirror. force-static keeps next
// happy with output: "export".
export const dynamic = "force-static";

export async function POST(request: Request) {
	if (process.env.NEXT_PHASE === "phase-production-build") {
		return NextResponse.json({ ok: false }, { status: 503 });
	}

	const env = {
		SITE_PASSWORD: process.env.SITE_PASSWORD,
		COOKIE_SECRET: process.env.COOKIE_SECRET,
	};

	let body: { password?: string } = {};
	try {
		body = (await request.json()) as { password?: string };
	} catch {
		// fall through
	}
	const password = typeof body.password === "string" ? body.password : "";

	const ok = await checkPassword(env, password);
	if (!ok) {
		// rough rate limit / timing equalizer — every failure waits ~300ms.
		await new Promise((r) => setTimeout(r, 300));
		return NextResponse.json({ ok: false }, { status: 401 });
	}

	const cookie = await issueSessionCookie(env, sessionExpiryFromNow());
	return NextResponse.json({ ok: true }, { headers: { "set-cookie": cookie } });
}
