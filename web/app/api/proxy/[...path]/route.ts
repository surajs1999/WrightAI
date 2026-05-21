import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { API_URL } from "@/lib/api";

type Context = { params: Promise<{ path: string[] }> };

/**
 * Forwards an incoming Next.js API request to the configured backend API, enforcing authentication via a cookie-based token.
 *
 * Reads the 'wright_token' cookie to authenticate the request, constructs the upstream backend URL from the dynamic route path segments and query string, proxies the request with the appropriate method, headers, and body, and streams back the upstream response — including support for Server-Sent Events (text/event-stream) responses.
 *
 * @param {NextRequest} request - The incoming Next.js server-side request object, containing the HTTP method, headers, body, and URL details.
 * @param {Context} context - The Next.js route handler context containing dynamic route parameters (e.g., the catch-all 'path' segments used to reconstruct the backend URL path).
 * @returns {Promise<NextResponse>} A NextResponse containing the upstream backend's response body, status code, and content-type headers. Returns a 401 JSON error response if the authentication token is missing. Returns a streaming NextResponse with no-cache headers for Server-Sent Event streams.
 * @example
 * // Used as a Next.js route handler in app/api/proxy/[...path]/route.ts
 * export const GET = (request: NextRequest, context: Context) => forward(request, context);
 * export const POST = (request: NextRequest, context: Context) => forward(request, context);
 * 
 * // A GET request to /api/proxy/users/42?include=details
 * // will be forwarded to {API_URL}/users/42?include=details with the wright_token cookie as X-Wright-API-Key.
 */




async function forward(request: NextRequest, context: Context): Promise<NextResponse> {
  const cookieStore = await cookies();
  const token = cookieStore.get("wright_token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { path } = await context.params;
  const backendPath = "/" + path.join("/");
  const search = request.nextUrl.search;
  const url = `${API_URL}${backendPath}${search}`;

  const headers: HeadersInit = {
    "X-Wright-API-Key": token,
  };

  const contentType = request.headers.get("content-type");
  if (contentType) headers["Content-Type"] = contentType;

  let body: BodyInit | undefined;
  if (!["GET", "HEAD"].includes(request.method)) {
    body = await request.text();
  }

  const upstream = await fetch(url, {
    method: request.method,
    headers,
    body,
  });

  const upstreamContentType = upstream.headers.get("content-type") ?? "application/json";

  if (upstreamContentType.includes("text/event-stream")) {
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  }

  const data = await upstream.text();
  return new NextResponse(data, {
    status: upstream.status,
    headers: { "Content-Type": upstreamContentType },
  });
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const DELETE = forward;
export const PATCH = forward;
