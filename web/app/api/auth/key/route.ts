import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api";

/**
 * Rotates the user's API key by calling the backend, then updates the wright_token cookie.
 */
export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get("wright_token")?.value ?? "";
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const res = await fetch(`${API_URL}/user/key/rotate`, {
    method: "POST",
    headers: { "X-Wright-API-Key": token },
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Rotation failed" }, { status: res.status });
  }

  const { api_key: newKey } = await res.json();
  const masked = `${newKey.slice(0, 7)}${"•".repeat(16)}${newKey.slice(-4)}`;

  const response = NextResponse.json({ key: newKey, masked });
  response.cookies.set("wright_token", newKey, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

/**
 * Retrieves the Wright API authentication token from cookies and returns it along with a masked version and creation timestamp.
 *
 * This Next.js API route handler reads the 'wright_token' cookie, masks it for display purposes (showing first 7 and last 4 characters), and attempts to fetch the token's creation date from the backend API. If no token exists, returns empty values. The creation date fetch is non-fatal and will gracefully fall back to null if it fails.
 * @returns {Promise<NextResponse>} A NextResponse containing a JSON object with three properties: 'key' (full token string or empty), 'masked' (partially hidden token for display or empty), and 'created_at' (ISO timestamp string or null).
 * @example
 * const response = await GET(); // Returns: { key: 'abc1234...xyz9', masked: 'abc1234••••••••••••••••xyz9', created_at: '2024-01-15T10:30:00Z' }
 */
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("wright_token")?.value ?? "";

  if (!token) {
    return NextResponse.json({ key: "", masked: "", created_at: null });
  }

  const masked = `${token.slice(0, 7)}${"•".repeat(16)}${token.slice(-4)}`;

  // Fetch created_at from backend
  let created_at: string | null = null;
  try {
    const res = await fetch(`${API_URL}/user/me`, {
      headers: { "X-Wright-API-Key": token },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      created_at = data.created_at ?? null;
    }
  } catch {
    // Non-fatal — key still works, date just won't show
  }

  return NextResponse.json({ key: token, masked, created_at });
}
