import { NextRequest, NextResponse } from "next/server";

// Substrings found in WordPress/CMS scanner probes — never valid on this site
const PROBE_SUBSTRINGS = [
  "wp-includes",
  "wp-admin",
  "wp-content",
  "wp-login",
  "wlwmanifest",
  "xmlrpc.php",
  "phpinfo",
  ".env",
  "config.php",
  "setup.php",
  "install.php",
  "php-fpm",
  "cgi-bin",
];

// Headless/automated browsers and raw HTTP clients that provide no legitimate
// user value on a marketing/app frontend. Legitimate AI crawlers (GPTBot,
// ClaudeBot, Googlebot) identify themselves honestly and don't use these UAs.
const BLOCKED_UA_SUBSTRINGS = [
  "HeadlessChrome",
  "headlesschrome",
  "PhantomJS",
  "SlimerJS",
  "Go-http-client",
  "python-requests",
  "python-httpx",
  "curl/",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const lower = pathname.toLowerCase();

  for (const probe of PROBE_SUBSTRINGS) {
    if (lower.includes(probe)) {
      return new NextResponse(null, { status: 403 });
    }
  }

  const ua = request.headers.get("user-agent") ?? "";
  for (const blocked of BLOCKED_UA_SUBSTRINGS) {
    if (ua.includes(blocked)) {
      return new NextResponse(null, { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  // Run on every path except Next.js internals and static assets
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|woff2?|ttf|eot|ico)$).*)",
  ],
};
