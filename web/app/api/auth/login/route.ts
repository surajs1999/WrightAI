import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { API_URL, APP_URL } from "@/lib/api";

export async function GET(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get("provider") ?? "GoogleOAuth";
  const next = request.nextUrl.searchParams.get("next") ?? "/dashboard";

  const redirectUri = `${APP_URL}/auth/callback`;

  const loginUrl = `${API_URL}/auth/login?provider=${encodeURIComponent(provider)}&state=${encodeURIComponent(next)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  return NextResponse.redirect(loginUrl);
}
