# Walo — Design Specification

**Date:** 2026-03-17
**Status:** Approved

---

## Overview

Walo is a premium-quality income and expense tracker mobile application built for Android. It targets everyday users who want a clean, fast, and reliable way to manage personal finances across multiple accounts. The app works fully offline with automatic cloud sync when connectivity is available (backend is Phase 6, lowest priority). A subscription model gates advanced features.

---

## Tech Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | Ionic React + Capacitor | Android-first, minSdk 24 (~97% device coverage) |
| Styling | TailwindCSS v3 | Config extends CSS custom properties |
| Design tokens | CSS custom properties in `src/theme/global.css` | Single source of truth |
| Local database | Capacitor SQLite (`@capacitor-community/sqlite`) | Relational, offline-first, no size limits |
| State | Zustand | Ephemeral UI state and in-memory filters |
| Async data | React Query (`@tanstack/react-query`) | Wraps all SQLite queries for cache/invalidation; ready for Phase 6 backend |
| Charts | Recharts | React-native compatible |
| Navigation | Ionic tab router + stack navigation | Per-tab stacks, native-feel transitions |
| Linting | ESLint + Prettier | |

**React Query boundary:** React Query wraps all SQLite query functions to provide consistent loading, error, and cache-invalidation patterns. Zustand holds ephemeral UI state (form drafts, active filters, theme in memory). This boundary does not change when the backend is added in Phase 6.

---

## Design System

### Color Tokens (`src/theme/global.css`)

```css
:root {
  /* Brand */
  --color-primary-50: #f0fdf4;
  --color-primary-100: #dcfce7;
  --color-primary-200: #bbf7d0;
  --color-primary-500: #22c55e;
  --color-primary-600: #16a34a;   /* main brand green */
  --color-primary-700: #15803d;

  /* Backgrounds */
  --color-bg: #ffffff;
  --color-surface: #f9fafb;
  --color-surface-raised: #f3f4f6;

  /* Borders */
  --color-border: #e5e7eb;
  --color-border-strong: #d1d5db;

  /* Text */
  --color-text-primary: #111827;
  --color-text-secondary: #6b7280;
  --color-text-muted: #9ca3af;
  --color-text-inverse: #ffffff;

  /* Semantic */
  --color-income: #16a34a;
  --color-expense: #ef4444;
  --color-warning: #f59e0b;
  --color-neutral: #6b7280;

  /* Radius */
  --radius-sm: 0.375rem;
  --radius-card: 1rem;
  --radius-pill: 9999px;

  /* Shadows */
  --shadow-card: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  --shadow-modal: 0 10px 25px -5px rgb(0 0 0 / 0.15);
}

[data-theme="dark"] {
  --color-bg: #0f172a;
  --color-surface: #1e293b;
  --color-surface-raised: #273549;
  --color-border: #334155;
  --color-border-strong: #475569;
  --color-text-primary: #f1f5f9;
  --color-text-secondary: #94a3b8;
  --color-text-muted: #64748b;
  --color-text-inverse: #0f172a;
  --shadow-card: 0 1px 3px 0 rgb(0 0 0 / 0.4);
  --shadow-modal: 0 10px 25px -5px rgb(0 0 0 / 0.5);
}
```

### Typography

System font stack (`-apple-system, Roboto, sans-serif`). Scale:
- `text-xs` — metadata, timestamps
- `text-sm` — labels, secondary info
- `text-base` — body, list items
- `text-lg` / `text-xl` — section headers
- `text-2xl`+ — balance display numbers

### Dark Mode Strategy

Controlled via `data-theme="dark"` attribute on `<html>`. Not Tailwind's `dark:` class variant. Theme preference is read from SQLite preferences on app load and applied before first render to avoid flash. Integrates with Capacitor's status bar color API.

---

## Folder Structure

```
src/
├── theme/
│   └── global.css              # design tokens + Ionic variable overrides + base styles
├── db/
│   ├── schema.ts               # SQL schema constants
│   ├── migrations/
│   │   ├── index.ts            # migration runner (see Migration Strategy section)
│   │   └── v1_initial.ts       # initial schema + category seed data
│   └── queries/
│       ├── accounts.ts
│       ├── transactions.ts
│       ├── categories.ts
│       ├── budgets.ts
│       ├── recurring.ts
│       └── preferences.ts
├── stores/
│   ├── useThemeStore.ts
│   └── useFilterStore.ts
├── hooks/
│   ├── useAccounts.ts
│   ├── useTransactions.ts
│   ├── useCategories.ts
│   ├── useBudgets.ts
│   ├── usePreferences.ts
│   └── usePremium.ts           # stub in Phases 1-4, real in Phase 5
├── components/
│   ├── ui/                     # Button, Card, Badge, BottomSheet, Modal, Input, etc.
│   └── features/               # TransactionItem, AccountCard, BudgetBar, CategoryIcon
├── pages/
│   ├── dashboard/
│   ├── transactions/
│   ├── analytics/
│   ├── accounts/
│   └── settings/
└── types/
    └── index.ts
```

---

## Data Models

### Schema Principles

- All PKs are UUIDs generated client-side (no auto-increment)
- All tables include `created_at`, `updated_at` (ISO 8601 strings), and `deleted_at` (soft delete, NULL when active) for sync-readiness in Phase 6
- Amounts are stored as `REAL` (floating point). Currency is display-only; computation does not convert between currencies. One currency per app (set in preferences). Per-account currency display is a future feature not in current scope.
- Amounts are always stored as positive values. The `type` column (`income`/`expense`) determines sign during display and calculations.

### SQL Schema (DDL)

```sql
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('cash','bank','digital_wallet','other')),
  balance REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'PHP',
  color TEXT NOT NULL DEFAULT '#16a34a',
  icon TEXT NOT NULL DEFAULT 'wallet-outline',
  is_deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('income','expense')),
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  is_custom INTEGER NOT NULL DEFAULT 0,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  category_id TEXT NOT NULL REFERENCES categories(id),
  amount REAL NOT NULL CHECK(amount > 0),
  type TEXT NOT NULL CHECK(type IN ('income','expense')),
  note TEXT,
  date TEXT NOT NULL,
  is_recurring INTEGER NOT NULL DEFAULT 0,
  recurring_id TEXT REFERENCES recurring_rules(id),
  is_deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS recurring_rules (
  id TEXT PRIMARY KEY,
  template_transaction_id TEXT NOT NULL REFERENCES transactions(id),
  frequency TEXT NOT NULL CHECK(frequency IN ('daily','weekly','monthly','yearly')),
  next_due TEXT NOT NULL,
  end_date TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES categories(id),
  amount REAL NOT NULL CHECK(amount > 0),
  period TEXT NOT NULL,              -- format: 'YYYY-MM' for monthly, 'YYYY-WNN' for weekly
  is_deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  UNIQUE(category_id, period)
);

CREATE TABLE IF NOT EXISTS preferences (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### Migration Strategy

Migrations are stored as an ordered array registered in `src/db/migrations/index.ts`. Each migration is an object with a `version` (integer) and an `up(db)` function. On app startup, before any other DB operation:

1. Read `schema_version` from the preferences table (or `0` if the table does not exist yet).
2. Run all migrations whose `version` is greater than the current `schema_version`, in order.
3. Each migration runs inside its own `BEGIN`/`COMMIT`. If any statement fails, the transaction is rolled back and the app shows a fatal error screen ("Unable to initialize database — please reinstall the app"). The app does not attempt partial recovery.
4. After all migrations complete, update `schema_version` to the highest version applied.

Capacitor SQLite's own versioning (`version` parameter on `openDatabase`) is not used. `schema_version` in the preferences table is the sole source of truth.

### Preference Keys

| Key | Values | Default |
|---|---|---|
| `theme` | `light`, `dark`, `system` | `system` |
| `currency` | ISO 4217 code | `PHP` |
| `default_account_id` | UUID or empty string | `''` |
| `schema_version` | integer string | `'1'` |
| `subscription_status` | `free`, `premium` | `free` |
| `weekly_summary_notifications` | `0`, `1` | `0` |

---

## Account Balance Management

Account `balance` is maintained as a running value, updated atomically with each transaction write:

- **Create transaction:** `balance += amount` (income) or `balance -= amount` (expense)
- **Edit transaction amount:** reverse the old delta, apply the new delta
- **Edit transaction type:** reverse the old direction, apply the new direction
- **Edit transaction account:** remove delta from old account, add delta to new account
- **Soft-delete transaction:** reverse the delta on the account (balance is restored)
- **Hard delete is never used.** All deletes are soft deletes (`deleted_at = NOW()`, `is_deleted = 1`).

All balance updates are wrapped in a SQLite transaction (BEGIN/COMMIT) to ensure atomicity.

---

## Soft Delete Cascade Rules

| Action | Cascade |
|---|---|
| Soft-delete an Account | Also soft-delete all Transactions for that account |
| Soft-delete a Category | Transactions referencing it retain the category_id for history; category name shows as "Deleted" in display |
| Soft-delete a RecurringRule | The rule becomes inactive; no further transactions are generated; existing generated transactions are not deleted |
| Soft-delete a Budget | No cascade; transactions are unaffected |

---

## Transfers Between Accounts

Transfers (moving money from one account to another) are **out of scope for v1**. The `type` toggle on the transaction modal is Income/Expense only. Transfers can be approximated manually by the user (one expense on source account, one income on destination). This decision is intentional and explicit.

---

## Transaction Modal (Add and Edit)

The same modal component is used for both creating and editing. When editing, the form is pre-filled with existing values. The edit flow is invoked by tapping a transaction in the list.

**Fields:**

| Field | Type | Required | Validation |
|---|---|---|---|
| Type | Toggle (Income / Expense) | Yes | Defaults to Expense on new |
| Amount | Numeric input | Yes | Must be > 0, max 999,999,999 |
| Account | Select (dropdown) | Yes | Defaults to `default_account_id` preference or first account |
| Category | Icon grid picker | Yes | Filtered by selected Type |
| Date | Date picker | Yes | Defaults to today, cannot be in future by more than 1 year |
| Note | Text input | No | Max 255 characters |

**On save (create):** Insert transaction row, update account balance atomically in a SQLite transaction, invalidate relevant React Query cache keys (`transactions`, `accounts`, `budgets`), close modal, show success toast "Transaction added."

**On save (edit):** Reverse old balance delta, apply new balance delta, update transaction row, invalidate cache, close modal, show success toast "Transaction updated."

**Edit of recurring transaction:** Before showing the edit form, show an action sheet: "Edit this entry only" or "Edit all future entries." "This only" detaches the transaction from the recurring rule (`recurring_id = NULL`, `is_recurring = 0`). "All future" updates the template transaction and regenerates the next due entry.

**On delete:** Show confirmation dialog "Delete this transaction?" Soft-delete the row, reverse the balance delta, invalidate cache, show toast "Transaction deleted."

**Validation errors** are shown inline beneath the relevant field (not a toast). The save button is disabled until required fields are valid.

---

## First Launch and Account Creation Gate

On app open, the app checks whether any non-deleted accounts exist. If none, it shows the first-launch account creation screen (not skippable, no back navigation).

**First-launch screen fields:**

| Field | Type | Required | Default |
|---|---|---|---|
| Account name | Text input | Yes | "My Wallet" (pre-filled) |
| Account type | Radio: Cash / Bank / Digital Wallet / Other | Yes | Cash |
| Starting balance | Numeric input | Yes | 0 |
| Currency | Select (short list: PHP, USD, EUR, SGD, AUD, GBP, JPY, Others) | Yes | PHP |
| Color | Colour swatch picker (8 preset colours) | No | Brand green |
| Icon | Icon grid picker (wallet, bank, card, phone, coins, piggy bank, etc.) | No | wallet-outline |

After creation: account row is inserted, user lands on Dashboard. This first account counts toward the 3-account free limit.

---

## Dashboard

The Dashboard tab renders:

1. **Total balance card** — sum of balances across all non-deleted accounts. Tapping it shows a breakdown list of individual account balances.
2. **Today's summary bar** — today's total income and total expense side by side.
3. **Account cards row** — horizontally scrollable cards showing each account name, icon, and balance. Tapping an account navigates to Account Detail.
4. **Recent transactions list** — last 10 transactions across all accounts, grouped by date. Tapping a transaction opens the edit modal.
5. **Quick add button** — floating action button that opens the transaction modal (same as the [+] tab button).

Account Detail screen shows: account name, current balance, a 30-day balance trend sparkline, and a paginated transaction list filtered to that account.

---

## Category Seeding

Categories are flat (no subcategories). Seeded in v1 migration. Custom categories are premium-gated. Predefined categories cannot be deleted (they can be hidden in a future version, not in current scope).

**Predefined expense categories (10):**
Food and Dining, Transport, Shopping, Bills and Utilities, Health, Entertainment, Education, Personal Care, Home, Others

**Predefined income categories (6):**
Salary, Freelance, Business, Investment, Gift, Others

---

## Free vs Premium Feature Gates

The `usePremium()` hook is scaffolded as a stub in Phase 1 and returns `false` (free tier) for all users. In Phase 5 it is replaced with a real implementation reading `subscription_status` from preferences (updated by Google Play Billing). This means gates are enforceable from Phase 2 onward without rework.

| Feature | Free | Premium |
|---|---|---|
| Accounts / Wallets | Up to 3 | Unlimited |
| Transactions | Unlimited | Unlimited |
| Categories | Predefined only | Predefined + unlimited custom |
| Analytics date range | Current month only | All time + custom ranges |
| Recurring transactions | No | Yes |
| Budgets | No | Yes |
| Export (CSV/PDF) | No | Yes |
| Cloud backup and sync | No | Yes (Phase 6) |
| Detailed reports | No | Yes |

Gate enforcement pattern: a `<PremiumGate>` wrapper component renders the feature if premium, or a soft paywall prompt (upgrade card) if free. Never a hard block — users can always see what they are missing.

---

## Navigation Structure

**Tab bar:**
```
Dashboard | Transactions | [+] | Analytics | Settings
```

The center [+] is an action button (not a real tab) that opens the transaction modal.

**Screen map:**
```
[First launch gate — create first account (not skippable)]

Dashboard
  └── Account detail

Transactions
  ├── Transaction list (grouped by date, searchable, filterable)
  └── [Edit modal — shared with [+]]

[+ Modal — add/edit transaction]

Analytics
  ├── Overview (income vs expense, net for selected period)
  ├── Category breakdown (pie chart, tap to view transactions)
  └── Trends (line chart: daily/weekly/monthly totals)

Settings
  ├── Accounts / Wallets (list, CRUD)
  ├── Categories (list, predefined + custom CRUD)
  ├── Budgets (list, CRUD, progress bars)
  ├── Recurring transactions (list, CRUD)
  ├── Notifications (toggles for each notification type)
  ├── Export data (date range, format, share)
  ├── Subscription / Premium (plan details, Google Play manage)
  └── App preferences (theme, currency, default account)
```

Each tab maintains its own independent navigation stack.

---

## Analytics Filters

Filters persist for the session in Zustand (not SQLite). Dimensions:
- **Period:** Today, This Week, This Month, This Year, Custom range
- **Account:** All or single account
- **Type:** All, Income only, Expense only

**Free tier analytics gate:** The gate is on the **date range** covered by the query, not the period type label. A free user may select "Today" or "This Week" only if the resulting date range falls entirely within the current calendar month. If "This Week" spans two months (e.g. the week starting Monday March 30 includes April dates), it is treated as a premium feature and the paywall prompt is shown. "This Month" and all shorter ranges within the current month are always free. "This Year", "Custom range", and any range touching a prior month are premium.

**Transaction search** (Transactions tab): free-text search on the `note` field only. This is an intentional constraint for v1. Account and category are filterable via filter chips, not free-text search.

---

## Recurring Rules

### Transaction Flags

- The **template transaction** is a regular transaction row with `is_recurring = 1` and `recurring_id = NULL`.
- Each **generated (child) transaction** also carries `is_recurring = 1` and `recurring_id = <rule.id>`. This link is essential for "edit/delete all future" operations.

### Rule Creation

When a recurring rule is created, `next_due` is set to the **first occurrence date chosen by the user** in the recurring rule form (defaults to today). The template transaction's `date` is set to the same value.

### Generation Logic

On app open, a service function checks all active rules where `next_due <= today`. For each due rule:

1. Create a new child transaction row copied from the template (new UUID, `date = next_due`, `recurring_id = rule.id`, `is_recurring = 1`).
2. Update account balance atomically (same as a regular transaction create).
3. Advance `next_due` by the frequency:
   - `daily`: +1 day
   - `weekly`: +7 days
   - `monthly`: same calendar day next month; if that day does not exist (e.g. Feb 30), use the last day of the month
   - `yearly`: same calendar day next year

Repeat step 1–3 until `next_due > today` (catch-up loop).

### Catch-Up Cap

**Maximum catch-up: 30 periods per rule per app open.** If more than 30 periods have been missed, generate 30 and leave the rule's `next_due` pointing to the 31st. On subsequent app opens, the remaining periods are generated (up to 30 per open) until caught up. No user confirmation is required; the cap prevents runaway inserts on very long absences.

### End Condition

If `end_date` is set and the advanced `next_due > end_date`, mark `is_active = 0` and do not advance `next_due` further. No further transactions are generated.

### Edit and Delete Scope

Defined in the Transaction Modal section. Additional semantics:

- **"Edit all future" fields in scope:** amount, type, category, account, note. Frequency and end_date are edited on the RecurringRule itself, not through the transaction modal.
- **"Edit all future" effect:** Updates the template transaction row and soft-deletes all future-dated child transactions (date > today) so they are regenerated from the updated template on next app open. Already-generated transactions with `date <= today` are not modified.
- **"Delete all future":** Soft-deletes the RecurringRule and all child transactions with `date > today`. Past child transactions (date <= today) are retained.

### Notification Scheduling for Recurring

Recurring due notifications are registered when a rule is **created or updated**, scheduling one exact alarm for the next `next_due` date at 9:00 AM. After generation on app open, the next alarm is re-registered for the new `next_due`.

To handle Android device restarts (which cancel all scheduled alarms), the app registers a `BOOT_COMPLETED` broadcast receiver via Capacitor. On boot, it re-registers all active recurring due notifications. This is implemented as a Capacitor plugin (or via a Capacitor Background Runner if available) in Phase 4.

---

## Budgets

- Per-category budgets only (not per-account).
- One budget per category per period (enforced by UNIQUE constraint).
- `period` format: `YYYY-MM` for monthly (e.g., `2026-03`), `YYYY-Www` for weekly using ISO 8601 week numbering with zero-padded two-digit week number (e.g., `2026-W11`). Weeks start on Monday per ISO 8601. The mapping from a calendar date to `YYYY-Www` must use the same ISO week calculation in both the budget write path and the query path to avoid silent mismatches.
- Spending for a budget is calculated at query time: sum of expense transaction amounts where `category_id` matches, `date` falls within the period, and `is_deleted = 0`.
- Budget progress is displayed as a percentage bar, color-coded: green (<80%), amber (80–99%), red (100%+).

---

## Notifications (Phase 4)

Uses Capacitor Local Notifications. Three trigger types:

1. **Budget threshold alert** — fires when spending in a category reaches 80% of its budget (one notification) and again at 100% (one notification). Scheduled at transaction save time if a matching budget exists.
2. **Recurring transaction due** — fires on the `next_due` date of each active recurring rule at 9:00 AM. Scheduled when the rule is created or updated.
3. **Weekly summary** — optional, fires every Sunday at 8:00 AM with the week's income/expense totals. Off by default (preference key `weekly_summary_notifications`).

Android 12+ (API 31+) requires `SCHEDULE_EXACT_ALARM` permission for exact alarms. The app requests this permission at notification opt-in time with an explanation dialog before the system prompt.

---

## Export (Phase 4)

Two formats: CSV and PDF. Both generated on-device.

The export screen (under Settings) has a **date range picker** (start date and end date, defaulting to the current month) and a format selector (CSV or PDF). The user taps "Export" to generate and share.

- **CSV:** All non-deleted transactions within the selected date range, ordered by date ascending. Columns: Date (YYYY-MM-DD), Type, Account Name, Category Name, Amount, Note. UTF-8 encoded with BOM for Excel compatibility.
- **PDF:** Summary report for the selected date range. Sections: (1) date range header, (2) per-account balance table (account name, balance), (3) per-category totals table (category name, total spent/received), (4) full transaction list ordered by date descending. No page limit; large datasets are paginated within the PDF. Generated using a React-to-HTML-to-PDF approach (e.g. `@react-pdf/renderer`) on-device.

Delivery: Capacitor Share (`@capacitor/share`) opens the system share sheet. Files are written to the app cache directory before sharing. File name format: `walo-export-YYYY-MM-DD.csv` / `.pdf`.

---

## Validation Rules

| Field | Rule |
|---|---|
| Account name | Required, 1–50 characters, must be unique (case-insensitive) among non-deleted accounts |
| Transaction amount | Required, numeric, > 0, max 999,999,999 |
| Transaction note | Optional, max 255 characters |
| Category name (custom) | Required, 1–30 characters, must be unique (case-insensitive) within same type |
| Budget amount | Required, numeric, > 0 |
| Starting balance | Required, numeric, >= 0 |

**Error display:** Inline beneath the field, not as a toast. Save/submit button disabled while any required field is invalid or any error is present.

**SQLite write failures:** Show a generic error toast "Something went wrong. Please try again." The failed operation is not retried automatically.

---

## Phase Plan

### Phase 1 — Foundation
Project scaffold (Ionic React + Capacitor + TailwindCSS), global CSS token file (full token set from this spec), TailwindCSS configured to extend CSS tokens, SQLite setup with DDL schema and migration runner, `usePremium()` stub (returns `false`), navigation shell (all 5 tabs wired to placeholder screens, first-launch gate), dark mode (token-driven, reads from preferences, system/manual toggle), Android build config (SDK 24, package name, app icon placeholder, splash screen).

### Phase 2 — Core Tracker
First-launch account creation screen (all fields from spec), accounts/wallets CRUD, account detail screen, transaction add/edit/delete modal (all fields, validation, balance update logic), predefined category seeding (v1 migration), custom category creation (premium-gated via `usePremium()` stub), transaction list with date grouping, transaction search (note field) and filter chips, dashboard (all 5 widgets from spec).

### Phase 3 — Analytics
Date range filter (period/account/type dimensions, free tier limited to current month), income vs expense overview chart with net balance, category breakdown pie chart with drill-down, spending trend line chart, full analytics filter persistence in Zustand.

### Phase 4 — Power Features
Recurring transactions engine (due-date checker on app open, catch-up logic, edit/delete scope prompt), budget CRUD with period-based spending query and progress bars, budget threshold notifications, recurring due notifications, weekly summary notification (opt-in), CSV export, PDF export, Capacitor Share integration.

### Phase 5 — Monetization
Replace `usePremium()` stub with real Google Play Billing integration, `<PremiumGate>` wrapper component with soft paywall prompt, subscription management screen, all gates active against real subscription status.

### Phase 6 — Backend (Laravel, lowest priority)
User authentication, cloud sync via REST API, backup/restore, multi-device support. Schema is already sync-ready (UUIDs, soft deletes, timestamps). No destructive migrations required.

Each phase ends with a commit and push to `main` before the next begins.

---

## Git Workflow

- Incremental commits and pushes per phase (no bulk push).
- No co-author attribution in commit messages.
- Repository: `git@github.com:spam-bug/walo.git`
