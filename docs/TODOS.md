# RoomGrub Native — Migration TODO Checklist

Migrating off Supabase Auth + the `roomgrub_api` Supabase Edge Function, onto
`RoomGrub-backend` (FastAPI) directly. See [ARCHITECTURE.md](./ARCHITECTURE.md),
[AUTH.md](./AUTH.md), [SECURE_COMMUNICATION.md](./SECURE_COMMUNICATION.md) for the
reasoning behind each item.

## Auth — done
- [x] Native Google sign-in yielding a raw Google `id_token`, via
      `expo-auth-session/providers/google` (`src/screens/LoginScreen.tsx`) — no new
      native module/rebuild needed. Reads client ID from
      `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (still a placeholder — needs a real value from
      Google Cloud Console before login works end-to-end).
- [ ] Facebook sign-in — out of scope for this pass, left as a follow-up.
- [x] `expo-secure-store` dependency added.
- [x] `src/hooks/useAuth.ts` rewritten: reads/writes JWT + user via
      `src/utils/tokenStorage.ts`, exposes `login(provider, token)` / `logout()`.
- [x] `src/screens/LoginScreen.tsx` and `src/screens/AuthCallbackScreen.tsx` updated to
      the new flow; Supabase OAuth redirect handling removed.
- [x] Centralized `401` handling in `src/services/httpClient.ts`: clears the stored JWT
      and calls a registered callback that `useAuth` uses to flip `isAuthenticated` to
      false. Still no refresh-token flow (backend gap, unchanged).

## API client — done for rooms/members/expenses/splits/invites
- [x] `EXPO_PUBLIC_API_BASE_URL` + `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` added to root
      `.env.example`.
- [x] `src/services/httpClient.ts` — fetch wrapper with base URL, bearer auth, 15s
      timeout, typed errors, 401 handling.
- [x] `src/services/api.ts` remapped to real FastAPI routes for rooms, members,
      expenses, splits (`getSplits`/`settleOne`/`settleAll`), and invites
      (`createInvite`/`validateInvite`/`acceptInvite`/`rejectInvite`).
- [x] `getMyMembership(email)` added: composes `GET /rooms` + `GET /rooms/{id}/members`
      client-side since the backend's `RoomResponse` doesn't carry the caller's role
      (no `bootstrap`-equivalent endpoint exists). Used by `AuthCallbackScreen` and
      `useUserRole`.
- [x] `src/types/api.ts` rewritten to match the backend's actual Pydantic schemas
      (confirmed by reading `RoomGrub-backend/app/api/*/schemas.py` directly — these
      differ substantially from the old edge-function shapes).

## Known gaps — need product decisions, not yet touched
These screens depend on backend features/shapes that don't exist or differ
fundamentally from what they currently expect. Fixing them requires deciding actual
product behavior, not just remapping fields — flagged rather than guessed at:

- [ ] **Payments ledger has no backend equivalent.** `PaymentsScreen`,
      `RecordPaymentScreen`, `BalanceScreen`, and `AdminScreen` all call
      `api.listPayments` / `api.createPayment`, which don't exist — the backend only has
      `members/{id}/contribute` (record a contribution, admin-only, no listing) and
      `members/{id}/settle` (lump-sum settle, no body). Either the backend needs a real
      payments/ledger endpoint, or these four screens need to be redesigned around
      contribute/settle actions instead of a payment history list.
- [ ] **Splits model differs.** The old edge function computed equal-share balances
      with a `credit`/`debit`/`even` status per member. The backend's
      `GET /rooms/{room_id}/splits` only returns each member's raw `pending_amount` plus
      the list of unsettled expenses — no computed equal share or status. `HomeScreen`
      and `SplitsScreen` need their balance-display logic redesigned around this
      simpler shape (or the backend needs to compute the equal-share view itself).
- [ ] **Room summary shape differs.** `HomeScreen` reads `total_expenses` /
      `pending_settlements_count` from the old `RoomSummary`; the backend's version has
      `total_spent` (renamed) and no settlements count, plus a `recent_expenses` list
      the UI doesn't use yet.
- [ ] **`useAuth().session` no longer exists** — `HomeScreen`'s greeting reads
      `session.user.user_metadata.full_name`; switch to `useAuth().user.name`.
- [ ] **Invite flow changed shape.** `InviteMemberScreen` invites by typing an email
      directly; the backend only supports admin-generated invite links
      (`POST /rooms/{room_id}/invites` takes no email, returns a `token` to share) that
      the invitee then accepts via `POST /invites/{token}/accept`. The screen needs a
      "generate and share link" UI instead of an email input.

## Config / cleanup (do after the gaps above are resolved and everything is verified)
- [ ] Remove hardcoded Supabase URL/anon key from `src/utils/supabase.ts` — file is
      currently unused by the working auth/data path but left in place until the gaps
      above are closed.
- [ ] Remove `@supabase/supabase-js`, `react-native-url-polyfill`, the
      `supabase:start`/`supabase:stop`/`supabase:serve` scripts in `package.json`, and
      the `supabase/` directory.

## Backend dependencies (not native-app work, but blocks native-app work)
- [ ] Request a refresh-token mechanism from `RoomGrub-backend` — currently a JWT just
      expires after `JWT_EXPIRY_HOURS` with no renewal path.
- [ ] Decide whether the backend should own the payments-ledger / equal-share-splits
      computation (recommended, keeps business logic server-side) or whether the
      native app should compose it client-side from existing endpoints.
- [ ] Confirm HTTPS termination and hosting setup for `RoomGrub-backend` in production
      before shipping (no HTTPS enforcement found in the backend code itself).
