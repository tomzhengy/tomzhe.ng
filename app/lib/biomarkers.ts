/**
 * postgrest helpers for the biomarker tables (created in migration 004).
 * mirrors the raw-fetch pattern in health-archive.ts so we don't pull in
 * @supabase/supabase-js on workers.
 */

import {
	BIOMARKERS,
	CATEGORY_LABELS,
	fallbackCanonical,
	normalizeName,
	type BiomarkerCategory,
	type BiomarkerDef,
} from "../health/biomarkers/canonicalNames";
import type {
	BiomarkerCategoryEntry,
	BiomarkerListResponse,
	BiomarkerPoint,
	BiomarkerSeries,
	BiomarkerSeriesResponse,
	BiomarkerSource,
	BiomarkerSummary,
	UploadRow,
} from "../health/biomarkers/types";

export interface BiomarkerEnv {
	NEXT_PUBLIC_SUPABASE_URL?: string;
	SUPABASE_SERVICE_ROLE_KEY?: string;
}

function supaConfig(env: BiomarkerEnv): { base: string; key: string } | null {
	if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
		return null;
	}
	return {
		base: env.NEXT_PUBLIC_SUPABASE_URL,
		key: env.SUPABASE_SERVICE_ROLE_KEY,
	};
}

interface RawResult {
	source: BiomarkerSource;
	upload_id: string | null;
	canonical_name: string;
	raw_name: string;
	category: string | null;
	value: number | null;
	value_text: string | null;
	unit: string | null;
	ref_low: number | null;
	ref_high: number | null;
	measured_at: string;
}

interface RawUpload {
	id: string;
	source: BiomarkerSource;
	filename: string;
	uploaded_at: string;
	status: "parsing" | "parsed" | "failed";
	parsed_count: number;
	error: string | null;
}

function defFor(canonical: string): BiomarkerDef | null {
	return normalizeName(canonical);
}

function inRange(
	v: number | null,
	lo: number | null,
	hi: number | null,
): "ok" | "warn" | "danger" | null {
	if (v == null || (lo == null && hi == null)) return null;
	if (lo != null && v < lo) {
		// >20% under low is danger; otherwise warn
		if (lo > 0 && (lo - v) / Math.abs(lo) > 0.2) return "danger";
		return "warn";
	}
	if (hi != null && v > hi) {
		if (hi > 0 && (v - hi) / Math.abs(hi) > 0.2) return "danger";
		return "warn";
	}
	return "ok";
}

export async function readBiomarkerList(
	env: BiomarkerEnv,
): Promise<BiomarkerListResponse> {
	const cfg = supaConfig(env);
	if (!cfg) {
		return { biomarkers: [], categories: [], uploads: [] };
	}

	const [resultsRaw, uploadsRaw] = await Promise.all([
		fetch(
			`${cfg.base}/rest/v1/biomarker_results?select=source,canonical_name,raw_name,category,value,value_text,unit,ref_low,ref_high,measured_at&order=measured_at.asc&limit=10000`,
			{ headers: { apikey: cfg.key, authorization: `Bearer ${cfg.key}` } },
		),
		fetch(
			`${cfg.base}/rest/v1/biomarker_uploads?select=id,source,filename,uploaded_at,status,parsed_count,error&order=uploaded_at.desc&limit=50`,
			{ headers: { apikey: cfg.key, authorization: `Bearer ${cfg.key}` } },
		),
	]);

	if (!resultsRaw.ok || !uploadsRaw.ok) {
		return { biomarkers: [], categories: [], uploads: [] };
	}

	const results = (await resultsRaw.json()) as RawResult[];
	const uploads = (await uploadsRaw.json()) as RawUpload[];

	// group by canonical_name → build summary + sparkline
	const byCanonical = new Map<string, RawResult[]>();
	for (const r of results) {
		const list = byCanonical.get(r.canonical_name);
		if (list) list.push(r);
		else byCanonical.set(r.canonical_name, [r]);
	}

	const biomarkers: BiomarkerSummary[] = [];
	for (const [canonical, rows] of byCanonical) {
		// rows came back asc by measured_at; last entry is latest
		const last = rows[rows.length - 1];
		const def = defFor(canonical);
		const display = def?.display ?? prettyFromCanonical(canonical);
		const category: BiomarkerCategory =
			(def?.category ?? (last.category as BiomarkerCategory | null)) ??
			"other";
		const unit = last.unit ?? def?.unit ?? null;
		const sparkline = rows
			.filter((r) => r.value != null)
			.map((r) => r.value as number);
		biomarkers.push({
			canonical,
			display,
			category,
			unit,
			lastValue: last.value,
			lastValueText: last.value_text,
			lastMeasuredAt: last.measured_at,
			pointCount: rows.length,
			inRange: inRange(last.value, last.ref_low, last.ref_high),
			sparkline,
		});
	}

	biomarkers.sort((a, b) => {
		if (a.category !== b.category) return a.category.localeCompare(b.category);
		return a.display.localeCompare(b.display);
	});

	// category list (only categories that have at least one biomarker present)
	const catCounts = new Map<BiomarkerCategory, number>();
	for (const b of biomarkers) {
		catCounts.set(b.category, (catCounts.get(b.category) ?? 0) + 1);
	}
	const categories: BiomarkerCategoryEntry[] = [];
	for (const [id, count] of catCounts) {
		categories.push({ id, label: CATEGORY_LABELS[id] ?? id, count });
	}
	categories.sort((a, b) => a.label.localeCompare(b.label));

	const uploadRows: UploadRow[] = uploads.map((u) => ({
		id: u.id,
		source: u.source,
		filename: u.filename,
		uploadedAt: u.uploaded_at,
		status: u.status,
		parsedCount: u.parsed_count,
		error: u.error,
	}));

	return { biomarkers, categories, uploads: uploadRows };
}

function prettyFromCanonical(canonical: string): string {
	return canonical
		.split("_")
		.map((w) => (w.length === 0 ? w : w[0].toUpperCase() + w.slice(1)))
		.join(" ");
}

export async function readBiomarkerSeries(
	env: BiomarkerEnv,
	canonicalNames: string[],
): Promise<BiomarkerSeriesResponse> {
	const cfg = supaConfig(env);
	if (!cfg || canonicalNames.length === 0) return { series: [] };

	const nameList = canonicalNames.map((v) => `"${v}"`).join(",");
	const url =
		`${cfg.base}/rest/v1/biomarker_results` +
		`?canonical_name=in.(${encodeURIComponent(nameList)})` +
		`&select=source,canonical_name,unit,value,value_text,ref_low,ref_high,measured_at,category` +
		`&order=measured_at.asc&limit=5000`;
	const r = await fetch(url, {
		headers: { apikey: cfg.key, authorization: `Bearer ${cfg.key}` },
	});
	if (!r.ok) return { series: [] };
	const rows = (await r.json()) as RawResult[];

	const byCanonical = new Map<string, RawResult[]>();
	for (const row of rows) {
		const list = byCanonical.get(row.canonical_name);
		if (list) list.push(row);
		else byCanonical.set(row.canonical_name, [row]);
	}

	const series: BiomarkerSeries[] = [];
	for (const canonical of canonicalNames) {
		const rs = byCanonical.get(canonical) ?? [];
		const def = defFor(canonical);
		const display = def?.display ?? prettyFromCanonical(canonical);
		const category: BiomarkerCategory =
			(def?.category ??
				(rs[0]?.category as BiomarkerCategory | null) ??
				"other") as BiomarkerCategory;
		const unit = rs[rs.length - 1]?.unit ?? def?.unit ?? null;
		const points: BiomarkerPoint[] = rs.map((r) => ({
			measuredAt: r.measured_at,
			value: r.value,
			valueText: r.value_text,
			refLow: r.ref_low,
			refHigh: r.ref_high,
			source: r.source,
		}));
		series.push({ canonical, display, category, unit, points });
	}

	return { series };
}

// ---- insert helpers (used by upload pipeline) ----

export interface CreateUploadInput {
	source: BiomarkerSource;
	filename: string;
}

export async function createUpload(
	env: BiomarkerEnv,
	input: CreateUploadInput,
): Promise<{ id: string } | null> {
	const cfg = supaConfig(env);
	if (!cfg) return null;
	const r = await fetch(`${cfg.base}/rest/v1/biomarker_uploads`, {
		method: "POST",
		headers: {
			apikey: cfg.key,
			authorization: `Bearer ${cfg.key}`,
			"content-type": "application/json",
			prefer: "return=representation",
		},
		body: JSON.stringify([
			{
				source: input.source,
				filename: input.filename,
				status: "parsing",
			},
		]),
	});
	if (!r.ok) return null;
	const rows = (await r.json()) as Array<{ id: string }>;
	return rows[0] ?? null;
}

export async function finalizeUpload(
	env: BiomarkerEnv,
	id: string,
	status: "parsed" | "failed",
	parsedCount: number,
	error?: string,
): Promise<void> {
	const cfg = supaConfig(env);
	if (!cfg) return;
	await fetch(
		`${cfg.base}/rest/v1/biomarker_uploads?id=eq.${encodeURIComponent(id)}`,
		{
			method: "PATCH",
			headers: {
				apikey: cfg.key,
				authorization: `Bearer ${cfg.key}`,
				"content-type": "application/json",
				prefer: "return=minimal",
			},
			body: JSON.stringify({
				status,
				parsed_count: parsedCount,
				error: error ?? null,
			}),
		},
	);
}

export interface IncomingResult {
	raw_name: string;
	canonical_name?: string;
	category?: string | null;
	value?: number | null;
	value_text?: string | null;
	unit?: string | null;
	ref_low?: number | null;
	ref_high?: number | null;
	ref_text?: string | null;
	measured_at: string;
	raw_extracted?: Record<string, unknown>;
}

export interface NormalizedResult {
	source: BiomarkerSource;
	upload_id: string;
	raw_name: string;
	canonical_name: string;
	category: string | null;
	value: number | null;
	value_text: string | null;
	unit: string | null;
	ref_low: number | null;
	ref_high: number | null;
	ref_text: string | null;
	measured_at: string;
	raw_extracted: Record<string, unknown> | null;
}

/**
 * apply the canonical dictionary to llm output. when a row's raw_name (or
 * llm-emitted canonical) matches a known biomarker, force-override its
 * canonical_name/category/unit so we don't end up with two rows for the
 * same biomarker just because the llm pluralized once.
 */
export function normalizeResults(
	source: BiomarkerSource,
	uploadId: string,
	incoming: IncomingResult[],
): NormalizedResult[] {
	const out: NormalizedResult[] = [];
	for (const r of incoming) {
		const matched =
			normalizeName(r.raw_name) ??
			(r.canonical_name ? normalizeName(r.canonical_name) : null);
		const canonical = matched
			? matched.canonical
			: r.canonical_name
				? fallbackCanonical(r.canonical_name)
				: fallbackCanonical(r.raw_name);
		const category = matched?.category ?? r.category ?? null;
		const unit = matched?.unit ?? r.unit ?? null;
		// require a measured_at; skip malformed rows
		const at = r.measured_at;
		if (!at || Number.isNaN(Date.parse(at))) continue;
		out.push({
			source,
			upload_id: uploadId,
			raw_name: r.raw_name,
			canonical_name: canonical,
			category,
			value: r.value ?? null,
			value_text: r.value_text ?? null,
			unit,
			ref_low: r.ref_low ?? null,
			ref_high: r.ref_high ?? null,
			ref_text: r.ref_text ?? null,
			measured_at: new Date(at).toISOString(),
			raw_extracted: r.raw_extracted ?? null,
		});
	}
	return out;
}

export async function upsertResults(
	env: BiomarkerEnv,
	rows: NormalizedResult[],
): Promise<number> {
	if (rows.length === 0) return 0;
	const cfg = supaConfig(env);
	if (!cfg) return 0;
	const url =
		`${cfg.base}/rest/v1/biomarker_results` +
		`?on_conflict=${encodeURIComponent("source,canonical_name,measured_at")}`;
	const r = await fetch(url, {
		method: "POST",
		headers: {
			apikey: cfg.key,
			authorization: `Bearer ${cfg.key}`,
			"content-type": "application/json",
			prefer: "resolution=merge-duplicates,return=minimal",
		},
		body: JSON.stringify(rows),
	});
	if (!r.ok) {
		const body = await r.text();
		console.warn(`upsert biomarker_results failed: ${r.status} ${body}`);
		return 0;
	}
	return rows.length;
}

export interface NucleusVariantRow {
	upload_id: string;
	gene: string | null;
	rsid: string | null;
	genotype: string | null;
	zygosity: string | null;
	significance: string | null;
	category: string | null;
	raw: Record<string, unknown>;
}

export async function upsertVariants(
	env: BiomarkerEnv,
	rows: NucleusVariantRow[],
): Promise<number> {
	if (rows.length === 0) return 0;
	const cfg = supaConfig(env);
	if (!cfg) return 0;
	const url =
		`${cfg.base}/rest/v1/biomarker_variants` +
		`?on_conflict=${encodeURIComponent("rsid,genotype")}`;
	const r = await fetch(url, {
		method: "POST",
		headers: {
			apikey: cfg.key,
			authorization: `Bearer ${cfg.key}`,
			"content-type": "application/json",
			prefer: "resolution=merge-duplicates,return=minimal",
		},
		body: JSON.stringify(rows),
	});
	if (!r.ok) return 0;
	return rows.length;
}

// re-export for callers
export { BIOMARKERS };
