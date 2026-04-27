import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { API_URL, APP_URL } from "@/lib/api";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${APP_URL}/login?error=missing_code`);
  }

  const redirectUri = request.nextUrl.searchParams.get("redirect_uri") ?? `${APP_URL}/auth/callback`;

  try {
    const res = await fetch(`${API_URL}/auth/callback?code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(redirectUri)}`, {
      method: "GET",
    });

    if (!res.ok) {
      throw new Error(`Backend auth failed: ${res.status}`);
    }

    const data = await res.json();
    const apiKey: string = data.api_key;
    const user = data.user ?? {};

    const cookieStore = await cookies();
    cookieStore.set("wright_token", apiKey, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    cookieStore.set("wright_user", JSON.stringify(user), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    const redirectTo = state.startsWith("/") ? state : "/dashboard";
    return NextResponse.redirect(`${APP_URL}${redirectTo}`);
  } catch (err) {
    console.error("[auth/callback]", err);
    return NextResponse.redirect(`${APP_URL}/login?error=auth_failed`);
  }
}
