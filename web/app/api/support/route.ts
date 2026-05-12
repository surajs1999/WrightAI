import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";

/**
 * Handles POST requests to create a new support ticket by validating required fields, extracting authentication token from cookies, and inserting the ticket into the database.
 *
 * This Next.js API route handler processes support ticket submissions by validating required fields (subject, description, email), optionally extracting the user's authentication token from cookies if logged in, and inserting the ticket data into the Supabase 'support_tickets' table with a default status of 'open'. Returns appropriate error responses for missing fields or database failures.
 *
 * @param {NextRequest} request - The incoming Next.js request object containing the JSON body with support ticket fields including category, subject, description, email, severity, steps, affected_features, and meta information.
 * @returns {Promise<NextResponse>} A Next.js response object containing either a success indicator {ok: true} with status 200, an error message {error: string} with status 400 for missing required fields, or status 500 for database insertion failures.
 * @example
 * const response = await POST(new NextRequest('http://localhost:3000/api/support', { method: 'POST', body: JSON.stringify({ subject: 'Bug Report', description: 'App crashes on login', email: 'user@example.com', category: 'bug', severity: 'high' }) }))
 */
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
