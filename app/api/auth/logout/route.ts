import { NextResponse } from "next/server";
import { clearSessionCookie } from "../../../lib/auth";

export const dynamic = "force-static";

export async function POST() {
	return NextResponse.json(
		{ ok: true },
		{ headers: { "set-cookie": clearSessionCookie() } },
	);
}
