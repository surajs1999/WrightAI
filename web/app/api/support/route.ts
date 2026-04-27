import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  const body = await request.json();

  const { category, subject, description, email, severity, steps, affected_features, meta } = body;

  if (!subject?.trim() || !description?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Attach the Wright user ID if logged in
  const cookieStore = await cookies();
  const token = cookieStore.get("wright_token")?.value ?? null;

  const { error } = await supabase.from("support_tickets").insert({
    category: category ?? "general",
    subject: subject.trim(),
    description: description.trim(),
    email: email.trim(),
    severity: severity ?? null,
    steps: steps?.trim() ?? null,
    affected_features: affected_features ?? [],
    user_agent: meta?.userAgent ?? null,
    submitted_at: meta?.ts ?? new Date().toISOString(),
    api_key_hint: token ? token.slice(0, 7) : null,
    status: "open",
  });

  if (error) {
    console.error("Supabase insert error:", error.message);
    return NextResponse.json({ error: "Failed to save ticket" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
