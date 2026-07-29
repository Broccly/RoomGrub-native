# RoomGrub Native — Architecture

## Target state

RoomGrub-native is migrating off Supabase (Auth + Edge Function) onto the standalone
`RoomGrub-backend` FastAPI service as its only backend.

```
┌─────────────────────────────┐
│  RoomGrub Native            │
│  (Expo / React Native)      │
│  iOS · Android · Web        │
└──────────────┬───────────────┘
               │  HTTPS / JSON
               │  Authorization: Bearer <jwt>
               ▼
┌─────────────────────────────┐
│  RoomGrub-backend           │
│  FastAPI, /api/v1/*         │
│                             │
│  Routers → Services → raw   │
│  parameterized SQL          │
└──────────────┬───────────────┘
               │
               ▼
┌─────────────────────────────┐
│  PostgreSQL (Supabase-hosted)│
│  accessed only by backend    │
└─────────────────────────────┘
```

Supabase is **not** in the picture from the native app's point of view once migration
is done — it's purely the database the FastAPI backend happens to be pointed at. The
app never talks to Supabase directly again.

## What's changing and why

Today, `src/utils/supabase.ts` creates a `@supabase/supabase-js` client used for both:
1. Auth — Google OAuth via Supabase Auth (`src/screens/LoginScreen.tsx`,
   `src/hooks/useAuth.ts`).
2. Data — every backend call goes through one Supabase Edge Function via
   `supabase.functions.invoke('roomgrub_api', ...)` (`src/services/api.ts`).

`RoomGrub-backend` was built to replace both of these, but it does **not** verify
Supabase JWTs — despite what that repo's own `docs/AUTH.md`/`docs/ARCHITECTURE.md` say.
The backend's actual code (`app/utils/jwt_utils.py`, `app/dependencies/current_user.py`,
`app/utils/auth_providers.py`) implements a fully independent auth system: it verifies a
Google/Facebook provider token directly against Google/Facebook's own endpoints, then
mints its own HS256 JWT. See [AUTH.md](./AUTH.md) for the corrected flow.

Once migrated:
- `@supabase/supabase-js` and the `supabase/` directory (edge functions, local Supabase
  CLI config) become unused and can be removed (tracked in [TODOS.md](./TODOS.md)).
- All data calls move from `supabase.functions.invoke(...)` to plain HTTPS requests
  against `RoomGrub-backend`'s `/api/v1/*` routes.

## Backend API surface (as actually implemented, not as documented in that repo)

All routes are prefixed `/api/v1`.

| Domain | Method | Path | Notes |
|---|---|---|---|
| Auth | POST | `/auth/login` | body `{provider, token}` → `{access_token, token_type, user}`. **Not** `/auth/sync-user` as that repo's stale docs claim. |
| Rooms | GET | `/rooms` | list rooms for current user |
| Rooms | POST | `/rooms` | create room |
| Rooms | GET | `/rooms/{room_id}` | home summary |
| Rooms | GET | `/rooms/{room_id}/dashboard` | member stats dashboard |
| Rooms | DELETE | `/rooms/{room_id}` | delete room (Admin, all settled) |
| Expenses | GET | `/rooms/{room_id}/expenses` | paginated, cursor-based |
| Expenses | POST | `/rooms/{room_id}/expenses` | add expense for self |
| Expenses | PATCH | `/rooms/{room_id}/expenses/{expense_id}` | update |
| Expenses | DELETE | `/rooms/{room_id}/expenses/{expense_id}` | delete |
| Expenses | POST | `/rooms/{room_id}/expenses/for-member` | add for another member (Admin) |
| Splits | GET | `/rooms/{room_id}/splits` | unsettled expenses + balances |
| Splits | POST | `/rooms/{room_id}/splits/settle` | settle one member (Admin) |
| Splits | POST | `/rooms/{room_id}/splits/settle-all` | settle all (Admin) |
| Members | GET | `/rooms/{room_id}/members` | list |
| Members | GET | `/rooms/{room_id}/members/{member_id}` | detail + history |
| Members | PATCH | `/rooms/{room_id}/members/{member_id}/role` | update role (Admin) |
| Members | DELETE | `/rooms/{room_id}/members/{member_id}` | remove (Admin) |
| Members | DELETE | `/rooms/{room_id}/members/me` | exit room (non-admin) |
| Members | POST | `/rooms/{room_id}/members/{member_id}/settle` | legacy lump-sum settle |
| Members | POST | `/rooms/{room_id}/members/{member_id}/contribute` | record contribution |
| Invites | POST | `/rooms/{room_id}/invites` | create invite link (Admin) |
| Invites | GET | `/invites/{token}` | validate token |
| Invites | POST | `/invites/{token}/accept` | join room |
| Invites | POST | `/invites/{token}/reject` | reject invite |
| Notifications | POST | `/notifications` | create + push |
| Notifications | GET | `/rooms/{room_id}/notifications` | list |
| Notifications | POST/DELETE | `/rooms/{room_id}/push-subscriptions` | register/unregister push |

There is no direct FastAPI equivalent of the edge function's `/v1/bootstrap` endpoint
today — the native client will need to compose it from `GET /rooms` + per-room summary
calls, or the backend needs a new endpoint. Tracked in [TODOS.md](./TODOS.md).

## Backend tech stack (informational, not something the native app touches directly)

- FastAPI + Pydantic v2, sync SQLAlchemy used only for connection pooling — all queries
  are raw parameterized SQL (no ORM models).
- Postgres (Supabase-hosted in production, local Postgres in dev).
- No Docker/CI config present; run via `uvicorn main:app`.

## Related docs

- [AUTH.md](./AUTH.md) — real auth flow and token handling.
- [SECURE_COMMUNICATION.md](./SECURE_COMMUNICATION.md) — transport/storage security.
- [TODOS.md](./TODOS.md) — migration checklist.
