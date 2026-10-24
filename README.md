# RoomGrub · Android

> The native Android app for RoomGrub — split shared expenses with your roommates.
> Built with Expo + React Native, talking directly to the [RoomGrub backend](https://github.com/Broccly/RoomGrub-backend).

## Get RoomGrub

| Platform | Link |
|---|---|
| 🤖 **Android** | [Get it on Google Play](https://play.google.com/store/apps/details?id=broccly.roomgrub.twa) |
| 🌐 **Web** | [roomgrub.broccly.in](https://roomgrub.broccly.in) |
| 🍎 **iOS** | [Install the PWA](https://roomgrub.broccly.in): open it in Safari → Share → **Add to Home Screen** |

---

## At a glance

| | |
|---|---|
| **Platform** | Android (web build available for quick UI checks) |
| **Framework** | Expo SDK 54 (dev-client / prebuild — *not* Expo Go), React Native 0.81, React 19, TypeScript |
| **Navigation** | React Navigation 7 (native stack + bottom tabs) |
| **Data** | TanStack Query v5, cache persisted to MMKV |
| **Auth** | Google Sign-In → backend access token (memory) + refresh token (`expo-secure-store`) |
| **Push** | Firebase Cloud Messaging via `@react-native-firebase/messaging` |
| **Tests** | Jest + React Native Testing Library · Maestro for e2e |
| **Package id** | `broccly.roomgrub.twa` (same Play Store listing as the earlier TWA build) |
| **Related** | [Backend](https://github.com/Broccly/RoomGrub-backend) · [Web app](https://github.com/sambhusankar/RoomGrub) |

```
 ┌──────────────────┐   HTTPS · Bearer token   ┌──────────────────────┐
 │  RoomGrub-native │ ───────────────────────► │  RoomGrub-backend    │
 │  (this repo)     │       /api/v1/*          │  FastAPI + Postgres  │
 └──────────────────┘ ◄─────── FCM push ────── └──────────────────────┘
```

There is no BFF in between — unlike the web app, this app calls the backend's REST API itself.

---

## Run it in five steps

**You'll need:** Node 20+, JDK 17, Android Studio (SDK + an emulator, or a USB-debugging device), and a running [RoomGrub backend](https://github.com/Broccly/RoomGrub-backend) — follow that repo's setup guide to start it.

**1 · Fork and clone**

```bash
git clone https://github.com/<your-username>/RoomGrub-native.git
cd RoomGrub-native
git remote add upstream https://github.com/Broccly/RoomGrub-native.git
```

**2 · Install** — `postinstall` applies the fixes in `patches/` automatically

```bash
npm install
```

**3 · Create `.env`** in the repo root

```env
# Backend root — no trailing slash, no /api/v1
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000

# Google OAuth *Web application* client ID — must match the backend's GOOGLE_CLIENT_ID
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
```

**4 · Build and launch on the emulator / device**

```bash
npm run android
```

**5 · Iterate** — after the first native build, just keep Metro running

```bash
npm start
```

Rebuild with `npm run android` only when you change native code, `app.json`, or add a package with native parts.

---

## How do I…

<details>
<summary><b>…point the app at my local backend?</b></summary>

| Where the app runs | `EXPO_PUBLIC_API_BASE_URL` |
|---|---|
| Android emulator | `http://10.0.2.2:8000` |
| Physical device (same Wi-Fi) | `http://<your-machine-ip>:8000` — start uvicorn with `--host 0.0.0.0` |
| Physical device over USB | run `adb reverse tcp:8000 tcp:8000`, then use `http://localhost:8000` |
| Web build | `http://localhost:8000` |

`EXPO_PUBLIC_*` values are inlined at bundle time — restart Metro (`npm start -- --clear`) after editing `.env`.
</details>

<details>
<summary><b>…get Google Sign-In working?</b></summary>

In the Google Cloud project the backend uses:

1. The **Web application** OAuth client goes in `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. Its id_token is what the backend verifies, so it must be the same ID as the backend's `GOOGLE_CLIENT_ID`.
2. Create an **Android** OAuth client for package `broccly.roomgrub.twa` with the SHA-1 of the keystore you build with. For local builds that's the debug keystore:
   ```bash
   cd android && ./gradlew signingReport
   ```
   Without this, sign-in fails with `DEVELOPER_ERROR`.

Full flow: [docs/AUTH.md](docs/AUTH.md) and the backend's `docs/AUTH.md`.
</details>

<details>
<summary><b>…test push notifications?</b></summary>

`google-services.json` is committed and wired in through `app.json`. The app asks for notification permission (Android 13+) after you join or create a room, then registers its FCM token with `POST /api/v1/notifications/fcm-token`. The backend only sends pushes when it has `FIREBASE_CREDENTIALS_JSON` configured — see its `docs/SETUP.md`. Code: `src/services/pushNotifications.ts`.
</details>

<details>
<summary><b>…run the tests?</b></summary>

```bash
npm test                # Jest — unit + integration (src/**/*.test.ts[x], src/__tests__/integration)
npm run test:watch
npm run test:coverage
npm run test:e2e        # Maestro flows in .maestro/ — needs Maestro CLI, a running emulator with the app installed,
                        # and a Google test account for login.yaml
```
</details>

<details>
<summary><b>…build a release bundle?</b></summary>

```bash
cd android && ./gradlew bundleRelease     # → android/app/build/outputs/bundle/release/app-release.aab
```

Release signing reads `android/keystore.properties` (not committed — ask a maintainer). Without it, Gradle falls back to the debug keystore, which the Play Store won't accept. Bump `version` / `versionCode` in `app.json` **and** `android/app/build.gradle` together.
</details>

<details>
<summary><b>…try a UI change without an emulator?</b></summary>

```bash
npm run web             # http://localhost:3001
```

Handy for layout work. Native-only features (Google Sign-In SDK, FCM, in-app updates) are stubbed or behave differently on web — always verify on Android before opening a PR.
</details>

---

## Where things live

```
App.tsx, index.ts         entry point, providers
src/
  screens/                one file per screen (+ its .test.tsx)
  navigation/             AppNavigator (stack), BottomTabNavigator, navigationRef
  services/
    httpClient.ts         fetch wrapper: base URL, bearer token, single-flight refresh, retry on 401
    api.ts, authApi.ts    typed calls to /api/v1/*
    queryClient.ts        TanStack Query + MMKV persistence
    pushNotifications.ts  FCM registration
    appUpdates.ts         Play Store in-app update prompt
  hooks/                  useAuth, useUserRole
  context/RoomContext     currently selected room
  utils/                  tokenStorage, splitCalculations, formatting, pending invites
  components/, theme/, types/
  __tests__/integration/  multi-screen flows
  test-utils/             renderWithProviders, fixtures
android/                  generated native project (committed)
patches/                  patch-package fixes for react-native & in-app-updates
.maestro/                 end-to-end flows
docs/                     ARCHITECTURE, AUTH, SECURE_COMMUNICATION, TODOS
```

## Ground rules

- **The backend is the source of truth.** Need new data or a new rule? Add the endpoint in [RoomGrub-backend](https://github.com/Broccly/RoomGrub-backend) first, then consume it here.
- **All requests go through `httpClient.ts`** — never `fetch` the backend directly, or you'll bypass token refresh.
- **Tokens:** refresh token only in secure storage, access token only in memory. Never log either.
- **Roles:** admins add expenses and manage members, members are read-only. Gate UI with `useUserRole()` — the backend enforces it regardless.
- Keep PRs focused, add or update tests next to the code you touch, and run `npm test` before pushing.

## Gotchas

- 🔁 **Changed `.env` but nothing happened?** Restart Metro with `--clear`.
- 🧱 **Build fails after `git pull`?** Run `npm install` (re-applies `patches/`), then `npm run android` again.
- 🔑 **`DEVELOPER_ERROR` on sign-in** → the Android OAuth client is missing your keystore's SHA-1.
- 🌐 **Network request failed on a device** → `localhost` means the phone itself; use `10.0.2.2`, your LAN IP, or `adb reverse`.
- 📦 **Expo Go won't work** — this app has custom native modules; always use `npm run android`.

---

<sub>Part of the RoomGrub family · Web: [sambhusankar/RoomGrub](https://github.com/sambhusankar/RoomGrub) · API: [Broccly/RoomGrub-backend](https://github.com/Broccly/RoomGrub-backend)</sub>
