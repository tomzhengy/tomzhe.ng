/**
 * cloudflare pages function: POST /api/auth/login
 *
 * body: { password }. constant-time compares against SITE_PASSWORD; on
 * match returns Set-Cookie with a 14-day HMAC-signed session cookie.
 */

import {
	checkPassword,
	issueSessionCookie,
	sessionExpiryFromNow,
	type AuthEnv,
} from "../../../app/lib/auth";

interface EventContext {
	request: Request;
	env: AuthEnv;
}

export const onRequestPost = async (ctx: EventContext) => {
	let body: { password?: string } = {};
	try {
		body = (await ctx.request.json()) as { password?: string };
	} catch {
		// fall through
	}
	const password = typeof body.password === "string" ? body.password : "";

	const ok = await checkPassword(ctx.env, password);
	if (!ok) {
		await new Promise((r) => setTimeout(r, 300));
		return new Response(JSON.stringify({ ok: false }), {
			status: 401,
			headers: { "content-type": "application/json; charset=utf-8" },
		});
	}

	const cookie = await issueSessionCookie(ctx.env, sessionExpiryFromNow());
	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: {
			"content-type": "application/json; charset=utf-8",
			"set-cookie": cookie,
			"cache-control": "no-store",
		},
	});
};
