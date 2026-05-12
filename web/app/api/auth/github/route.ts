import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { API_URL } from "@/lib/api";

/**
 * Initiates GitHub OAuth authentication flow by retrieving the user's authorization token and redirecting to GitHub's authorization endpoint.
 *
 * This Next.js API route handler authenticates the user via a cookie-stored token, forwards the token to the backend GitHub OAuth endpoint via a custom header, and redirects the client to GitHub's OAuth authorization page. The backend encodes the API key in the OAuth state for subsequent callback processing.
 *
 * @param {NextRequest} request - The incoming Next.js request object containing headers, cookies, and request metadata.
 * @returns {Promise<NextResponse>} A NextResponse object that either redirects to GitHub OAuth (302), returns unauthorized error (401), or returns a gateway error (502) if the backend fails to provide a redirect location.
 * @example
 * const response = await GET(request);
 */
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
