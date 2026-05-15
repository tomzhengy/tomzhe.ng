/**
 * low-level withings client.
 *
 * concerns: oauth refresh-token flow (with supabase-persisted rotation),
 * single-page getmeas calls, and offset-paginated full walks. used by the
 * live /api/health handler and by scripts/sync-withings.ts for backfills.
 *
 * notes that differ from whoop:
 *  - withings wraps every response in `{status, body}`; status !== 0 is a
 *    domain error even on http 200. helper unwraps and throws.
 *  - oauth requires `action=requesttoken` in the form body.
 *  - refresh tokens are single-use; rotated value comes back in the response
 *    and is persisted to supabase (`withings_tokens` table).
 */

export interface WithingsEnv {
	WITHINGS_CLIENT_ID?: string;
	WITHINGS_CLIENT_SECRET?: string;
	WITHINGS_REFRESH_TOKEN?: string;
	NEXT_PUBLIC_SUPABASE_URL?: string;
	SUPABASE_SERVICE_ROLE_KEY?: string;
}

const WITHINGS_TOKEN_URL = "https://wbsapi.withings.net/v2/oauth2";
const WITHINGS_MEASURE_URL = "https://wbsapi.withings.net/measure";

interface WithingsEnvelope<T> {
	status: number;
	body?: T;
	error?: string;
}

async function withingsPost<T>(
	url: string,
	body: URLSearchParams,
	headers: Record<string, string> = {},
): Promise<T> {
	const r = await fetch(url, {
		method: "POST",
		headers: {
			"content-type": "application/x-www-form-urlencoded",
			...headers,
		},
		body,
	});
	if (!r.ok) {
		const t = await r.text();
		throw new Error(`withings ${url} http ${r.status}: ${t}`);
	}
	const json = (await r.json()) as WithingsEnvelope<T>;
	if (json.status !== 0) {
		throw new Error(
			`withings ${url} api status ${json.status}: ${json.error ?? "unknown"}`,
		);
	}
	if (json.body == null) {
		throw new Error(`withings ${url}: missing body`);
	}
	return json.body;
}

interface WithingsTokenBody {
	access_token?: string;
	refresh_token?: string;
	expires_in?: number;
	scope?: string;
	userid?: number | string;
	token_type?: string;
}

export async function exchangeWithingsRefreshToken(
	env: WithingsEnv,
): Promise<string> {
	if (!env.WITHINGS_CLIENT_ID || !env.WITHINGS_CLIENT_SECRET) {
		throw new Error("missing WITHINGS_CLIENT_ID / WITHINGS_CLIENT_SECRET");
	}

	const currentToken =
		(await readStoredRefreshToken(env)) || env.WITHINGS_REFRESH_TOKEN;
	if (!currentToken) {
		throw new Error(
			"no refresh token available — seed withings_tokens or set WITHINGS_REFRESH_TOKEN",
		);
	}

	const body = new URLSearchParams({
		action: "requesttoken",
		grant_type: "refresh_token",
		client_id: env.WITHINGS_CLIENT_ID,
		client_secret: env.WITHINGS_CLIENT_SECRET,
		refresh_token: currentToken,
	});

	const tokenBody = await withingsPost<WithingsTokenBody>(
		WITHINGS_TOKEN_URL,
		body,
	);

	if (!tokenBody.access_token) {
		throw new Error("withings token response missing access_token");
	}

	if (tokenBody.refresh_token && tokenBody.refresh_token !== currentToken) {
		await writeStoredRefreshToken(env, tokenBody.refresh_token);
	}

	return tokenBody.access_token;
}

interface WithingsMeasure {
	value: number;
	type: number;
	unit: number;
	algo?: number;
	fm?: number;
	fw?: number;
}

export interface WithingsMeasureGroup {
	grpid: number;
	attrib: number;
	date: number; // unix epoch seconds, when the measurement was taken
	created?: number;
	modified?: number;
	category: number; // 1 = real measurement, 2 = user objective
	deviceid?: string;
	hash_deviceid?: string;
	measures: WithingsMeasure[];
	comment?: string | null;
}

export interface WithingsMeasurePage {
	updatetime?: number;
	timezone?: string;
	measuregrps: WithingsMeasureGroup[];
	more?: number;
	offset?: number;
}

export async function withingsGetMeas(
	accessToken: string,
	params: Record<string, string> = {},
): Promise<WithingsMeasurePage> {
	const body = new URLSearchParams({ action: "getmeas", ...params });
	return withingsPost<WithingsMeasurePage>(WITHINGS_MEASURE_URL, body, {
		authorization: `Bearer ${accessToken}`,
	});
}

/**
 * walks getmeas via `more` / `offset` cursors until exhausted. yields each
 * page so callers can process incrementally. pass `meastype`, `category`,
 * `startdate` (unix seconds), `lastupdate`, etc. via `params`.
 */
export async function* withingsGetMeasAll(
	accessToken: string,
	params: Record<string, string> = {},
): AsyncGenerator<WithingsMeasureGroup[]> {
	let offset: number | undefined = undefined;
	while (true) {
		const page = await withingsGetMeas(accessToken, {
			...params,
			...(offset != null ? { offset: String(offset) } : {}),
		});
		if (page.measuregrps.length > 0) yield page.measuregrps;
		if (!page.more || page.offset == null) return;
		offset = page.offset;
	}
}

async function readStoredRefreshToken(
	env: WithingsEnv,
): Promise<string | null> {
	const base = env.NEXT_PUBLIC_SUPABASE_URL;
	const key = env.SUPABASE_SERVICE_ROLE_KEY;
	if (!base || !key) return null;
	try {
		const r = await fetch(
			`${base}/rest/v1/withings_tokens?id=eq.current&select=refresh_token`,
			{ headers: { apikey: key, authorization: `Bearer ${key}` } },
		);
		if (!r.ok) return null;
		const rows = (await r.json()) as Array<{ refresh_token?: string }>;
		const val = rows?.[0]?.refresh_token;
		return val && val.length > 0 ? val : null;
	} catch {
		return null;
	}
}

async function writeStoredRefreshToken(
	env: WithingsEnv,
	refreshToken: string,
): Promise<void> {
	const base = env.NEXT_PUBLIC_SUPABASE_URL;
	const key = env.SUPABASE_SERVICE_ROLE_KEY;
	if (!base || !key) return;
	try {
		await fetch(`${base}/rest/v1/withings_tokens?id=eq.current`, {
			method: "PATCH",
			headers: {
				apikey: key,
				authorization: `Bearer ${key}`,
				"content-type": "application/json",
				prefer: "return=minimal",
			},
			body: JSON.stringify({
				refresh_token: refreshToken,
				updated_at: new Date().toISOString(),
			}),
		});
	} catch {
		// swallow: persistence failures shouldn't fail the request in-flight.
	}
}
