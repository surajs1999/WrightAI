---
agent_auth:
  skill: https://wrightai.live/auth.md
  register_uri: https://wrightai.live/dashboard/keys
  identity_endpoint: https://wrightai.live/api/auth/login
  claim_endpoint: https://wrightai.live/api/auth/key
  identity_types_supported:
    - anonymous
    - identity_assertion
  identity_assertion:
    assertion_types_supported:
      - urn:ietf:params:oauth:token-type:id-jag
  anonymous:
    credential_types_supported:
      - api_key
    claim_uri: https://wrightai.live/api/auth/key
  revocation_uri: https://wrightai.live/api/auth/logout
  events_supported:
    - https://schemas.workos.com/events/agent/auth/identity/assertion/revoked
---

# Auth.md

Wright AI uses [WorkOS](https://workos.com) for identity and authentication.

## Agent Registration

AI agents can obtain API credentials via the anonymous or identity assertion flow:

- **Anonymous:** POST to `https://wrightai.live/api/auth/key` to claim an API key directly
- **Identity assertion:** Submit an ID-JAG to `https://wrightai.live/api/auth/login`, then exchange for an API key at `https://wrightai.live/api/auth/key`

Include the key on every API request: `X-Wright-API-Key: wai_your_key`

## Credential Types

| Type | Format | Header |
|---|---|---|
| API Key | `wai_<token>` | `X-Wright-API-Key` |

## Endpoints

| Purpose | URL |
|---|---|
| Identity / Authorization | `https://wrightai.live/api/auth/login` |
| Claim / Token | `https://wrightai.live/api/auth/key` |
| Revocation | `https://wrightai.live/api/auth/logout` |
| Key management | `https://wrightai.live/dashboard/keys` |
| OAuth discovery | `https://wrightai.live/.well-known/oauth-authorization-server` |
| Protected resource | `https://wrightai.live/.well-known/oauth-protected-resource` |

## Supported Identity Types

- **Anonymous** — claim an API key directly without identity assertion
- **Identity assertion (ID-JAG)** — assert a user identity via GitHub or Google OAuth (WorkOS)

## API Documentation

Full reference: [https://wrightai.live/docs](https://wrightai.live/docs)

## Support

hello@wrightai.live
