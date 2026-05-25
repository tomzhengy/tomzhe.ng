import type { BiomarkerCategory } from "./canonicalNames";

export type BiomarkerSource = "function_health" | "whoop_labs" | "nucleus";

export interface BiomarkerSummary {
	canonical: string;
	display: string;
	category: BiomarkerCategory;
	unit: string | null;
	lastValue: number | null;
	lastValueText: string | null;
	lastMeasuredAt: string | null;
	pointCount: number;
	inRange: "ok" | "warn" | "danger" | null;
	sparkline: number[];
}

export interface BiomarkerCategoryEntry {
	id: BiomarkerCategory;
	label: string;
	count: number;
}

export interface UploadRow {
	id: string;
	source: BiomarkerSource;
	filename: string;
	uploadedAt: string;
	status: "parsing" | "parsed" | "failed";
	parsedCount: number;
	error: string | null;
}

export interface BiomarkerPoint {
	measuredAt: string;
	value: number | null;
	valueText: string | null;
	refLow: number | null;
	refHigh: number | null;
	source: BiomarkerSource;
}

export interface BiomarkerSeries {
	canonical: string;
	display: string;
	category: BiomarkerCategory;
	unit: string | null;
	points: BiomarkerPoint[];
}

export interface BiomarkerListResponse {
	biomarkers: BiomarkerSummary[];
	categories: BiomarkerCategoryEntry[];
	uploads: UploadRow[];
}

export interface BiomarkerSeriesResponse {
	series: BiomarkerSeries[];
}
