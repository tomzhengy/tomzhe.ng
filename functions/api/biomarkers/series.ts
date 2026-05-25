/**
 * cloudflare pages function: GET /api/biomarkers/series?names=apob,ldl_c
 *
 * returns full timeseries for each canonical biomarker name. session-gated.
 */

import { verifySessionCookie, type AuthEnv } from "../../../app/lib/auth";
import {
	readBiomarkerSeries,
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
	const url = new URL(ctx.request.url);
	const namesParam = url.searchParams.get("names") ?? "";
	const names = namesParam
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
	const data = await readBiomarkerSeries(ctx.env, names);
	return new Response(JSON.stringify(data), {
		status: 200,
		headers: {
			"content-type": "application/json; charset=utf-8",
			"cache-control": "no-store",
		},
	});
};
