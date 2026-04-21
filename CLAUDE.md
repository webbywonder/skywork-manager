# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SkyWork Manager — a personal business assistant for Darshan's operations. Covers two business verticals:
1. **SkyWork Borivali** — co-working space management (clients, bookings, payments, expenses)
2. **WebbyWonder** — web development business (domain/hosting renewals, future modules)

Single user, no authentication, local-only (localhost). Read `docs/receipt-reference.html` for receipt styling reference.

## Commands

```bash
npm run dev      # Start dev server (http://localhost:8000)
npm run build    # Production build (includes TypeScript type checking)
npm run lint     # ESLint
npx tsx src/scripts/seed-renewals.ts  # Seed initial renewal data (idempotent)
```

No test framework is configured. Verify changes via `npm run build` (catches type errors) and manual Playwright browser testing.

## Tech Stack

- **Next.js 16** (App Router, Turbopack) with **React 19** and **TypeScript**
- **SQLite** via better-sqlite3 (raw SQL, no ORM) — `serverExternalPackages: ['better-sqlite3']` in next.config.ts
- **Tailwind CSS v4** (utility classes only)
- **Node.js 25** (.nvmrc)

## Architecture

### Data Flow

All pages are `'use client'` components that fetch data from API routes via `fetch()`. No React Server Components fetching data directly.

```
Page Component (client) → fetch('/api/...') → Route Handler → better-sqlite3 → SQLite
```

### API Route Pattern

Route handlers live in `src/app/api/[module]/route.ts` (GET, POST) and `src/app/api/[module]/[id]/route.ts` (GET, PUT, DELETE). All return `{ success: boolean, data?: T, error?: string }`.

Next.js 16 route params are async: `const { id } = await context.params`.

### Database

- **File:** `data/skywork.db` (auto-created on first run, gitignored)
- **Schema:** `src/lib/schema.sql` — executed on every `getDb()` call (uses `CREATE TABLE IF NOT EXISTS`)
- **Connection:** `src/lib/db.ts` — singleton pattern via `getDb()`, seeds default settings on first run
- **Amounts in paise:** All monetary values stored as integers (Rs. 5,000 = 500000). Use `toPaise()` when writing, `toRupees()`/`formatCurrency()` when reading.
- **Dates as ISO strings:** Stored as `TEXT` in YYYY-MM-DD format
- **Display IDs:** Client `SW-NN`, Booking `SW-YYMMDD-NN`, Receipt `SW-YYMMDD-NN` — generated in app code, stored as strings
- **Triggers:** All tables have `updated_at` auto-update triggers

### Payment Model (Ledger-Based)

Payments are a **simple ledger** — each entry is a standalone record of money received. No updating existing entries. This pattern is used in both co-working payments and renewal payments.

- **"Log Payment"** always creates a new row in the `payments` table
- Each payment stores: `amount_paid`, `payment_date`, `payment_method`, `payment_type` (advance/adhoc/scheduled_due)
- **Total Due** is computed dynamically from the booking, NOT from payment rows:
  - One-off: `rate × seats + GST`
  - Recurring: uses `computeRecurringTotalDue()` — prorates first partial month (rate/30 × days remaining), then full months
- **Balance** = computed total due - SUM(amount_paid from all payment entries)
- The `amount_due` field on payment rows is only used for legacy scheduled_due entries

### Key Helpers (`src/lib/utils.ts`)

- `formatCurrency(paise)` → `"Rs. 5,000"` (Indian number formatting with lakhs/crores)
- `toPaise(rupees)` / `toRupees(paise)` — conversion between storage and display
- `formatDate(isoString)` → `"26 Feb 2026"`
- `computeRecurringTotalDue(monthlyDue, startDate)` — prorated first month + full subsequent months
- `generateClientId()`, `generateBookingId()`, `generateReceiptNumber()`

### UI Components

- `src/components/ui/Modal.tsx` — used for all create/edit forms. Accepts `size` prop ("sm", "lg")
- `src/components/ui/ConfirmDialog.tsx` — used for all destructive/status-change actions. Variants: `'danger' | 'default'`
- `src/components/ui/Badge.tsx` — status badges (green/yellow/red/gray/blue)
- `src/components/ui/Toast.tsx` — success/error notifications via `useToast()` hook, auto-dismiss 4s
- `src/components/layout/Sidebar.tsx` — persistent sidebar navigation, collapsible on mobile
- `src/components/forms/` — one form component per module (ClientForm, BookingForm, PaymentForm, ExtraForm)

### Page Patterns

- **List pages** (`/bookings`, `/renewals`, `/expenses`) — table view with search/filter, CRUD modals, ConfirmDialog for deletes
- **Detail pages** (`/bookings/[id]`, `/renewals/[id]`) — info cards + payment ledger table + action buttons
- **Two-tab pages** (`/expenses`) — tab switcher between related sub-views

## Business Rules

- **Currency:** INR (Rs.) with Indian number formatting
- **GST:** 18%, optional per booking (`gst_applicable` field). Calculated as `Math.round(baseAmount * 18 / 100)`
- **Workspace capacity:** 10 seats (configurable in Settings). Dashboard occupancy = SUM(seats) from active bookings
- **Credit balance:** When total paid exceeds total due, excess shows as credit on client. Display-only, not auto-applied
- **Receipt:** Must match `docs/receipt-reference.html` styling exactly — blue gradient header, layout, terms & conditions word-for-word
- **Brand colour:** Primary blue `#1E5184`

## Module Notes

- **Clients** don't store package/rate/seats — those belong to bookings
- **Bookings** hold rate, seats, package type, GST flag. Status: Active/Completed/Cancelled. Booking list shows computed Due/Paid/Balance columns. Detail page has "Mark Completed" and "Cancel Booking" actions
- **Booking Extras** — per-booking extra charges (tea, printouts, courier) tracked in `booking_extras` table with `is_paid` flag
- **Expenses** page has two tabs: one-off expenses and recurring expense management
- **Deposits** — security deposit tracking with Held/Refunded status and refund tracking fields
- **Enquiries** — lead tracking pipeline (New → Contacted → Follow-up → Converted/Lost) with follow-up dates
- **Renewals** (WebbyWonder) — domain/hosting renewal tracking. Each renewal has a `services` field (Domain, Hosting, Domain + Hosting, etc.), `client_rate` vs `your_cost` for margin visibility, and a separate `renewal_payments` ledger. Payment logging auto-advances `renewal_date` by 1 year. Statuses: Active/Discontinued/Managed by Other. Only Active renewals show payment status badges
- **Dashboard** computes outstanding dues dynamically from bookings (rate × months - paid), not from payment rows. Also shows upcoming/overdue renewal alerts
- **Settings** page manages business details stored in the `settings` table as key-value pairs
