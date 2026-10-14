# RoomGrub Native — Authentication

## Reality check

`RoomGrub-backend/docs/AUTH.md` describes verifying Supabase-issued JWTs. **That is not
what the backend code does.** The backend has its own independent auth system:

- `app/utils/auth_providers.py` verifies a Google `id_token` via
  `https://oauth2.googleapis.com/tokeninfo`, or a Facebook access token via the Graph
  API `/me` endpoint — directly, server-side, not through Supabase.
- `app/utils/jwt_utils.py::create_jwt()` mints its own HS256 access JWT (`sub`, `email`,
  `exp`), signed with the backend's own `JWT_SECRET` env var. It is short-lived
  (`JWT_ACCESS_EXPIRY_MINUTES`, default 15).
- Alongside it the backend issues an opaque, rotating **refresh token**
  (`REFRESH_TOKEN_EXPIRY_DAYS`, default 90, sliding) whose only job is to get a new
  access token.
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
   │     upserts the user, mints its own tokens
   ▼
Response: { "access_token": "<jwt>", "token_type": "bearer", "expires_in": 900,
            "refresh_token": "<opaque>", "user": {...} }
   │
   │  3. refresh_token → expo-secure-store (never AsyncStorage)
   │     access_token  → memory only (httpClient.ts), never persisted
   ▼
Every subsequent API call:
   Authorization: Bearer <access_token>

        ...access token missing (cold start), about to expire, or rejected with 401...

POST /api/v1/auth/refresh
   body: { "refresh_token": "<opaque>" }
   ▼
Response: { "access_token", "token_type", "expires_in", "refresh_token" }
   │
   │  4. Replace both tokens (the refresh token that was sent is now spent)
   ▼
Retry the original request once
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

## Refresh tokens

All of this lives in `src/services/httpClient.ts`; screens and `api.ts` never see a token.

- **Storage.** The refresh token is the only credential on disk (`expo-secure-store`,
  key `roomgrub_refresh_token`). The access token is held in a module variable and is
  gone when the app process dies; the first request after a cold start refreshes.
- **When it refreshes.** Before a request if the access token is missing or within 30
  seconds of `expires_in`; and after a `401`, followed by one retry of that request.
- **Single flight.** The backend rotates the refresh token on every call, so all
  concurrent requests share one in-flight refresh. Never call `/auth/refresh` from
  anywhere else.
- **End of session.** A `401` from `/auth/refresh`, an initial authenticated `401`
  with no token available, or a `401` on the retry signs the user out: both tokens
  and the stored user are cleared; the handler registered by `useAuth` routes to
  Login. A network error or 5xx during refresh fails the request but keeps the
  session.
- **Logout.** `useAuth.logout()` unregisters the FCM token, then calls
  `POST /auth/logout` with the refresh token (best-effort, not awaited) and clears the
  session locally. Only this device is signed out.
- **Requests with `auth: false`** (`/auth/login`, `/auth/logout`) never trigger a refresh
  and a `401` from them is an ordinary error, not a sign-out.

Known limits:
- A refresh token is single-use. If the app is killed between receiving a refresh
  response and writing the new token, or a response is lost and the retry comes more
  than 30 seconds later, the backend sees a replay, revokes the session, and the user
  signs in again.
- Builds up to 1.0.6 stored a 24h access JWT under `roomgrub_jwt` and have no refresh
  token. After updating they are treated as signed out and sign in once; the old key is
  deleted on first launch.

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
