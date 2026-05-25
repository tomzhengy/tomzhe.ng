/**
 * cloudflare pages function: GET /api/biomarkers/list
 *
 * returns every biomarker we have data for, with last value + sparkline +
 * in-range badge, plus the category list and recent uploads. session-gated.
 */

import { verifySessionCookie, type AuthEnv } from "../../../app/lib/auth";
import {
	readBiomarkerList,
	type BiomarkerEnv,
} from "../../../app/lib/biomarkers";

type Env = AuthEnv & BiomarkerEnv;

interface EventContext {
	request: Request;
	env: Env;
}

export const onRequestGet = async (ctx: EventContext) => {
	const authed = await verifySessionCookie(ctx.request, ctx.env);
	if (!authed) {
		return new Response(JSON.stringify({ error: "unauthorized" }), {
			status: 401,
			headers: { "content-type": "application/json; charset=utf-8" },
		});
	}
	const data = await readBiomarkerList(ctx.env);
	return new Response(JSON.stringify(data), {
		status: 200,
		headers: {
			"content-type": "application/json; charset=utf-8",
			"cache-control": "no-store",
		},
	});
};
