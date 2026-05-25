/**
 * cloudflare pages function: POST /api/biomarkers/upload
 *
 * body: { source, filename, extractedText? | jsonPayload? }
 *
 * pdf path: client already extracted text via pdfjs-dist; we hand it to
 * openrouter to map → structured rows → biomarker_results upsert.
 * nucleus path: deterministic mapper → biomarker_variants.
 *
 * session-gated.
 */

import { verifySessionCookie, type AuthEnv } from "../../../app/lib/auth";
import {
	parseNucleusUpload,
	parsePdfUpload,
	type ParserEnv,
} from "../../../app/lib/biomarker-parser";

type Env = AuthEnv & ParserEnv;

interface EventContext {
	request: Request;
	env: Env;
}

interface UploadBody {
	source?: "function_health" | "whoop_labs" | "nucleus";
	filename?: string;
	extractedText?: string;
	jsonPayload?: unknown;
}

export const onRequestPost = async (ctx: EventContext) => {
	const authed = await verifySessionCookie(ctx.request, ctx.env);
	if (!authed) {
		return new Response(JSON.stringify({ error: "unauthorized" }), {
			status: 401,
			headers: { "content-type": "application/json; charset=utf-8" },
		});
	}

	let body: UploadBody = {};
	try {
		body = (await ctx.request.json()) as UploadBody;
	} catch {
		return new Response(JSON.stringify({ error: "invalid json body" }), {
			status: 400,
			headers: { "content-type": "application/json; charset=utf-8" },
		});
	}

	if (!body.source || !body.filename) {
		return new Response(
			JSON.stringify({ error: "missing source or filename" }),
			{
				status: 400,
				headers: { "content-type": "application/json; charset=utf-8" },
			},
		);
	}

	if (body.source === "nucleus") {
		if (body.jsonPayload == null) {
			return new Response(
				JSON.stringify({ error: "missing jsonPayload for nucleus upload" }),
				{
					status: 400,
					headers: { "content-type": "application/json; charset=utf-8" },
				},
			);
		}
		const result = await parseNucleusUpload(ctx.env, {
			source: "nucleus",
			filename: body.filename,
			jsonPayload: body.jsonPayload,
		});
		return new Response(JSON.stringify(result), {
			status: 200,
			headers: {
				"content-type": "application/json; charset=utf-8",
				"cache-control": "no-store",
			},
		});
	}

	if (!body.extractedText) {
		return new Response(
			JSON.stringify({ error: "missing extractedText for pdf upload" }),
			{
				status: 400,
				headers: { "content-type": "application/json; charset=utf-8" },
			},
		);
	}

	const result = await parsePdfUpload(ctx.env, {
		source: body.source,
		filename: body.filename,
		extractedText: body.extractedText,
	});
	return new Response(JSON.stringify(result), {
		status: 200,
		headers: {
			"content-type": "application/json; charset=utf-8",
			"cache-control": "no-store",
		},
	});
};
