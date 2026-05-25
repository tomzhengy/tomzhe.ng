import { verifySessionCookie, type AuthEnv } from "../../../app/lib/auth";

interface EventContext {
	request: Request;
	env: AuthEnv;
}

export const onRequestGet = async (ctx: EventContext) => {
	const authed = await verifySessionCookie(ctx.request, ctx.env);
	return new Response(JSON.stringify({ authed }), {
		status: 200,
		headers: {
			"content-type": "application/json; charset=utf-8",
			"cache-control": "no-store",
		},
	});
};
