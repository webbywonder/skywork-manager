# SkyWork Manager

A local-only workspace management system for SkyWork Borivali co-working space. Single user, no authentication — runs on localhost.

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

## Features

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
- **Renewals** — Domain, hosting, and service renewal tracking with payment logging per year
- **Expenses** — One-off expense logging and recurring expense management
- **Receipts** — Printable receipts matching SkyWork branding (blue gradient header, terms & conditions)
- **Settings** — Business details stored as key-value pairs

## Business Rules

- **Currency:** INR (Rs.) with Indian number formatting (lakhs/crores)
- **GST:** 18%, optional per booking
- **Workspace capacity:** 13 seats (9 open + 4 cabin)
- **Amounts stored in paise:** Rs. 5,000 = 500000 in the database
- **Dates as ISO strings:** YYYY-MM-DD format

## Scripts

```bash
npm run dev      # Development server (port 8000)
npm run build    # Production build (includes TypeScript type checking)
npm run start    # Production server
npm run lint     # ESLint
```
