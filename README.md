# SkyWork Manager

A workspace management system for SkyWork Borivali co-working space. Manages clients, bookings, payments, deposits, expenses, and receipts.

## Tech Stack

- **Next.js 16** (App Router) with React 19 and TypeScript
- **SQLite** via better-sqlite3
- **Tailwind CSS v4**

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The database is auto-created on first run at `data/skywork.db`.

## Features

- **Dashboard** — Revenue, outstanding dues, occupancy, expenses, profit/loss at a glance
- **Clients** — Client registry with contact info, join date, and credit balance tracking
- **Bookings** — One-off and recurring bookings with seat allocation, rate, and optional GST
- **Payments** — Ledger-based payment tracking per booking with receipt generation
- **Deposits** — Security deposit management with refund tracking
- **Enquiries** — Lead tracking with follow-up scheduling and status pipeline
- **Expenses** — One-off expense logging and recurring expense management
- **Receipts** — Printable receipts matching SkyWork branding (booking confirmation + payment receipt)
- **Settings** — Business details and configuration

## Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint
```
