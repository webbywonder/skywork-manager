# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SkyWork Manager - a local-only workspace management system for SkyWork Borivali co-working space. Single user, no authentication, runs on localhost.

Read `docs/PRD.md` for full product requirements. Read `docs/receipt-reference.html` for the receipt styling reference.

## Commands

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build (includes TypeScript type checking)
npm run lint     # ESLint
```

No test framework is configured yet. Verify changes via `npm run build` (catches type errors) and manual Playwright browser testing.

## Tech Stack

- **Next.js 16** (App Router, Turbopack) with **React 19** and **TypeScript**
- **SQLite** via better-sqlite3 (raw SQL, no ORM)
- **Tailwind CSS v4** (utility classes only)

## Architecture

### Data Flow

All pages are `'use client'` components that fetch data from API routes via `fetch()`. There are no React Server Components fetching data directly.

```
Page Component (client) → fetch('/api/...') → Route Handler → better-sqlite3 → SQLite
```

### API Route Pattern

Route handlers live in `src/app/api/[module]/route.ts` (GET, POST) and `src/app/api/[module]/[id]/route.ts` (GET, PUT, DELETE). All return `{ success: boolean, data?: T, error?: string }`.

Next.js 16 route params are async: `const { id } = await context.params`.

### Database

- **File:** `data/skywork.db` (auto-created on first run, gitignored)
- **Schema:** `src/lib/schema.sql` — executed on every `getDb()` call (uses `CREATE TABLE IF NOT EXISTS`)
- **Connection:** `src/lib/db.ts` — singleton pattern via `getDb()`
- **Amounts in paise:** All monetary values stored as integers (Rs. 5,000 = 500000). Use `toPaise()` when writing, `toRupees()`/`formatCurrency()` when reading.
- **Dates as ISO strings:** Stored as `TEXT` in YYYY-MM-DD format
- **Display IDs:** Client `SW-NN`, Booking `SW-YYMMDD-NN`, Receipt `SW-YYMMDD-NN` — generated in app code, stored as strings

### Payment Model (Ledger-Based)

Payments are a **simple ledger** — each entry is a standalone record of money received. No updating existing entries.

- **"Log Payment"** always creates a new row in the `payments` table
- Each payment stores: `amount_paid`, `payment_date`, `payment_method`, `payment_type` (advance/adhoc/scheduled_due)
- **Total Due** is computed dynamically from the booking, NOT from payment rows:
  - One-off: `rate × seats + GST`
  - Recurring: `rate × seats + GST × months_elapsed`
- **Balance** = computed total due - SUM(amount_paid from all payment entries)
- The `amount_due` field on payment rows is only used for legacy scheduled_due entries

### Key Helpers (`src/lib/utils.ts`)

- `formatCurrency(paise)` → `"Rs. 5,000"` (Indian number formatting with lakhs/crores)
- `toPaise(rupees)` / `toRupees(paise)` — conversion between storage and display
- `formatDate(isoString)` → `"26 Feb 2026"`
- `generateClientId()`, `generateBookingId()`, `generateReceiptNumber()`

### UI Components

- `src/components/ui/Modal.tsx` — used for all create/edit forms
- `src/components/ui/ConfirmDialog.tsx` — used for all destructive actions (delete, cancel)
- `src/components/ui/Badge.tsx` — status badges (green/yellow/red/gray)
- `src/components/ui/Toast.tsx` — success/error notifications via `useToast()` hook
- `src/components/forms/` — one form component per module (ClientForm, BookingForm, PaymentForm, etc.)

## Business Rules

- **Currency:** INR (Rs.) with Indian number formatting
- **GST:** 18%, optional per booking (`gst_applicable` field). Calculated as `Math.round(baseAmount * 18 / 100)`
- **Workspace capacity:** 13 seats (9 open + 4 cabin). Dashboard occupancy = SUM(seats) from active bookings
- **Credit balance:** When total paid exceeds total due, excess shows as credit on client. Display-only, not auto-applied.
- **Receipt:** Must match `docs/receipt-reference.html` styling exactly — blue gradient header, layout, terms & conditions word-for-word
- **Brand colour:** Primary blue `#1E5184`

## Module Notes

- **Clients** don't store package/rate/seats — those belong to bookings
- **Bookings** hold the rate, seats, package type, and GST flag
- **Expenses** page has two tabs: one-off expenses and recurring expense management
- **Dashboard** computes outstanding dues dynamically from bookings (rate × months - paid), not from payment rows
- **Settings** page manages business details stored in the `settings` table as key-value pairs
