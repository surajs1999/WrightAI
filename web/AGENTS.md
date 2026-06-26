<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Critical file convention changes in Next.js 16

### Middleware → Proxy (BREAKING)
`middleware.ts` is **deprecated and removed** in Next.js 16.

| Next.js ≤15 | Next.js 16 |
|-------------|------------|
| `middleware.ts` | `proxy.ts` |
| `export function middleware(...)` | `export function proxy(...)` |

**DO NOT create `middleware.ts`** — it will be silently ignored at best, or break the build at worst. All Edge request interception (auth guards, bot blocking, redirects) belongs in `proxy.ts` at the root of `web/`.

The existing `proxy.ts` already handles:
- WordPress/CMS scanner probe blocking (403)
- Headless browser + raw HTTP client blocking (HeadlessChrome, curl, Go-http-client, etc.)

Add new intercept logic there, not in a new file.
<!-- END:nextjs-agent-rules -->
