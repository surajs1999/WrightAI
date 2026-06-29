---
agent_auth:
  skill: https://wrightai.live/auth.md
  register_uri: https://wrightai.live/dashboard/keys
  identity_types_supported:
    - identity_assertion
    - anonymous
  identity_assertion:
    assertion_types_supported:
      - verified_email
    credential_types_supported:
      - api_key
    claim_uri: https://wrightai.live/api/auth/key
  anonymous:
    credential_types_supported:
      - api_key
    claim_uri: https://wrightai.live/api/auth/key
  revocation_uri: https://wrightai.live/dashboard/keys
  events_supported:
    - credential_revoked
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

- GitHub (OAuth 2.0 via WorkOS)
- Google (OAuth 2.0 / OIDC via WorkOS)

## API Documentation

Full API reference: [https://wrightai.live/docs](https://wrightai.live/docs)

## Support

For agent integration support: hello@wrightai.live
