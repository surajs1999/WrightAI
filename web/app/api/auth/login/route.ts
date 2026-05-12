import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { API_URL, APP_URL } from "@/lib/api";

/**
 * Handles GET requests to initiate OAuth authentication by redirecting to the backend login endpoint with provider and callback parameters.
 *
 * Constructs a login URL with the specified OAuth provider (defaulting to GoogleOAuth), the next destination after authentication (defaulting to /dashboard), and the callback redirect URI. The function then redirects the user to the backend authentication service to begin the OAuth flow.
 *
 * @param {NextRequest} request - The incoming Next.js request object containing URL search parameters for provider and next destination.
 * @returns {Promise<NextResponse>} A NextResponse object that redirects the user to the backend API authentication endpoint.
 * @example
 * // Called automatically by Next.js router when accessing /api/auth/login?provider=GoogleOAuth&next=/dashboard
 */
export async function GET(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get("provider") ?? "GoogleOAuth";
  const next = request.nextUrl.searchParams.get("next") ?? "/dashboard";

  const redirectUri = `${APP_URL}/auth/callback`;

  const loginUrl = `${API_URL}/auth/login?provider=${encodeURIComponent(provider)}&state=${encodeURIComponent(next)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  return NextResponse.redirect(loginUrl);
}
