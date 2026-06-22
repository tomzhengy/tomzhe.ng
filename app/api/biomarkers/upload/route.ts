import { NextResponse } from "next/server";
import { verifySessionCookie } from "../../../lib/auth";
import {
	parseNucleusUpload,
	parsePdfUpload,
} from "../../../lib/biomarker-parser";

export const dynamic = "force-static";

interface UploadBody {
	source?: "function_health" | "whoop_labs" | "nucleus";
	filename?: string;
	extractedText?: string;
	jsonPayload?: unknown;
}

export async function POST(request: Request) {
	if (process.env.NEXT_PHASE === "phase-production-build") {
		return NextResponse.json({ error: "build placeholder" }, { status: 503 });
	}

	const env = {
		SITE_PASSWORD: process.env.SITE_PASSWORD,
		COOKIE_SECRET: process.env.COOKIE_SECRET,
		NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
		SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
		ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
		ANTHROPIC_BIOMARKER_MODEL: process.env.ANTHROPIC_BIOMARKER_MODEL,
	};

	const authed = await verifySessionCookie(request, env);
	if (!authed) {
		return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	}

	let body: UploadBody = {};
	try {
		body = (await request.json()) as UploadBody;
	} catch {
		return NextResponse.json({ error: "invalid json body" }, { status: 400 });
	}

	if (!body.source || !body.filename) {
		return NextResponse.json(
			{ error: "missing source or filename" },
			{ status: 400 },
		);
	}

	if (body.source === "nucleus") {
		if (body.jsonPayload == null) {
			return NextResponse.json(
				{ error: "missing jsonPayload for nucleus upload" },
				{ status: 400 },
			);
		}
		const result = await parseNucleusUpload(env, {
			source: "nucleus",
			filename: body.filename,
			jsonPayload: body.jsonPayload,
		});
		return NextResponse.json(result, {
			headers: { "cache-control": "no-store" },
		});
	}

	if (!body.extractedText) {
		return NextResponse.json(
			{ error: "missing extractedText for pdf upload" },
			{ status: 400 },
		);
	}

	const result = await parsePdfUpload(env, {
		source: body.source,
		filename: body.filename,
		extractedText: body.extractedText,
	});
	return NextResponse.json(result, {
		headers: { "cache-control": "no-store" },
	});
}
