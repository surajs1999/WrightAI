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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const lower = pathname.toLowerCase();

  for (const probe of PROBE_SUBSTRINGS) {
    if (lower.includes(probe)) {
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
