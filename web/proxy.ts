import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Handles authentication middleware logic by redirecting unauthenticated users to login and authenticated users away from the login page.
 *
 * This proxy middleware function checks for the presence of a 'wright_token' cookie to determine authentication status. It protects dashboard routes by redirecting unauthenticated requests to the login page with a 'next' query parameter. It also prevents authenticated users from accessing the login page by redirecting them to the dashboard.
 *
 * @param {NextRequest} request - The incoming Next.js request object containing URL information and cookies.
 * @returns {NextResponse} A NextResponse object that either redirects to login, redirects to dashboard, or allows the request to continue.
 * @example
 * const response = proxy(request);
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("wright_token");

  if (pathname.startsWith("/dashboard") && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login" && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
