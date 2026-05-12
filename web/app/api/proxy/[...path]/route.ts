import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { API_URL } from "@/lib/api";

type Context = { params: Promise<{ path: string[] }> };

/**
 * Forwards an authenticated HTTP request to a backend API server, handling cookie-based authentication and streaming responses.
 *
 * This function acts as a proxy that extracts authentication tokens from cookies, reconstructs the target URL from dynamic path segments, forwards the request to the backend API with appropriate headers, and streams the response back to the client. It supports both regular and server-sent event (SSE) responses.
 *
 * @param {NextRequest} request - The incoming Next.js request object containing the HTTP method, headers, URL, and body to be forwarded.
 * @param {Context} context - The route context object containing dynamic path parameters used to construct the backend URL.
 * @returns {Promise<NextResponse>} A promise that resolves to a NextResponse containing either an error response (401 for unauthorized), a streaming SSE response, or the proxied backend response with appropriate headers and status code.
 * @example
 * const response = await forward(request, { params: { path: ['users', '123'] } })
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
