import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

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

// Clearly malicious or abandoned headless clients with no legitimate scanner use.
// HeadlessChrome and Go-http-client are intentionally excluded — they are used
// by legitimate scanners (Lighthouse, PageSpeed, isitagentready.com, Cloudflare).
const BLOCKED_UA_SUBSTRINGS = [
  "PhantomJS",
  "SlimerJS",
  "python-requests",
  "python-httpx",
];

export function proxy(request: NextRequest) {
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
  matcher: [
    // Exclude static assets, well-known discovery files, and agent-readable files
    // so legitimate AI crawlers and checkers can always reach them
    "/((?!_next/static|_next/image|favicon\\.ico|\\.well-known/|llms\\.txt|robots\\.txt|auth\\.md|sitemap\\.xml|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|woff2?|ttf|eot|ico)$).*)",
  ],
};
