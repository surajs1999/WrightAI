import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { API_URL, APP_URL } from "@/lib/api";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state") ?? "/dashboard";
  const error = request.nextUrl.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${APP_URL}/login?error=${error ?? "missing_code"}`);
  }

  const redirectUri = `${APP_URL}/auth/callback`;

  let apiKey: string;
  let user: object;

  try {
    const res = await fetch(
      `${API_URL}/auth/callback?code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(redirectUri)}`,
      { method: "GET" }
    );

    if (!res.ok) {
      return NextResponse.redirect(`${APP_URL}/login?error=auth_failed`);
    }

    const data = await res.json();
    apiKey = data.api_key;
    user = data.user ?? {};
  } catch {
    return NextResponse.redirect(`${APP_URL}/login?error=auth_failed`);
  }

  const redirectTo = state.startsWith("/") ? state : "/dashboard";
  const response = NextResponse.redirect(`${APP_URL}${redirectTo}`);

  response.cookies.set("wright_token", apiKey, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  response.cookies.set("wright_user", JSON.stringify(user), {
    httpOnly: false,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
