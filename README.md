# SkyWork Manager

A personal business assistant for managing day-to-day operations across two verticals:

1. **SkyWork Borivali** — Co-working space management (clients, bookings, payments, expenses)
2. **WebbyWonder** — Web development & consulting business (domain/hosting renewals, future modules)

Single user, no authentication — local-only system running on localhost. The goal is to progressively replace manual tracking with purpose-built modules that automate reminders, calculations, and record-keeping.

## Tech Stack

- **Next.js 16** (App Router, Turbopack) with React 19 and TypeScript
- **SQLite** via better-sqlite3 (raw SQL, no ORM)
- **Tailwind CSS v4**

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:8000](http://localhost:8000). The database is auto-created on first run at `data/skywork.db`.

To seed initial renewal data:
```bash
npx tsx src/scripts/seed-renewals.ts
```

## Modules

### SkyWork (Co-working Space)

- **Dashboard** — Revenue, outstanding dues, occupancy, expenses, profit/loss, upcoming renewals at a glance
- **Enquiries** — Lead tracking with follow-up scheduling and status pipeline (New → Contacted → Follow-up → Converted/Lost)
- **Clients** — Client registry with contact info, join date, and credit balance tracking
- **Bookings** — One-off and recurring bookings with seat allocation, rate, and optional 18% GST
  - Prorated first-month billing for mid-month starts (rate/30 × days remaining)
  - **Extras** — Log per-booking extra charges (tea, printouts, courier) with paid/unpaid tracking
  - Status management (Active → Completed / Cancelled)
  - Due/Paid/Balance visible on both list and detail pages
- **Payments** — Ledger-based payment tracking per booking with receipt generation
- **Deposits** — Security deposit management with refund tracking
- **Expenses** — One-off expense logging and recurring expense management
- **Receipts** — Printable receipts matching SkyWork branding (blue gradient header, terms & conditions)
- **Settings** — Business details stored as key-value pairs

### WebbyWonder (Web Development Business)

- **Renewals** — Track domain, hosting, email, SMS, and WhatsApp service renewals for clients
  - Per-client cost vs rate for margin visibility
  - Yearly payment ledger with auto-advance of renewal dates
  - Dashboard alerts for upcoming (30 days) and overdue renewals
  - Statuses: Active / Discontinued / Managed by Other
  - Search and filter by service type

## Business Rules

- **Currency:** INR (Rs.) with Indian number formatting (lakhs/crores)
- **GST:** 18%, optional per booking
- **Workspace capacity:** 13 seats (9 open + 4 cabin)
- **Amounts stored in paise:** Rs. 5,000 = 500000 in the database
- **Dates as ISO strings:** YYYY-MM-DD format
- **Brand colour:** `#1E5184`

## Scripts

```bash
npm run dev      # Development server (port 8000)
npm run build    # Production build (includes TypeScript type checking)
npm run start    # Production server
npm run lint     # ESLint
```
