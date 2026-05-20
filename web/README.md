# WrightAI Web Dashboard

The WrightAI web dashboard — hosted at [wrightai-web.fly.dev](https://www.wrightai.live) — is the sign-in portal and user-facing control panel for the hosted WrightAI service.

Built with Next.js (App Router). TypeScript throughout.

---

## What's in here

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/login` | GitHub / Google OAuth sign-in via WorkOS |
| `/auth/callback` | OAuth callback handler |
| `/dashboard` | Overview — coverage %, recent activity |
| `/dashboard/generate` | Trigger doc generation for a connected repo |
| `/dashboard/coverage` | Documentation coverage report |
| `/dashboard/drift` | Drift detection results |
| `/dashboard/chat` | Codebase chat (streaming) |
| `/dashboard/keys` | Manage personal `wai_` API keys |
| `/dashboard/usage` | API usage stats |
| `/dashboard/settings` | Account settings |
| `/dashboard/llms-txt` | View / regenerate `llms.txt` |
| `/dashboard/mcp` | MCP server setup instructions |
| `/dashboard/help` | Help and documentation links |
| `/docs` | In-app documentation |

---

## Local Development

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_API_URL and other vars

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | WrightAI API base URL (default: `https://wrightai-api.fly.dev`) |
| `WORKOS_API_KEY` | WorkOS API key (server-side OAuth) |
| `WORKOS_CLIENT_ID` | WorkOS client ID |
| `WORKOS_REDIRECT_URI` | OAuth redirect URI |
| `NEXTAUTH_SECRET` | Session secret |

---

## Deployment

The dashboard is deployed to Fly.io from the project root:

```bash
fly deploy
```

The `fly.toml` at the repo root configures the app name, region, and health checks.

---

## API Proxy

All requests to the WrightAI backend go through `/app/api/proxy/[...path]/route.ts`, which forwards them to `NEXT_PUBLIC_API_URL` and attaches the user's session cookie / API key. This keeps API keys server-side and avoids CORS issues.
