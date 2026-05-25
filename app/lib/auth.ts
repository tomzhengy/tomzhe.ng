/**
 * shared session helpers for the password-gated biomarker section.
 *
 * single shared password. on successful login we set an HttpOnly cookie
 * `tz_session=<expiresAtMs>.<hex hmac-sha256(COOKIE_SECRET, expiresAtMs)>`.
 * verification re-computes the hmac and constant-time compares.
 *
 * runs in both node (next dev) and cloudflare workers via the web
 * crypto subtle api, which is available in both environments.
 */

export interface AuthEnv {
	SITE_PASSWORD?: string;
	COOKIE_SECRET?: string;
}

const COOKIE_NAME = "tz_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days

const enc = new TextEncoder();

async function hmacHex(secret: string, message: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw",
		enc.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
	const bytes = new Uint8Array(sig);
	let hex = "";
	for (const b of bytes) hex += b.toString(16).padStart(2, "0");
	return hex;
}

export function constantTimeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

function readCookie(header: string | null, name: string): string | null {
	if (!header) return null;
	const parts = header.split(";");
	for (const part of parts) {
		const eq = part.indexOf("=");
		if (eq < 0) continue;
		const k = part.slice(0, eq).trim();
		if (k === name) return decodeURIComponent(part.slice(eq + 1).trim());
	}
	return null;
}

export async function verifySessionCookie(
	request: Request,
	env: AuthEnv,
): Promise<boolean> {
	const secret = env.COOKIE_SECRET;
	if (!secret) return false;
	const raw = readCookie(request.headers.get("cookie"), COOKIE_NAME);
	if (!raw) return false;
	const dot = raw.indexOf(".");
	if (dot < 0) return false;
	const expiresStr = raw.slice(0, dot);
	const sig = raw.slice(dot + 1);
	const expiresAt = Number(expiresStr);
	if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return false;
	const expected = await hmacHex(secret, expiresStr);
	return constantTimeEqual(sig, expected);
}

export async function issueSessionCookie(
	env: AuthEnv,
	expiresAtMs: number,
): Promise<string> {
	const secret = env.COOKIE_SECRET;
	if (!secret) throw new Error("COOKIE_SECRET not configured");
	const expiresStr = String(expiresAtMs);
	const sig = await hmacHex(secret, expiresStr);
	const value = `${expiresStr}.${sig}`;
	return `${COOKIE_NAME}=${encodeURIComponent(value)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${MAX_AGE_SECONDS}`;
}

export function clearSessionCookie(): string {
	return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

export async function checkPassword(
	env: AuthEnv,
	candidate: string,
): Promise<boolean> {
	const expected = env.SITE_PASSWORD;
	if (!expected) return false;
	return constantTimeEqual(candidate, expected);
}

export function sessionExpiryFromNow(): number {
	return Date.now() + MAX_AGE_SECONDS * 1000;
}
