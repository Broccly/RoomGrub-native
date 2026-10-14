# RoomGrub Native — Secure Communication

## Transport

- Always talk to `RoomGrub-backend` over HTTPS in any non-local build. Local dev against
  a `uvicorn` server on your LAN (plain HTTP) is fine, but that must be gated behind an
  explicit dev flag, never a fallback that could silently ship in a production build.
- Backend base URL must come from an env var, not be hardcoded in source. See the
  `EXPO_PUBLIC_API_BASE_URL` pattern below — this replaces the current anti-pattern in
  `src/utils/supabase.ts:9-15`, which hardcodes both the production Supabase URL and the
  anon key directly in a committed source file.

### `.env.example` (to add at repo root; none exists today)

```env
# Local dev backend
EXPO_PUBLIC_API_BASE_URL=http://192.168.0.160:8000

# Production
# EXPO_PUBLIC_API_BASE_URL=https://api.roomgrub.app
```

Do not hardcode both values in `src/utils/*` and switch on a boolean flag the way
`supabase.ts` does today — read the URL from `process.env.EXPO_PUBLIC_API_BASE_URL`
directly, with the env file (not source) as the place that differs per environment.

## Token storage

- Store the backend-issued refresh token in `expo-secure-store` (Keychain on iOS,
  Keystore on Android). The access JWT is kept in memory only and never written to
  disk.
- Do **not** reuse `AsyncStorage` for tokens
  for its session (`src/utils/supabase.ts`) — AsyncStorage is unencrypted on-device
  storage.
- Never log the access, refresh or provider tokens (no `console.log` of request headers/bodies that
  include `Authorization` or `token` fields).

## What the app does and doesn't need

- The app needs a Google/Facebook OAuth **client ID** for native sign-in — never a
  client secret. Client secrets stay server-side (they aren't even needed by this
  backend's flow, since it verifies provider tokens directly rather than doing its own
  OAuth code exchange).
- The backend's `JWT_SECRET` is exclusively server-side; the app never sees or needs it
  — it only ever presents the access JWT it was issued, as an opaque bearer token.

## Request hygiene

- Set a request timeout on the API client (the backend has no built-in rate limiting or
  timeout handling — an unbounded client-side wait on a hung request is a real risk).
- Centralize `401` handling in one place (the API client wrapper), not scattered per
  call site — see the auth contract in [AUTH.md](./AUTH.md).
- Never put tokens or PII in query strings (they end up in server access logs).

## Known backend-side gaps (not fixable from the native app)

- No HTTPS enforcement at the app layer (assumed to be handled by whatever reverse
  proxy/hosting sits in front of `uvicorn` in production — verify this before shipping).
- No rate limiting or additional security middleware beyond a CORS allow-list.

These are worth raising with whoever owns `RoomGrub-backend` before a production launch;
they're out of scope for native-app-side documentation but directly affect what "secure
communication" can mean end-to-end.

## Related docs

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [AUTH.md](./AUTH.md)
- [TODOS.md](./TODOS.md)
