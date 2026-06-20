import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { API_URL, APP_URL } from "@/lib/api";

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const code = params["code"];
  const state = params["state"] ?? "/dashboard";
  const error = params["error"];

  if (error || !code) {
    redirect(`/login?error=${error ?? "missing_code"}`);
  }

  const redirectUri = `${APP_URL}/auth/callback`;

  try {
    const res = await fetch(
      `${API_URL}/auth/callback?code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(redirectUri)}`,
      { method: "GET", cache: "no-store" }
    );

    if (!res.ok) {
      redirect("/login?error=auth_failed");
    }

    const data = await res.json();
    const apiKey: string = data.api_key;
    const user = data.user ?? {};

    const cookieStore = await cookies();
    cookieStore.set("wright_token", apiKey, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    cookieStore.set("wright_user", JSON.stringify(user), {
      httpOnly: false,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  } catch {
    redirect("/login?error=auth_failed");
  }

  const redirectTo = state.startsWith("/") ? state : "/dashboard";
  redirect(redirectTo);
}
