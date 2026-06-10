# WrightAI Web Dashboard

The WrightAI web dashboard — hosted at [wrightai.live](https://www.wrightai.live) on Cloud Run — is the sign-in portal and user-facing control panel for the hosted WrightAI service.

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
| `/pricing` | Plans and Paddle checkout |
| `/billing/checkout` | Paddle checkout fallback/retry page |
| `/terms-of-service` | Terms of Service |
| `/privacy-policy` | Privacy Policy |
| `/refund-policy` | Refund Policy |

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
| `NEXT_PUBLIC_API_URL` | WrightAI API base URL (default: `https://api.wrightai.live`) |
| `NEXT_PUBLIC_APP_URL` | This dashboard's own public URL (default: `https://wrightai.live`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (client-side) |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | Paddle client-side token for `Paddle.Checkout.open()`; a `live_` prefix selects the production Paddle environment, anything else uses sandbox |

---

## Deployment

The dashboard is deployed to **Cloud Run** (`wrightai-web`, region `asia-southeast1`) via the `deploy-web.yml` GitHub Actions workflow on every push to `main` that touches `web/**`, `cloudrun-web.yaml`, or the workflow itself (or via manual `workflow_dispatch`).

The workflow builds a Docker image from `web/`, pushes it to Artifact Registry tagged with the commit SHA, and deploys it with `gcloud run services replace` using `cloudrun-web.yaml` (image tag swapped from `:latest` to the immutable `:<sha>`).

---

## API Proxy

All requests to the WrightAI backend go through `/app/api/proxy/[...path]/route.ts`, which forwards them to `NEXT_PUBLIC_API_URL` and attaches the user's session cookie / API key. This keeps API keys server-side and avoids CORS issues.
