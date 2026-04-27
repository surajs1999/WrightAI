import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { API_URL } from "@/lib/api";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("wright_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Backend /auth/github reads X-Wright-API-Key from the header and encodes it in
  // the OAuth state so the callback can save the GitHub token to the right user.
  const backendUrl = `${API_URL}/auth/github`;
  const resp = await fetch(backendUrl, {
    headers: { "X-Wright-API-Key": token },
    redirect: "manual",
  });

  const location = resp.headers.get("location");
  if (location) return NextResponse.redirect(location);
  return NextResponse.json({ error: "Failed to initiate GitHub OAuth" }, { status: 502 });
}
