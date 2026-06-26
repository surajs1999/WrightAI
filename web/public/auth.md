---
agent_auth:
  register_uri: https://wrightai.live/dashboard/keys
  supported_identity_types:
    - github
    - google
  credential_types:
    - api_key
  claim_uri: https://wrightai.live/api/auth/key
  revocation_uri: https://wrightai.live/dashboard/keys
  auth_server: https://wrightai.live/.well-known/oauth-authorization-server
---

# Auth.md

Wright AI uses [WorkOS](https://workos.com) for identity and authentication.

## Agent Registration

AI agents can obtain API credentials programmatically:

1. Redirect the user to `https://wrightai.live/api/auth/login`
2. After OAuth (GitHub or Google), the user is redirected back with a session
3. Call `GET https://wrightai.live/api/auth/key` to retrieve the `wai_` API key
4. Include the key on every API request: `X-Wright-API-Key: wai_your_key`

## Credential Types

| Type | Format | Header |
|---|---|---|
| API Key | `wai_<token>` | `X-Wright-API-Key` |

## Endpoints

| Purpose | URL |
|---|---|
| Authorization | `https://wrightai.live/api/auth/login` |
| Token / API Key | `https://wrightai.live/api/auth/key` |
| Key management | `https://wrightai.live/dashboard/keys` |
| Revocation | `https://wrightai.live/dashboard/keys` |
| OAuth discovery | `https://wrightai.live/.well-known/oauth-authorization-server` |
| Protected resource | `https://wrightai.live/.well-known/oauth-protected-resource` |

## Supported Identity Providers

- GitHub (OAuth 2.0)
- Google (OAuth 2.0 / OIDC)

## API Documentation

Full API reference: [https://wrightai.live/docs](https://wrightai.live/docs)

## Support

For agent integration support: hello@wrightai.live
