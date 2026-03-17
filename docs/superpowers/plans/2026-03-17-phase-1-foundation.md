# Phase 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Walo Ionic React + Capacitor project with TailwindCSS design tokens, SQLite migration runner, navigation shell, first-launch gate, and dark mode — everything needed before a single feature screen is built.

**Architecture:** Ionic React app using Vite, with TailwindCSS extending CSS custom property design tokens defined in a single global stylesheet. SQLite is initialised at app startup via a versioned migration runner. A Zustand theme store reads persisted preferences before the first render to avoid a dark-mode flash.

**Tech Stack:** Ionic 8, React 18, Capacitor 6, TailwindCSS 3, @capacitor-community/sqlite, Zustand, @tanstack/react-query, Vitest, @testing-library/react.

**Spec reference:** `docs/superpowers/specs/2026-03-17-walo-design.md`

---

## Chunk 1: Project Scaffold and Dependencies

### File Map

- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `index.html`
- Create: `ionic.config.json`
- Create: `capacitor.config.ts`
- Create: `.gitignore`
- Create: `src/main.tsx`
- Create: `src/vite-env.d.ts`

### Task 1: Scaffold the Ionic React Vite project

- [ ] Run `npm create ionic@latest` inside `d:/development projects/walo`, choosing the React blank starter with Capacitor integration. When prompted for the project name use `walo` and confirm the existing directory. If the CLI refuses the existing directory, scaffold to a temp subfolder and move all generated files to the root.
- [ ] Verify `package.json` exists at the root with `@ionic/react`, `react`, `react-dom`, and a `vite` devDependency.
- [ ] Verify `capacitor.config.ts` exists with `appId` set to `app.walo` and `appName` to `Walo`.
- [ ] Verify `ionic.config.json` exists.
- [ ] Commit: `git add -A && git commit -m "chore: scaffold Ionic React Vite project"`

### Task 2: Install all project dependencies

- [ ] Install production dependencies with explicit version pins: `npm install @capacitor-community/sqlite@^6 @capacitor/share@^6 zustand @tanstack/react-query@^5 recharts uuid`. The `@capacitor-community/sqlite` major version must match the Capacitor major version scaffolded in Task 1 — verify this after scaffolding and adjust the pin if needed. `@tanstack/react-query@^5` is pinned because v5 has breaking API differences from v4.
- [ ] Install dev dependencies: `npm install -D tailwindcss@^3 postcss autoprefixer vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom`. TailwindCSS is pinned to v3 because Tasks 3 and 4 use v3 configuration semantics (`tailwind.config.js` with `theme.extend`). Ionic scaffolds may pull v4 by default — this pin overrides that.
- [ ] Run `npx tailwindcss init -p` to generate `tailwind.config.js` and `postcss.config.js`.
- [ ] Verify `node_modules` exists and `npm run build` passes without errors.
- [ ] Commit: `git commit -m "chore: install project dependencies"`

---

## Chunk 2: TailwindCSS and Design Tokens

### File Map

- Create: `src/theme/global.css`
- Modify: `tailwind.config.js`
- Modify: `src/main.tsx` (import global.css)
- Modify: `vite.config.ts` (ensure CSS processing)

### Task 3: Write the global CSS design token file

- [ ] Create `src/theme/global.css`. Define all `:root` CSS custom properties from the spec exactly: the full set of `--color-primary-*` brand greens, `--color-bg`, `--color-surface`, `--color-surface-raised`, `--color-border`, `--color-border-strong`, all four text tokens, semantic tokens (`--color-income`, `--color-expense`, `--color-warning`, `--color-neutral`), radius tokens (`--radius-sm`, `--radius-card`, `--radius-pill`), and shadow tokens. Then add the `[data-theme="dark"]` block with the full dark-mode overrides as specified in the design doc. Add `@tailwind base; @tailwind components; @tailwind utilities;` directives at the top.
- [ ] Override Ionic's default CSS variables in the same file to alias them to our tokens (e.g. `--ion-color-primary` maps to `--color-primary-600`, `--ion-background-color` maps to `--color-bg`, `--ion-text-color` maps to `--color-text-primary`). This ensures Ionic components respect our theme.
- [ ] Import `./theme/global.css` in `src/main.tsx`, replacing any default Ionic CSS imports that conflict.

### Task 4: Configure TailwindCSS to extend design tokens

- [ ] Open `tailwind.config.js`. Set `content` to scan `./src/**/*.{ts,tsx}`. In the `theme.extend` block, add `colors` entries that map Tailwind color names (e.g. `primary`, `surface`, `income`, `expense`) to the corresponding CSS custom properties using `var(--color-*)` syntax. Add `borderRadius` extensions for `card` and `pill`. Add `boxShadow` extensions for `card` and `modal`.
- [ ] Run `npm run build` and verify it completes without CSS errors.
- [ ] Commit: `git commit -m "feat: add design token system with TailwindCSS integration"`

---

## Chunk 3: Vitest Configuration

### File Map

- Modify: `vite.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/test/mocks/sqlite.ts`

### Task 5: Configure Vitest

- [ ] In `vite.config.ts`, add a `test` block to the Vite config. Set `globals: true`, `environment: 'jsdom'`, `setupFiles: ['src/test/setup.ts']`, and `coverage.provider: 'v8'`.
- [ ] Create `src/test/setup.ts`. Import `@testing-library/jest-dom` for the custom matchers. This file runs before every test.
- [ ] Create `src/test/mocks/sqlite.ts`. Use `vi.mock('@capacitor-community/sqlite', ...)` to replace the entire Capacitor native bridge at the module level. The mock must stub the full connection API surface used by the app: `createConnection`, `open`, `execute`, `query`, `run`, `close`, and `isConnection`. Each returns a resolved promise with a sensible default (e.g. `query` returns `{ values: [] }`). Mocking at the module level prevents Capacitor's plugin registration from trying to call native code in the jsdom environment, which would otherwise throw "Not implemented."
- [ ] Run `npm run test -- --run` (or the equivalent Vitest command) and verify it exits with zero failures (no tests yet, zero tests is a pass).
- [ ] Commit: `git commit -m "chore: configure Vitest with jsdom and SQLite mock"`

---

## Chunk 4: SQLite Migration Runner

### File Map

- Create: `src/db/migrations/v1_initial.ts`
- Create: `src/db/migrations/index.ts`
- Create: `src/db/queries/preferences.ts`
- Create: `src/db/queries/preferences.test.ts`
- Create: `src/db/migrations/index.test.ts`
- Create: `src/types/index.ts`

### Task 6: Define types and shared constants

- [ ] Create `src/types/index.ts`. Export TypeScript interfaces for all six data models as described in the spec: `Account`, `Category`, `Transaction`, `RecurringRule`, `Budget`, and `Preference`. All IDs are `string`. Dates are `string` (ISO 8601). Amount is `number`. Use string literal union types for enum-like fields (e.g. `type AccountType = 'cash' | 'bank' | 'digital_wallet' | 'other'`).
- [ ] Create `src/constants.ts`. Export `THEME_STORAGE_KEY = 'walo_theme'`. This key is used by both the theme store (Task 13, writes to localStorage) and main.tsx (Task 17, reads from localStorage synchronously). Both must import from this file — never hardcode the string in two places.

### Task 7: Write failing migration runner tests

- [ ] Create `src/db/migrations/index.test.ts`. Import the SQLite mock from `src/test/mocks/sqlite.ts`. Write tests covering the runner's orchestration logic only (not SQL content): (a) when `schema_version` is present with value `'1'` and only a v1 migration exists, no migration is run; (b) when the preferences table is absent (query throws), the runner catches the error, treats current version as `0`, and runs all registered migrations; (c) after running, the runner updates `schema_version` to the highest applied version; (d) if a migration's `up` function throws, the runner issues a ROLLBACK on the db, then rethrows so the call site can show the fatal error screen.
- [ ] Run the tests and confirm they fail because the migration runner module does not exist yet.

### Task 8: Implement the migration runner

- [ ] Create `src/db/migrations/index.ts`. Export a `runMigrations(db)` async function. It attempts to read `schema_version` from `preferences`; on any SQL error it treats the current version as `0` (handles fresh install where the table does not exist). It then iterates the registered migration array in ascending version order, and for each migration whose version is greater than current: begins a transaction with `BEGIN`, calls `up(db)`, commits with `COMMIT`. On any error during `up`, issues an explicit `ROLLBACK` before rethrowing — this must be synchronous within the catch block to avoid leaving an open transaction. After all migrations complete, updates `schema_version`. Note: the "fatal error screen" is the responsibility of the call site (`initDb`), not the runner.
- [ ] Run the migration runner tests and confirm they now pass.

### Task 9: Implement the v1 migration

- [ ] Create `src/db/migrations/v1_initial.ts`. Export a migration object with `version: 1` and an `up(db)` async function. The `up` function executes the full DDL from the spec in order: create `accounts`, `categories`, `transactions`, `recurring_rules`, `budgets`, `preferences` tables. Then insert all 16 predefined categories (10 expense + 6 income) as seeded rows with static UUIDs. Finally insert `schema_version = '1'` into preferences. Register this migration in `src/db/migrations/index.ts`'s migration array.
- [ ] Commit: `git commit -m "feat: implement SQLite migration runner with v1 schema"`

### Task 10: Write failing preferences query tests

- [ ] Create `src/db/queries/preferences.test.ts`. Mock the SQLite plugin. Write tests that verify: `getPreference(db, key)` returns the stored string value or `null` if absent, and `setPreference(db, key, value)` executes an INSERT OR REPLACE statement with the correct key/value/updated_at.

### Task 11: Implement preferences queries

- [ ] Create `src/db/queries/preferences.ts`. Export `getPreference(db, key): Promise<string | null>` and `setPreference(db, key, value): Promise<void>`. Use the `preferences` table DDL from the spec.
- [ ] Run the preferences tests and confirm they pass.
- [ ] Commit: `git commit -m "feat: add preferences query functions"`

---

## Chunk 5: Zustand Theme Store and usePremium Stub

### File Map

- Create: `src/stores/useThemeStore.ts`
- Create: `src/stores/useThemeStore.test.ts`
- Create: `src/hooks/usePremium.ts`
- Create: `src/hooks/usePremium.test.ts`
- Create: `src/hooks/usePreferences.ts`

### Task 12: Write failing theme store tests

- [ ] Create `src/stores/useThemeStore.test.ts`. Tests to write: (a) initial state has `theme: 'system'`, (b) `setTheme('dark')` updates theme to `'dark'` in the store, (c) `setTheme('light')` updates to `'light'`, (d) `resolveTheme()` returns `'dark'` when theme is `'dark'`, `'light'` when `'light'`, and the system preference value when `'system'` (mock `window.matchMedia`).
- [ ] Run and confirm failure.

### Task 13: Implement the theme store

- [ ] Create `src/stores/useThemeStore.ts`. Use Zustand's `create`. State: `theme` (`'light' | 'dark' | 'system'`, default `'system'`). Actions: `setTheme(theme)` sets the value. `resolveTheme()` is a selector (not an action) that returns the effective theme by checking `window.matchMedia('(prefers-color-scheme: dark)')` when `theme === 'system'`.
- [ ] Run theme store tests and confirm they pass.

### Task 14: Write failing usePremium test

- [ ] Create `src/hooks/usePremium.test.ts`. Write one test: calling `usePremium()` returns `false`.
- [ ] Run the test and confirm it fails because the module does not exist.

### Task 14b: Implement usePremium stub

- [ ] Create `src/hooks/usePremium.ts`. Export a `usePremium()` hook that simply returns `false`. Add a comment: `TODO: Phase 5 — replace with Google Play Billing subscription check`.
- [ ] Run the test and confirm it passes.

- [ ] Commit: `git commit -m "feat: add theme store and usePremium stub"`

---

## Chunk 6: App Entry Point, Dark Mode, and Navigation Shell

### File Map

- Create: `src/db/client.ts`
- Create: `src/App.tsx`
- Modify: `src/main.tsx`
- Create: `src/pages/dashboard/DashboardPage.tsx`
- Create: `src/pages/transactions/TransactionsPage.tsx`
- Create: `src/pages/analytics/AnalyticsPage.tsx`
- Create: `src/pages/settings/SettingsPage.tsx`
- Create: `src/pages/onboarding/OnboardingPage.tsx`

### Task 16: Implement the SQLite client and DB context

- [ ] Create `src/db/client.ts`. Export an `initDb()` async function that opens the SQLite connection using `@capacitor-community/sqlite` and runs `runMigrations`. If `runMigrations` throws, surface a fatal error (set an error flag; the calling component renders a full-screen "Unable to initialise database — please reinstall the app" message). Export a React context `DbContext` and a `DbProvider` component that calls `initDb()` on mount and provides the `db` instance to children via context. While initialising, render a full-screen spinner. On fatal error, render the fatal message.

### Task 16a: Write failing usePreferences hook tests

- [ ] Create `src/hooks/usePreferences.test.ts`. Wrap the test component in a `DbProvider` using the SQLite mock. Write tests: (a) `usePreference('theme', 'system')` returns `'system'` when the DB returns null, (b) returns the stored value when the DB returns `'dark'`, (c) `useSetPreference()` mutation calls `setPreference` with the correct key and value.
- [ ] Run and confirm they fail because the hook does not exist yet.

### Task 16b: Implement usePreferences hooks

- [ ] Create `src/hooks/usePreferences.ts`. Export `usePreference(key, defaultValue)` using `useQuery` from `@tanstack/react-query` (v5 object-syntax: `{ queryKey: [...], queryFn: ... }`). Read `db` from `DbContext`. Call `getPreference(db, key)`, return the value or `defaultValue` if null. Export `useSetPreference()` returning a `useMutation` wrapping `setPreference`, which also writes the new value to `localStorage.setItem(THEME_STORAGE_KEY, value)` when the key is `THEME_STORAGE_KEY` (imported from `src/constants.ts`), keeping the synchronous bootstrap cache in sync.
- [ ] Run the tests and confirm they pass.

### Task 17: Implement the dark mode application in main.tsx

- [ ] Update `src/main.tsx`. **Before** `ReactDOM.createRoot` (i.e., as synchronous inline code at module level, not inside any function, effect, or promise), read `localStorage.getItem('walo_theme')`. If the value is `'dark'`, immediately set `document.documentElement.dataset.theme = 'dark'`. If `'light'`, set it to `'light'`. If absent or `'system'`, do nothing — the CSS `prefers-color-scheme` media query in `global.css` applies the correct tokens. This must be synchronous and inline to prevent a flash of the wrong theme before React mounts. After the DB loads and the theme store initialises, the store writes any theme changes back to both SQLite and `localStorage` to keep them in sync.

### Task 18: Create placeholder page components

- [ ] Create `src/pages/dashboard/DashboardPage.tsx`. A minimal Ionic page component that renders the page title "Dashboard" inside an `IonHeader` and an `IonContent`. No data, no logic — just the structural shell.
- [ ] Repeat for `src/pages/transactions/TransactionsPage.tsx` ("Transactions"), `src/pages/analytics/AnalyticsPage.tsx` ("Analytics"), and `src/pages/settings/SettingsPage.tsx` ("Settings").
- [ ] Create `src/pages/onboarding/OnboardingPage.tsx`. A placeholder that renders the text "Create your first account" with a disabled "Continue" button. The real form is built in Phase 2.

### Task 19: Implement the App.tsx with tab router and first-launch gate

- [ ] Create `src/db/queries/accounts.ts` now (a stub used by the gate). Add a single exported function `hasAnyAccounts(db)` that runs `SELECT COUNT(*) as count FROM accounts WHERE is_deleted = 0` and returns `true` if count > 0.
- [ ] Create `src/App.tsx`. Wrap the entire app in `QueryClientProvider` (React Query), `DbProvider` (DB context), and `IonApp`. Inside `DbProvider`, use a `useQuery` hook calling `hasAnyAccounts(db)`. While loading show a spinner. If zero accounts exist, render `OnboardingPage` full-screen with no tab bar. If accounts exist, render the `IonTabs` router. The tab router has five entries: Dashboard, Transactions, a centre action button (renders a placeholder `IonTab` with just the `+` icon — the modal is wired in Phase 2), Analytics, and Settings. Each tab routes to its respective placeholder page.
- [ ] Commit: `git commit -m "feat: app shell with tab router, first-launch gate, and dark mode bootstrap"`

---

## Chunk 7: Android Configuration

### File Map

- Modify: `capacitor.config.ts`
- Modify: `android/app/build.gradle` (after Capacitor adds Android platform)
- Create: `android/app/src/main/res/drawable/` (icon placeholders)

### Task 20: Add Android platform

- [ ] Run `npx cap add android` to generate the Android project under `android/`.
- [ ] Verify the `android/` directory exists with a valid Gradle project.

### Task 21: Configure Android SDK and app metadata

- [ ] Open `android/app/build.gradle`. Set `minSdkVersion 24`, `targetSdkVersion 34`, `compileSdkVersion 34`. Set `applicationId "app.walo"`. Set `versionCode 1` and `versionName "1.0.0"`.
- [ ] Open `capacitor.config.ts`. Set `appId: 'app.walo'`, `appName: 'Walo'`, `webDir: 'dist'`. Add an `android` block with `allowMixedContent: false`.

### Task 22: Add placeholder app icon, register SQLite plugin, and sync

- [ ] Install `@capacitor/assets` as a dev dependency (`npm install -D @capacitor/assets`). Add a 1024x1024 green square PNG at `resources/icon.png`. Run `npx capacitor-assets generate --android` to produce correctly sized and named launcher icons across all required `mipmap-*` directories. This avoids manual icon placement and prevents `assembleDebug` resource-not-found errors.
- [ ] Open `android/app/src/main/java/app/walo/MainActivity.java` (or `.kt`). Register `CapacitorSQLitePlugin` in the plugins list by adding it to the `onCreate` bridge registration. Without this, the native SQLite bridge will not respond to plugin calls and `initDb()` will hang silently.
- [ ] Run `npm run build` then `npx cap sync android` to sync web assets to the Android project.
- [ ] Verify the Android project builds without errors by running `cd android && ./gradlew assembleDebug`. Expect a `.apk` in `android/app/build/outputs/apk/debug/`.
- [ ] Commit: `git commit -m "feat: configure Android platform with SDK 24 target"` then `git push origin main`.

---

## Chunk 8: Integration Smoke Test

### Task 23: Verify the full app boots on Android emulator or device

- [ ] Start an Android emulator (API 24+) or connect a physical device.
- [ ] Run `npx cap run android` (or open the `android/` folder in Android Studio and run it from there).
- [ ] Verify: the app launches, shows the "Create your first account" placeholder screen (because no accounts exist), does not crash on DB init, and the status bar colour matches the theme.
- [ ] Verify dark mode: in Android Settings, switch the device to dark mode. Confirm the app's background changes to `#0f172a` without a white flash.
- [ ] If any crash or visual issue is found, fix it before proceeding.
- [ ] Commit any fixes: `git commit -m "fix: <description>"` and `git push origin main`.

---

**Phase 1 complete.** When all tasks are checked off and the Android smoke test passes, Phase 2 (Core Tracker) plan will be written before execution begins.
