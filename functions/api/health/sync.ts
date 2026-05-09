/**
 * cloudflare pages function: POST /api/health/sync
 *
 * triggered by the dashboard sync button. runs the full live fetch
 * (whoop + withings + openrouter copy), writes the result to the
 * supabase cache, and returns the fresh payload so the client can
 * update without a follow-up GET.
 *
 * never edge-cached — clicking sync should always pull fresh.
 */

import {
	computeAndCacheHealthPayload,
	type HealthEnv,
} from "../../../app/lib/health-source";

interface EventContext {
	request: Request;
	env: HealthEnv;
}

export const onRequestPost = async (ctx: EventContext) => {
	const payload = await computeAndCacheHealthPayload(ctx.env);
	return new Response(JSON.stringify(payload), {
		status: 200,
		headers: {
			"content-type": "application/json; charset=utf-8",
			"cache-control": "no-store",
		},
	});
};
