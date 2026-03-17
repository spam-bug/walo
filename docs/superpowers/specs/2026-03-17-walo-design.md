# Walo — Design Specification

**Date:** 2026-03-17
**Status:** Approved

---

## Overview

Walo is a premium-quality income and expense tracker mobile application built for Android. It targets everyday users who want a clean, fast, and reliable way to manage personal finances across multiple accounts. The app works fully offline with automatic cloud sync when connectivity is available (backend deferred). A subscription model gates advanced features.

---

## Tech Stack

| Concern | Choice | Reason |
|---|---|---|
| Framework | Ionic React + Capacitor | Cross-platform base, Android-first |
| Styling | TailwindCSS v3 | Utility-first, config extends CSS tokens |
| Design tokens | CSS custom properties in `src/theme/global.css` | Single source of truth for all visual values |
| Local database | Capacitor SQLite (`@capacitor-community/sqlite`) | Relational, fast, offline-first, no size limits |
| State | Zustand | Lightweight, minimal boilerplate |
| Async data | React Query (`@tanstack/react-query`) | Clean async patterns for DB queries |
| Charts | Recharts | React-native compatible, well maintained |
| Navigation | Ionic tab router + stack navigation | Native-feel transitions, per-tab stacks |
| Linting | ESLint + Prettier | Consistent code style |
| Target platform | Android, minSdk 24 (Android 7.0) | ~97% device coverage |

---

## Design System

### Color Tokens (`src/theme/global.css`)

```css
:root {
  --color-primary-50: #f0fdf4;
  --color-primary-100: #dcfce7;
  --color-primary-500: #22c55e;
  --color-primary-600: #16a34a;   /* main brand green */
  --color-primary-700: #15803d;

  --color-bg: #ffffff;
  --color-surface: #f9fafb;
  --color-border: #e5e7eb;
  --color-text-primary: #111827;
  --color-text-secondary: #6b7280;
  --color-text-muted: #9ca3af;

  --color-income: #16a34a;
  --color-expense: #ef4444;
  --color-neutral: #6b7280;

  --radius-card: 1rem;
  --radius-pill: 9999px;
}

[data-theme="dark"] {
  --color-bg: #0f172a;
  --color-surface: #1e293b;
  --color-border: #334155;
  --color-text-primary: #f1f5f9;
  --color-text-secondary: #94a3b8;
  --color-text-muted: #64748b;
}
```

### Typography

System font stack (`-apple-system, Roboto, sans-serif`). Three scale levels: `text-sm` for labels, `text-base` for body, `text-xl` and above for display numbers.

### Dark Mode Strategy

Controlled via `data-theme="dark"` attribute on `<html>`. Not Tailwind's `dark:` class variant. Gives programmatic control and integrates cleanly with Capacitor's status bar and system theme detection. User preference persisted in SQLite preferences table.

---

## Folder Structure

```
src/
├── theme/
│   └── global.css              # design tokens + base styles
├── db/
│   ├── schema.ts               # SQL schema definitions
│   ├── migrations/             # versioned migration files
│   └── queries/                # typed query functions per entity
├── stores/                     # Zustand stores
├── hooks/                      # React Query hooks (useTransactions, etc.)
├── components/
│   ├── ui/                     # pure reusable components (Button, Card, Badge)
│   └── features/               # domain components (TransactionItem, AccountCard)
├── pages/
│   ├── dashboard/
│   ├── transactions/
│   ├── analytics/
│   ├── accounts/
│   └── settings/
└── types/                      # shared TypeScript types
```

---

## Data Models

```ts
Account {
  id: string
  name: string
  type: 'cash' | 'bank' | 'digital_wallet' | 'other'
  balance: number
  currency: string
  color: string
  icon: string
  createdAt: string
}

Category {
  id: string
  name: string
  type: 'income' | 'expense'
  icon: string
  color: string
  isCustom: boolean
}

Transaction {
  id: string
  accountId: string
  categoryId: string
  amount: number
  type: 'income' | 'expense'
  note: string
  date: string
  isRecurring: boolean
  recurringId: string | null
}

RecurringRule {
  id: string
  transactionId: string         # template transaction
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  nextDue: string
  endDate: string | null
}

Budget {
  id: string
  categoryId: string
  amount: number
  period: 'weekly' | 'monthly'
  startDate: string
}

Preference {
  key: string
  value: string
}
```

**Relationships:** Transactions belong to one Account and one Category. RecurringRules point to a template Transaction. Budgets track spending per Category per period.

---

## Navigation Structure

**Tab bar:**
```
Dashboard | Transactions | [+] | Analytics | Settings
```

The center [+] is an action button (not a real tab) that opens a full-screen modal for adding a transaction. Always one tap away.

**Screen map:**
```
Dashboard
  └── Account detail (balance history, recent transactions)

Transactions
  ├── Transaction list (filterable, searchable)
  └── Transaction detail / edit

[+ Modal]
  └── Add transaction (account, category, amount, date, note)

Analytics
  ├── Overview (income vs expense, net)
  ├── Category breakdown (pie/bar chart)
  └── Trends (line chart over time)

Settings
  ├── Accounts / Wallets (CRUD)
  ├── Categories (predefined + custom)
  ├── Budgets
  ├── Recurring transactions
  ├── Notifications
  ├── Export data
  ├── Subscription / Premium
  └── App preferences (theme, currency, language)
```

Each tab maintains its own independent navigation stack.

---

## Phase Plan

### Phase 1 — Foundation
Project scaffold (Ionic React + Capacitor + TailwindCSS), global CSS tokens, SQLite setup with schema and migrations, navigation shell with all tabs wired to empty screens, dark mode toggle, Android build config (SDK 24, app icon placeholder, splash screen).

### Phase 2 — Core Tracker
Accounts/wallets (create, edit, delete, balance display), transaction add/edit/delete modal, predefined categories with icons, custom category creation, transaction list with date grouping, dashboard summary (total balance, today's income/expense).

### Phase 3 — Analytics
Date range filters (daily/weekly/monthly/custom), income vs expense overview chart, category breakdown pie chart, spending trend line chart, transaction search and filter by account/category/date/type.

### Phase 4 — Power Features
Recurring transactions engine (auto-generates due transactions), budget creation per category with progress indicators, spending limit notifications via Capacitor Local Notifications, CSV/PDF data export.

### Phase 5 — Monetization
Free vs premium feature gates, Google Play Billing integration, subscription management screen. Premium features: unlimited accounts, detailed reports, priority support messaging.

### Phase 6 — Backend (Laravel, lowest priority)
User authentication, cloud sync via API, backup/restore, multi-device support. Built after the local-first data layer is stable.

Each phase ends with a commit and push before the next begins.

---

## Git Workflow

- Incremental commits and pushes per phase (no bulk push).
- No co-author attribution in commit messages.
- Repository: `git@github.com:spam-bug/walo.git`
