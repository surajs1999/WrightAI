import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api";

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
