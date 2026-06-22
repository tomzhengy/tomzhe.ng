/**
 * static dictionary of biomarkers we recognize across function health, whoop
 * advanced labs, and other common provider panels. used to:
 *
 *  1. give every measurement a stable canonical_name even when providers use
 *     different spellings ("ApoB", "Apolipoprotein B", "apolipoprotein-b")
 *  2. supply display names, default units, and category for ui rendering
 *  3. validate the llm extraction — when the raw name matches an entry here
 *     we override the llm's canonical/category/unit guess
 *
 * not exhaustive — anything not in this table flows through with the llm's
 * own canonicalization (lowercase + snake_case) and falls in the "other"
 * category. add entries as new panels show up.
 */

export type BiomarkerCategory =
	| "lipids"
	| "cbc"
	| "cmp"
	| "thyroid"
	| "hormones"
	| "inflammation"
	| "vitamins"
	| "metabolic"
	| "iron"
	| "kidney"
	| "liver"
	| "cardiac"
	| "other";

export interface BiomarkerDef {
	canonical: string;
	display: string;
	category: BiomarkerCategory;
	unit?: string;
	// alternate spellings seen in the wild. matched case-insensitive, with
	// whitespace/punct stripped.
	aliases: string[];
}

export const BIOMARKERS: BiomarkerDef[] = [
	// lipids
	{
		canonical: "total_cholesterol",
		display: "Total Cholesterol",
		category: "lipids",
		unit: "mg/dL",
		aliases: ["totalcholesterol", "cholesteroltotal", "chol"],
	},
	{
		canonical: "ldl_c",
		display: "LDL Cholesterol",
		category: "lipids",
		unit: "mg/dL",
		aliases: ["ldl", "ldlcholesterol", "ldlc", "ldlcalc", "ldlcholesterolcalc"],
	},
	{
		canonical: "hdl_c",
		display: "HDL Cholesterol",
		category: "lipids",
		unit: "mg/dL",
		aliases: ["hdl", "hdlcholesterol", "hdlc"],
	},
	{
		canonical: "triglycerides",
		display: "Triglycerides",
		category: "lipids",
		unit: "mg/dL",
		aliases: ["trig", "tg", "triglyceride"],
	},
	{
		canonical: "non_hdl_c",
		display: "Non-HDL Cholesterol",
		category: "lipids",
		unit: "mg/dL",
		aliases: ["nonhdl", "nonhdlcholesterol", "nonhdlc"],
	},
	{
		canonical: "vldl_c",
		display: "VLDL Cholesterol",
		category: "lipids",
		unit: "mg/dL",
		aliases: ["vldl", "vldlcholesterol", "vldlc"],
	},
	{
		canonical: "apob",
		display: "ApoB",
		category: "lipids",
		unit: "mg/dL",
		aliases: ["apolipoproteinb", "apob100", "apolipoproteinb100"],
	},
	{
		canonical: "lpa",
		display: "Lp(a)",
		category: "lipids",
		unit: "nmol/L",
		aliases: ["lipoproteina", "lpalipoprotein"],
	},
	{
		canonical: "ldl_particles",
		display: "LDL Particle Number",
		category: "lipids",
		unit: "nmol/L",
		aliases: ["ldlp", "ldlparticles", "ldlparticlenumber"],
	},
	{
		canonical: "small_ldl_p",
		display: "Small LDL Particles",
		category: "lipids",
		unit: "nmol/L",
		aliases: ["smallldlp", "ldlsmall"],
	},

	// inflammation
	{
		canonical: "hs_crp",
		display: "hs-CRP",
		category: "inflammation",
		unit: "mg/L",
		aliases: ["hscrp", "highsensitivitycrp", "crphighsensitivity"],
	},
	{
		canonical: "crp",
		display: "CRP",
		category: "inflammation",
		unit: "mg/L",
		aliases: ["creactiveprotein"],
	},
	{
		canonical: "homocysteine",
		display: "Homocysteine",
		category: "inflammation",
		unit: "umol/L",
		aliases: [],
	},
	{
		canonical: "ggt",
		display: "GGT",
		category: "liver",
		unit: "U/L",
		aliases: ["gammaglutamyltransferase"],
	},
	{
		canonical: "ferritin",
		display: "Ferritin",
		category: "iron",
		unit: "ng/mL",
		aliases: [],
	},

	// metabolic
	{
		canonical: "glucose",
		display: "Glucose",
		category: "metabolic",
		unit: "mg/dL",
		aliases: ["glucosefasting", "fastingglucose"],
	},
	{
		canonical: "hba1c",
		display: "HbA1c",
		category: "metabolic",
		unit: "%",
		aliases: ["a1c", "hemoglobina1c", "glycatedhemoglobin"],
	},
	{
		canonical: "insulin",
		display: "Insulin",
		category: "metabolic",
		unit: "uIU/mL",
		aliases: ["fastinginsulin", "insulinfasting"],
	},
	{
		canonical: "uric_acid",
		display: "Uric Acid",
		category: "metabolic",
		unit: "mg/dL",
		aliases: [],
	},
	{
		canonical: "homa_ir",
		display: "HOMA-IR",
		category: "metabolic",
		aliases: ["homair", "insulinresistance"],
	},

	// thyroid
	{
		canonical: "tsh",
		display: "TSH",
		category: "thyroid",
		unit: "uIU/mL",
		aliases: ["thyroidstimulatinghormone"],
	},
	{
		canonical: "free_t4",
		display: "Free T4",
		category: "thyroid",
		unit: "ng/dL",
		aliases: ["ft4", "thyroxinefree"],
	},
	{
		canonical: "free_t3",
		display: "Free T3",
		category: "thyroid",
		unit: "pg/mL",
		aliases: ["ft3", "triiodothyroninefree"],
	},
	{
		canonical: "total_t3",
		display: "Total T3",
		category: "thyroid",
		unit: "ng/dL",
		aliases: ["t3", "triiodothyroninetotal"],
	},
	{
		canonical: "reverse_t3",
		display: "Reverse T3",
		category: "thyroid",
		unit: "ng/dL",
		aliases: ["rt3", "reverset3"],
	},
	{
		canonical: "tpo_antibodies",
		display: "TPO Antibodies",
		category: "thyroid",
		unit: "IU/mL",
		aliases: ["tpoab", "thyroidperoxidaseantibodies"],
	},

	// hormones
	{
		canonical: "testosterone_total",
		display: "Testosterone (Total)",
		category: "hormones",
		unit: "ng/dL",
		aliases: ["testosterone", "totaltestosterone"],
	},
	{
		canonical: "testosterone_free",
		display: "Testosterone (Free)",
		category: "hormones",
		unit: "pg/mL",
		aliases: ["freetestosterone"],
	},
	{
		canonical: "shbg",
		display: "SHBG",
		category: "hormones",
		unit: "nmol/L",
		aliases: ["sexhormonebindingglobulin"],
	},
	{
		canonical: "dheas",
		display: "DHEA-S",
		category: "hormones",
		unit: "ug/dL",
		aliases: ["dheasulfate", "dhea"],
	},
	{
		canonical: "cortisol",
		display: "Cortisol",
		category: "hormones",
		unit: "ug/dL",
		aliases: ["cortisolam", "cortisolmorning"],
	},
	{
		canonical: "estradiol",
		display: "Estradiol",
		category: "hormones",
		unit: "pg/mL",
		aliases: ["e2"],
	},
	{
		canonical: "progesterone",
		display: "Progesterone",
		category: "hormones",
		unit: "ng/mL",
		aliases: [],
	},
	{
		canonical: "lh",
		display: "LH",
		category: "hormones",
		unit: "mIU/mL",
		aliases: ["luteinizinghormone"],
	},
	{
		canonical: "fsh",
		display: "FSH",
		category: "hormones",
		unit: "mIU/mL",
		aliases: ["folliclestimulatinghormone"],
	},
	{
		canonical: "prolactin",
		display: "Prolactin",
		category: "hormones",
		unit: "ng/mL",
		aliases: [],
	},
	{
		canonical: "igf_1",
		display: "IGF-1",
		category: "hormones",
		unit: "ng/mL",
		aliases: ["igf1", "insulinlikegrowthfactor1"],
	},

	// vitamins / minerals
	{
		canonical: "vitamin_d",
		display: "Vitamin D (25-OH)",
		category: "vitamins",
		unit: "ng/mL",
		aliases: [
			"vitamind",
			"vitd",
			"vitamind25oh",
			"25hydroxyvitamind",
			"vitamind25hydroxy",
		],
	},
	{
		canonical: "vitamin_b12",
		display: "Vitamin B12",
		category: "vitamins",
		unit: "pg/mL",
		aliases: ["b12", "vitb12", "cobalamin"],
	},
	{
		canonical: "folate",
		display: "Folate",
		category: "vitamins",
		unit: "ng/mL",
		aliases: ["folicacid"],
	},
	{
		canonical: "magnesium",
		display: "Magnesium",
		category: "vitamins",
		unit: "mg/dL",
		aliases: ["mg"],
	},
	{
		canonical: "magnesium_rbc",
		display: "Magnesium (RBC)",
		category: "vitamins",
		unit: "mg/dL",
		aliases: ["rbcmagnesium", "magnesiumredbloodcell"],
	},
	{
		canonical: "zinc",
		display: "Zinc",
		category: "vitamins",
		unit: "ug/dL",
		aliases: [],
	},
	{
		canonical: "copper",
		display: "Copper",
		category: "vitamins",
		unit: "ug/dL",
		aliases: [],
	},
	{
		canonical: "selenium",
		display: "Selenium",
		category: "vitamins",
		unit: "ug/L",
		aliases: [],
	},
	{
		canonical: "omega3_index",
		display: "Omega-3 Index",
		category: "vitamins",
		unit: "%",
		aliases: ["omega3index", "o3index"],
	},

	// kidney / cmp
	{
		canonical: "creatinine",
		display: "Creatinine",
		category: "kidney",
		unit: "mg/dL",
		aliases: ["creat"],
	},
	{
		canonical: "egfr",
		display: "eGFR",
		category: "kidney",
		unit: "mL/min/1.73m2",
		aliases: ["estimatedgfr", "estimatedglomerularfiltrationrate"],
	},
	{
		canonical: "bun",
		display: "BUN",
		category: "kidney",
		unit: "mg/dL",
		aliases: ["bloodureanitrogen", "ureanitrogen"],
	},
	{
		canonical: "cystatin_c",
		display: "Cystatin C",
		category: "kidney",
		unit: "mg/L",
		aliases: ["cystatinc"],
	},
	{
		canonical: "albumin",
		display: "Albumin",
		category: "cmp",
		unit: "g/dL",
		aliases: [],
	},
	{
		canonical: "total_protein",
		display: "Total Protein",
		category: "cmp",
		unit: "g/dL",
		aliases: ["totalprotein", "proteintotal"],
	},
	{
		canonical: "globulin",
		display: "Globulin",
		category: "cmp",
		unit: "g/dL",
		aliases: [],
	},
	{
		canonical: "sodium",
		display: "Sodium",
		category: "cmp",
		unit: "mmol/L",
		aliases: ["na"],
	},
	{
		canonical: "potassium",
		display: "Potassium",
		category: "cmp",
		unit: "mmol/L",
		aliases: ["k"],
	},
	{
		canonical: "chloride",
		display: "Chloride",
		category: "cmp",
		unit: "mmol/L",
		aliases: ["cl"],
	},
	{
		canonical: "co2",
		display: "CO2",
		category: "cmp",
		unit: "mmol/L",
		aliases: ["carbondioxide", "bicarbonate"],
	},
	{
		canonical: "calcium",
		display: "Calcium",
		category: "cmp",
		unit: "mg/dL",
		aliases: ["ca"],
	},

	// liver
	{
		canonical: "alt",
		display: "ALT",
		category: "liver",
		unit: "U/L",
		aliases: ["alanineaminotransferase", "sgpt"],
	},
	{
		canonical: "ast",
		display: "AST",
		category: "liver",
		unit: "U/L",
		aliases: ["aspartateaminotransferase", "sgot"],
	},
	{
		canonical: "alp",
		display: "Alkaline Phosphatase",
		category: "liver",
		unit: "U/L",
		aliases: ["alkalinephosphatase", "alkphos"],
	},
	{
		canonical: "bilirubin_total",
		display: "Bilirubin (Total)",
		category: "liver",
		unit: "mg/dL",
		aliases: ["totalbilirubin", "bilitotal"],
	},
	{
		canonical: "bilirubin_direct",
		display: "Bilirubin (Direct)",
		category: "liver",
		unit: "mg/dL",
		aliases: ["directbilirubin"],
	},

	// iron
	{
		canonical: "iron",
		display: "Iron",
		category: "iron",
		unit: "ug/dL",
		aliases: ["serumiron"],
	},
	{
		canonical: "tibc",
		display: "TIBC",
		category: "iron",
		unit: "ug/dL",
		aliases: ["totalironbindingcapacity"],
	},
	{
		canonical: "transferrin_saturation",
		display: "Transferrin Saturation",
		category: "iron",
		unit: "%",
		aliases: ["transferrinsaturation", "tsat"],
	},
	{
		canonical: "transferrin",
		display: "Transferrin",
		category: "iron",
		unit: "mg/dL",
		aliases: [],
	},

	// cbc
	{
		canonical: "wbc",
		display: "WBC",
		category: "cbc",
		unit: "10^3/uL",
		aliases: ["whitebloodcells", "whitebloodcellcount", "leukocytes"],
	},
	{
		canonical: "rbc",
		display: "RBC",
		category: "cbc",
		unit: "10^6/uL",
		aliases: ["redbloodcells", "redbloodcellcount", "erythrocytes"],
	},
	{
		canonical: "hemoglobin",
		display: "Hemoglobin",
		category: "cbc",
		unit: "g/dL",
		aliases: ["hgb", "hb"],
	},
	{
		canonical: "hematocrit",
		display: "Hematocrit",
		category: "cbc",
		unit: "%",
		aliases: ["hct"],
	},
	{
		canonical: "mcv",
		display: "MCV",
		category: "cbc",
		unit: "fL",
		aliases: ["meancorpuscularvolume"],
	},
	{
		canonical: "mch",
		display: "MCH",
		category: "cbc",
		unit: "pg",
		aliases: ["meancorpuscularhemoglobin"],
	},
	{
		canonical: "mchc",
		display: "MCHC",
		category: "cbc",
		unit: "g/dL",
		aliases: ["meancorpuscularhemoglobinconcentration"],
	},
	{
		canonical: "rdw",
		display: "RDW",
		category: "cbc",
		unit: "%",
		aliases: ["redcelldistributionwidth"],
	},
	{
		canonical: "platelets",
		display: "Platelets",
		category: "cbc",
		unit: "10^3/uL",
		aliases: ["plt", "plateletcount"],
	},
	{
		canonical: "neutrophils",
		display: "Neutrophils",
		category: "cbc",
		unit: "%",
		aliases: ["neut", "neutrophil"],
	},
	{
		canonical: "lymphocytes",
		display: "Lymphocytes",
		category: "cbc",
		unit: "%",
		aliases: ["lymph", "lymphocyte"],
	},
	{
		canonical: "monocytes",
		display: "Monocytes",
		category: "cbc",
		unit: "%",
		aliases: ["mono", "monocyte"],
	},
	{
		canonical: "eosinophils",
		display: "Eosinophils",
		category: "cbc",
		unit: "%",
		aliases: ["eos", "eosinophil"],
	},
	{
		canonical: "basophils",
		display: "Basophils",
		category: "cbc",
		unit: "%",
		aliases: ["baso", "basophil"],
	},

	// cardiac / other
	{
		canonical: "nt_probnp",
		display: "NT-proBNP",
		category: "cardiac",
		unit: "pg/mL",
		aliases: ["ntprobnp"],
	},
	{
		canonical: "troponin",
		display: "Troponin",
		category: "cardiac",
		unit: "ng/mL",
		aliases: ["troponini", "tnt"],
	},
	{
		canonical: "psa",
		display: "PSA",
		category: "other",
		unit: "ng/mL",
		aliases: ["prostatespecificantigen"],
	},
];

// build a lookup keyed by aliases + canonical itself, all normalized.
const LOOKUP: Map<string, BiomarkerDef> = (() => {
	const m = new Map<string, BiomarkerDef>();
	for (const b of BIOMARKERS) {
		m.set(stripKey(b.canonical), b);
		m.set(stripKey(b.display), b);
		for (const a of b.aliases) m.set(stripKey(a), b);
	}
	return m;
})();

function stripKey(s: string): string {
	return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * try to match a raw biomarker name (from a pdf row, llm output, etc.) to
 * a known canonical definition. case- and punctuation-insensitive.
 */
export function normalizeName(raw: string): BiomarkerDef | null {
	if (!raw) return null;
	return LOOKUP.get(stripKey(raw)) ?? null;
}

/**
 * fallback: if not in the dictionary, derive a canonical_name from the raw
 * string (snake_case, ascii) so trend joins still work for one-off
 * biomarkers we haven't catalogued yet.
 */
export function fallbackCanonical(raw: string): string {
	return raw
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "")
		.slice(0, 64);
}

export const CATEGORY_LABELS: Record<BiomarkerCategory, string> = {
	lipids: "Lipids",
	cbc: "Complete Blood Count",
	cmp: "Comprehensive Metabolic Panel",
	thyroid: "Thyroid",
	hormones: "Hormones",
	inflammation: "Inflammation",
	vitamins: "Vitamins & Minerals",
	metabolic: "Metabolic",
	iron: "Iron",
	kidney: "Kidney",
	liver: "Liver",
	cardiac: "Cardiac",
	other: "Other",
};
