# RoomGrub Native — Authentication

## Reality check

`RoomGrub-backend/docs/AUTH.md` describes verifying Supabase-issued JWTs. **That is not
what the backend code does.** The backend has its own independent auth system:

- `app/utils/auth_providers.py` verifies a Google `id_token` via
  `https://oauth2.googleapis.com/tokeninfo`, or a Facebook access token via the Graph
  API `/me` endpoint — directly, server-side, not through Supabase.
- `app/utils/jwt_utils.py::create_jwt()` mints its own HS256 JWT (`sub`, `email`, `exp`),
  signed with the backend's own `JWT_SECRET` env var. Default expiry:
  `JWT_EXPIRY_HOURS=24`.
- `app/dependencies/current_user.py::get_current_user()` decodes that same custom JWT
  on every authenticated request and looks the user up by id.

This doc describes the flow the native app must implement against **that** reality, not
the aspirational Supabase-JWT design.

## Flow

```
Native app
   │  1. Native Google/Facebook sign-in
   │     → raw provider token (Google id_token, or Facebook access_token)
   ▼
POST /api/v1/auth/login
   body: { "provider": "google" | "facebook", "token": "<provider token>" }
   │
   │  2. Backend verifies token directly with Google/Facebook,
   │     upserts the user, mints its own JWT
   ▼
Response: { "access_token": "<jwt>", "token_type": "bearer", "user": {...} }
   │
   │  3. Store access_token in expo-secure-store (never AsyncStorage)
   ▼
Every subsequent API call:
   Authorization: Bearer <access_token>
```

## Important: this requires a native sign-in change, not just a client swap

Today's login (`src/screens/LoginScreen.tsx`) goes through
`supabase.auth.signInWithOAuth({ provider: 'google', ... })`, which redirects through
Supabase's own OAuth proxy and returns a Supabase session
(access_token/refresh_token pair), **not** a raw Google `id_token`.

The FastAPI backend's `_verify_google` expects a genuine Google `id_token` it can send
to Google's own `tokeninfo` endpoint. That means the native app needs to obtain the
Google ID token itself — e.g. via `expo-auth-session`'s native Google auth request, or a
dedicated library like `@react-native-google-signin/google-signin` — and send that
token to `/api/v1/auth/login`, bypassing Supabase Auth entirely. Same idea for Facebook
(need a raw Facebook access token from a native Facebook login SDK).

This is tracked as a required implementation step in [TODOS.md](./TODOS.md), not
something solvable by only changing the API client.

## No refresh tokens

The backend does not issue or accept refresh tokens. A JWT is valid for
`JWT_EXPIRY_HOURS` (24h by default) and then simply stops working — there is no
`/auth/refresh` endpoint.

Client contract until the backend adds one:
- On any `401` response, clear the stored JWT and route the user back to the login
  screen (silent re-auth is not possible).
- Do not attempt to preemptively refresh — there is nothing to call.
- This is a backend gap worth raising with whoever owns `RoomGrub-backend`; note it as a
  dependency, not something to work around client-side.

## Role-based access

Roles are **not** encoded in the JWT. They live in the `UserRooms.role` column per room
and are checked server-side per request (`app/dependencies/room_access.py`:
`require_room_member`, `require_room_admin`). The native app should treat role/permission
data purely as what the relevant API responses tell it (e.g. `members.list`,
`members/{id}` detail) — never infer permissions from the JWT payload.

## Related docs

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [SECURE_COMMUNICATION.md](./SECURE_COMMUNICATION.md)
- [TODOS.md](./TODOS.md)
