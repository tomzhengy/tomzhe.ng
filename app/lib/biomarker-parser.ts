/**
 * server-side parsing pipeline for uploaded reports.
 *
 *  - pdfs: client extracts text via pdfjs-dist, server hands it to openrouter
 *    with a strict-json prompt to map free-form lab tables → typed rows
 *  - nucleus json: deterministic mapper, no llm — schemas are stable enough
 *    to walk directly
 */

import {
	createUpload,
	finalizeUpload,
	normalizeResults,
	upsertResults,
	upsertVariants,
	type BiomarkerEnv,
	type IncomingResult,
	type NormalizedResult,
	type NucleusVariantRow,
} from "./biomarkers";
import type { BiomarkerSource } from "../health/biomarkers/types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface ParserEnv extends BiomarkerEnv {
	OPENROUTER_API_KEY?: string;
	OPENROUTER_MODEL?: string;
}

export interface ParsePdfInput {
	source: BiomarkerSource;
	filename: string;
	extractedText: string;
}

export interface ParseNucleusInput {
	source: "nucleus";
	filename: string;
	jsonPayload: unknown;
}

export interface UploadResult {
	upload: {
		id: string;
		status: "parsed" | "failed";
		parsedCount: number;
		error: string | null;
	};
	results: NormalizedResult[];
}

const SYSTEM_PROMPT = [
	"You extract structured biomarker rows from raw lab report text.",
	"Output STRICT JSON only. No prose, no markdown, no commentary.",
	"For each lab test mentioned in the report, output one object in `results`.",
	"Use ISO 8601 (yyyy-mm-dd) for measured_at. If a single collection/draw date applies to all tests, copy it onto every row.",
	"raw_name: the test name exactly as it appears in the report.",
	"canonical_name: snake_case slug if you know a canonical form (e.g. ldl_c, hs_crp, apob); otherwise mirror raw_name.",
	"category: one of lipids, cbc, cmp, thyroid, hormones, inflammation, vitamins, metabolic, iron, kidney, liver, cardiac, other.",
	"value: numeric value as a number (null if the result is a non-numeric flag like 'positive').",
	"value_text: original string form if non-numeric, else null.",
	"unit: unit string as printed.",
	"ref_low, ref_high: numeric bounds of the reference range. If the range is one-sided ('< 5', '> 40'), set the other side to null.",
	"ref_text: the original reference string if you cannot parse it numerically.",
	"Skip headers, summary rows, calculated indices that aren't real measurements, and any signature/disclaimer text.",
].join(" ");

async function extractWithLlm(
	env: ParserEnv,
	text: string,
): Promise<{ report_date: string | null; results: IncomingResult[] } | null> {
	if (!env.OPENROUTER_API_KEY) return null;
	const model = env.OPENROUTER_MODEL || "google/gemini-2.5-flash";

	// large reports run long. cap text to keep latency + cost sane; most lab
	// pdfs are well under 60kb of text.
	const truncated = text.length > 60_000 ? text.slice(0, 60_000) : text;

	const userPrompt = `Lab report text:\n\n${truncated}\n\nReturn JSON of shape:\n{ "report_date": "yyyy-mm-dd" | null, "results": [ { "raw_name": string, "canonical_name": string, "category": string, "value": number | null, "value_text": string | null, "unit": string | null, "ref_low": number | null, "ref_high": number | null, "ref_text": string | null, "measured_at": string } ] }`;

	const r = await fetch(OPENROUTER_URL, {
		method: "POST",
		headers: {
			authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
			"content-type": "application/json",
		},
		body: JSON.stringify({
			model,
			messages: [
				{ role: "system", content: SYSTEM_PROMPT },
				{ role: "user", content: userPrompt },
			],
			response_format: { type: "json_object" },
			temperature: 0.1,
			max_tokens: 6000,
		}),
	});
	if (!r.ok) {
		const body = await r.text();
		throw new Error(`openrouter ${r.status}: ${body.slice(0, 300)}`);
	}
	const json = (await r.json()) as {
		choices?: Array<{ message?: { content?: string } }>;
	};
	const content = json.choices?.[0]?.message?.content;
	if (!content) return null;
	try {
		const parsed = JSON.parse(content);
		if (typeof parsed !== "object" || parsed === null) return null;
		const obj = parsed as {
			report_date?: string;
			results?: IncomingResult[];
		};
		return {
			report_date: obj.report_date ?? null,
			results: Array.isArray(obj.results) ? obj.results : [],
		};
	} catch {
		return null;
	}
}

export async function parsePdfUpload(
	env: ParserEnv,
	input: ParsePdfInput,
): Promise<UploadResult> {
	const upload = await createUpload(env, {
		source: input.source,
		filename: input.filename,
	});
	if (!upload) {
		return {
			upload: {
				id: "",
				status: "failed",
				parsedCount: 0,
				error: "could not create upload row (supabase not configured?)",
			},
			results: [],
		};
	}

	try {
		const parsed = await extractWithLlm(env, input.extractedText);
		if (!parsed) {
			await finalizeUpload(env, upload.id, "failed", 0, "llm returned no rows");
			return {
				upload: {
					id: upload.id,
					status: "failed",
					parsedCount: 0,
					error: "llm returned no rows",
				},
				results: [],
			};
		}

		// fall back to report_date when individual rows don't carry their own
		const stamped = parsed.results.map((r) => ({
			...r,
			measured_at: r.measured_at || parsed.report_date || "",
		}));

		const normalized = normalizeResults(input.source, upload.id, stamped);
		const written = await upsertResults(env, normalized);
		await finalizeUpload(env, upload.id, "parsed", written);

		return {
			upload: {
				id: upload.id,
				status: "parsed",
				parsedCount: written,
				error: null,
			},
			results: normalized,
		};
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		await finalizeUpload(env, upload.id, "failed", 0, msg);
		return {
			upload: {
				id: upload.id,
				status: "failed",
				parsedCount: 0,
				error: msg,
			},
			results: [],
		};
	}
}

// ---- nucleus deterministic mapper ----
// nucleus exports a json blob with a 'variants' (or 'results') array. each
// entry has gene / rsid / genotype / interpretation. we walk it once into
// biomarker_variants — no llm pass needed.

interface NucleusRawVariant {
	gene?: string;
	rsid?: string;
	rs_id?: string;
	genotype?: string;
	zygosity?: string;
	significance?: string;
	interpretation?: string;
	category?: string;
	[k: string]: unknown;
}

function collectVariants(payload: unknown): NucleusRawVariant[] {
	if (!payload || typeof payload !== "object") return [];
	const obj = payload as Record<string, unknown>;
	// nucleus has varied between 'variants' and 'results' across exports
	for (const key of ["variants", "results", "data"]) {
		const v = obj[key];
		if (Array.isArray(v)) return v as NucleusRawVariant[];
	}
	return [];
}

export async function parseNucleusUpload(
	env: ParserEnv,
	input: ParseNucleusInput,
): Promise<UploadResult> {
	const upload = await createUpload(env, {
		source: "nucleus",
		filename: input.filename,
	});
	if (!upload) {
		return {
			upload: {
				id: "",
				status: "failed",
				parsedCount: 0,
				error: "could not create upload row",
			},
			results: [],
		};
	}

	try {
		const raw = collectVariants(input.jsonPayload);
		const rows: NucleusVariantRow[] = raw.map((v) => ({
			upload_id: upload.id,
			gene: v.gene ?? null,
			rsid: (v.rsid ?? v.rs_id) ?? null,
			genotype: v.genotype ?? null,
			zygosity: v.zygosity ?? null,
			significance: v.significance ?? v.interpretation ?? null,
			category: v.category ?? null,
			raw: v as Record<string, unknown>,
		}));
		const written = await upsertVariants(env, rows);
		await finalizeUpload(env, upload.id, "parsed", written);
		return {
			upload: {
				id: upload.id,
				status: "parsed",
				parsedCount: written,
				error: null,
			},
			results: [],
		};
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		await finalizeUpload(env, upload.id, "failed", 0, msg);
		return {
			upload: {
				id: upload.id,
				status: "failed",
				parsedCount: 0,
				error: msg,
			},
			results: [],
		};
	}
}
