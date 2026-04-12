import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../lib/supabase-client";

export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json(
      { error: "supabase not configured" },
      { status: 500 },
    );
  }

  const { message, contact } = await request.json();

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  const { error } = await supabase.from("suggestions").insert({
    message: message.trim(),
    contact: contact || null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
