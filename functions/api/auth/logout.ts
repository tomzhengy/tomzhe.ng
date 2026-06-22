import { clearSessionCookie } from "../../../app/lib/auth";

interface EventContext {
	request: Request;
}

export const onRequestPost = async (_ctx: EventContext) => {
	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: {
			"content-type": "application/json; charset=utf-8",
			"set-cookie": clearSessionCookie(),
			"cache-control": "no-store",
		},
	});
};
