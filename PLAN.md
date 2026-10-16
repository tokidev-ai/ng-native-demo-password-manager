# Plan: Angular Native Password Manager (ng-native + Tailwind + Firebase)

Demo app for NG Bolivia. It's built with **Angular Native** (https://ng-native.com), styled with **Tailwind v4**, and backed by **Firebase** (project `ng-native-psw-mng`).

---

## 1. What Angular Native is (research summary)

- Angular templates, signals and DI render as **real native views** (UIView / android.view.View) through **Expo + React Native Fabric**, not a WebView. It's MIT-licensed and **in Alpha**.
- **Scaffold:** `npx create-expo-app@latest <app> --template @ng-native/template`, then `npx expo start` (Expo Go) or `npx expo run:ios|android` (dev build).
- **Elements** (`@ng-native/components`). Tags are lowercase and each one must be imported in the component's `imports`:
  `<view> <text> <pressable> <text-input> <scroll-view> <image> <switch> <activity-indicator> <modal> <virtual-list> <safe-area-provider> <safe-area-view>`
- **Events:** `(press)` on `<pressable>`. **Forms:** Signal Forms (`form()`, `[formField]`, `FormField` import). `<text-input>` binds `value`, and `ControlValueAccessor` is **not** supported.
- **Router** (`@ng-native/router` + `@angular/router` + `react-native-screens`):
  `provideNativeRouter(routes, withComponentInputBinding())`, `<native-stack-outlet />`, `<native-tabs-outlet>`, `<native-header>`, `[nativeRouterLink]`, `NativeNavigation` (modals/sheets/reset stack). Standard guards work.
- **Tailwind v4:** `@ng-native/tailwind`, `withTailwind(withAngularNative(...))` in `metro.config.js`, and `src/styles.css` imports `tailwindcss/theme.css`, `tailwindcss/utilities.css` and `@ng-native/tailwind/native.css` (no preflight). `main.ts` passes the generated `.angular-native/app.tailwind.js` as `globalStyles`. Extra variants: `ios:`, `android:`, `dark:`, `press:`.
- **Device/Expo services:** `@ng-native/device` (Dialogs for confirm/alert/toast, Keyboard, ColorScheme), `@ng-native/expo/clipboard`, `/haptics`, `/crypto`, `/biometrics`.
- **Testing:** `@ng-native/testing` (Vitest, no simulator) and Maestro for end-to-end tests.

> Docs gaps to verify against `node_modules` after scaffolding: exact `<text-input>` props (`secureTextEntry`, `placeholder`, `autoCapitalize`), the service class names in `@ng-native/expo/*`, and the `Dialogs` API.

---

## 2. Features

| Area | Scope |
|---|---|
| **Auth** | Email/password sign up, sign in, sign out, password reset email. The session persists across restarts. Route guards split public and private screens. |
| **Vaults CRUD** | List my vaults, create (name, optional icon/color), rename/edit, delete (with confirmation, cascades to its passwords). |
| **Passwords CRUD** | Inside a vault: list entries (title + website), create/edit (`title`, `website` URL, `username`, `password`, optional `notes`), view details (reveal/hide, copy to clipboard), delete with confirmation. Search/filter by title or website. |
| **Extras (nice-to-have)** | Password generator (expo crypto random bytes), haptics on copy, biometric unlock on app resume. |

---

## 3. Firebase design (`ng-native-psw-mng`)

**SDK:** Firebase JS SDK (`firebase` npm package). It runs in Expo/React Native without native modules, so Expo Go keeps working.
- Auth: `initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })` with `@react-native-async-storage/async-storage`.
- Firestore: `initializeFirestore(app, { experimentalForceLongPolling: true })` for reliability on React Native.
- Config goes in `src/environments/firebase.config.ts`, read from `EXPO_PUBLIC_FIREBASE_*` env vars in a git-ignored `.env`, with a `.env.example` committed.

**Data model**
```
users/{uid}/vaults/{vaultId}
  name: string, color?: string, createdAt, updatedAt, itemCount?: number
users/{uid}/vaults/{vaultId}/passwords/{passwordId}
  title: string, website: string, username: string,
  password: <ciphertext>, notes?: <ciphertext>, createdAt, updatedAt
```

**Security rules (`firestore.rules`)**
```
match /users/{uid}/{document=**} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```

**Secret encryption (decided: client-side AES-GCM):** `password` and `notes` are encrypted on the device with AES-256-GCM (random 96-bit IV per value, stored as `iv:ciphertext` base64) before they reach Firestore. The key is derived from the user's login password with PBKDF2-SHA256 and a per-user random salt stored at `users/{uid}`, and is held in memory only. After a cold start with a persisted session, the app asks for the password again to unlock (biometric unlock is a later nice-to-have). A password reset makes old entries unreadable, and the reset screen warns about this. Implementation: `@noble/ciphers` + `@noble/hashes` (pure JS, audited, work in Hermes with no WebCrypto), with random bytes from `@ng-native/expo/crypto`.

---

## 4. App structure

```
src/
  main.ts                    # mount(), provideNativeRouter, tailwind globalStyles
  styles.css                 # tailwind v4 imports + theme tokens
  app/
    app.ts                   # <safe-area-provider><native-stack-outlet/>
    app.routes.ts
    core/
      firebase.ts            # initializeApp / auth / firestore singletons
      auth.service.ts        # user signal (onAuthStateChanged), signIn/up/out/reset
      auth.guard.ts          # authGuard + guestGuard (CanActivateFn)
      crypto.service.ts      # deriveKey / encrypt / decrypt
      vault.service.ts       # vaults$ signal (onSnapshot), create/update/delete
      password.service.ts    # passwords by vault (onSnapshot), CRUD
      models.ts              # Vault, PasswordEntry types
    shared/ui/               # app-button, app-input, app-card, empty-state, loading
    features/
      auth/  login.page.ts, register.page.ts, forgot-password.page.ts
      vaults/ vault-list.page.ts, vault-form.page.ts (modal/sheet)
      passwords/ password-list.page.ts, password-form.page.ts, password-detail.page.ts
      settings/ settings.page.ts (account, sign out)
```

**Routes**
```
/login, /register, /forgot           canActivate: guestGuard
/vaults                              canActivate: authGuard   (home)
/vaults/new, /vaults/:vaultId/edit   (presented as sheet)
/vaults/:vaultId                     password list
/vaults/:vaultId/passwords/new
/vaults/:vaultId/passwords/:id       detail
/vaults/:vaultId/passwords/:id/edit
/settings
```
An auth-state effect in `App` resets the stack to `/vaults` or `/login` (`NativeNavigation`) when the user signs in or out.

**State:** Angular signals throughout. Services wrap Firestore `onSnapshot` in signals (`toSignal` or manual `signal` + unsubscribe on `DestroyRef`).

---

## 5. Styling (Tailwind)

- Dark-first "vault" theme: slate background, indigo/emerald accents, with `dark:` variants via ColorScheme.
- Reusable class recipes in shared UI components (button variants primary/secondary/danger, inputs with `data-invalid` error styling, cards).
- Platform tweaks with `ios:` and `android:` (shadows vs elevation).

---

## 6. Implementation steps

1. ✅ **Scaffold:** `@ng-native/template` (ng-native 0.14.0, Angular 22, Expo 57, RN 0.86) moved to the repo root and renamed "NG Vault". `npm test`, `npm run typecheck` and `expo export --platform ios` all pass. The template ships `AGENTS.md`, which holds the framework rules (follow it). Angular 22 wants Node ≥ 22.22.3, and the local Node is 22.22.0 (warning only).
2. **Tailwind v4:** install `@ng-native/tailwind tailwindcss @tailwindcss/cli`, wire up `metro.config.js`, `styles.css` and `main.ts`, and add `.angular-native/` to `.gitignore`. Smoke test a styled view.
3. **Router:** install `@ng-native/router @angular/router` and `npx expo install react-native-screens`. Set up the shell with `<native-stack-outlet>` and placeholder pages.
4. **Firebase:** `npm i firebase @react-native-async-storage/async-storage`. Add `core/firebase.ts` and the env config. Enable Email/Password auth and Firestore in the console for `ng-native-psw-mng`. Deploy `firestore.rules` (`firebase init firestore` and `firebase deploy --only firestore:rules`).
5. **Auth:** AuthService, guards, and the login, register and forgot-password pages (Signal Forms + validation), plus sign out in settings.
6. **Vaults CRUD:** VaultService, list page (`<virtual-list>`, empty state, swipe or long-press actions), create/edit sheet, delete confirm (Dialogs) with a batched cascade delete of passwords.
7. **Passwords CRUD:** CryptoService, PasswordService, list with search, form (web, username, password with show/hide and a generator), detail (copy via Clipboard + haptics), delete confirm.
8. **Polish:** loading and error states, keyboard avoidance, dark mode, app icon and name.
9. **Tests:** Vitest component tests with `@ng-native/testing` for the forms and services (Firebase mocked). Optionally add a Maestro flow: login → create vault → add password.
10. **Docs:** README with setup (env vars, Firebase setup, run commands).

---

## 7. Risks / open questions

- **Alpha framework:** APIs may differ from the docs. Each step starts by checking the installed package typings.
- **Firebase JS SDK on React Native:** needs the AsyncStorage persistence import (`firebase/auth` RN build) and may need Metro `resolver.unstable_conditionNames` tweaks. Fallback: `@react-native-firebase/*`, which requires a dev build (no Expo Go).
- **Firebase config:** do you already have the web app config for `ng-native-psw-mng`, or should it be created via the Firebase CLI?
