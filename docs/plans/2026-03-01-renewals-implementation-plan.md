# Renewals Module Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a domain/hosting renewals tracking module under the WebbyWonder business — with renewal date alerts, payment ledger, and cost margin visibility.

**Architecture:** New `/renewals` page (client component) + API routes following the existing pattern (GET/POST on `/api/renewals`, GET/PUT/DELETE on `/api/renewals/[id]`, separate `/api/renewals/[id]/payments` for payment ledger). Two new DB tables (`renewals`, `renewal_payments`). Dashboard gets an "Upcoming Renewals" card. Sidebar gets a new nav item.

**Tech Stack:** Next.js 16 App Router, better-sqlite3, Tailwind CSS v4, TypeScript

---

### Task 1: Database Schema & Types

**Files:**
- Modify: `src/lib/schema.sql` (append new tables + triggers)
- Modify: `src/types/index.ts` (append new interfaces)

**Step 1: Add tables to schema.sql**

Append to end of `src/lib/schema.sql` (before no content, after the last trigger):

```sql
CREATE TABLE IF NOT EXISTS renewals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  services TEXT NOT NULL DEFAULT 'Domain',
  client_rate INTEGER NOT NULL,
  your_cost INTEGER NOT NULL DEFAULT 0,
  renewal_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Discontinued', 'Managed by Other')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS renewal_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  renewal_id INTEGER NOT NULL REFERENCES renewals(id),
  amount_paid INTEGER NOT NULL,
  payment_date TEXT NOT NULL,
  payment_method TEXT CHECK(payment_method IN ('UPI', 'Cash', 'Bank Transfer', 'GPay')),
  year INTEGER NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TRIGGER IF NOT EXISTS update_renewals_timestamp AFTER UPDATE ON renewals
BEGIN UPDATE renewals SET updated_at = datetime('now') WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS update_renewal_payments_timestamp AFTER UPDATE ON renewal_payments
BEGIN UPDATE renewal_payments SET updated_at = datetime('now') WHERE id = NEW.id; END;
```

**Step 2: Add TypeScript types to `src/types/index.ts`**

Append to end of file:

```typescript
export type RenewalStatus = 'Active' | 'Discontinued' | 'Managed by Other'

export interface Renewal {
  id: number
  domain_name: string
  client_name: string
  services: string
  client_rate: number
  your_cost: number
  renewal_date: string
  status: RenewalStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface RenewalPayment {
  id: number
  renewal_id: number
  amount_paid: number
  payment_date: string
  payment_method: PaymentMethod | null
  year: number
  notes: string | null
  created_at: string
  updated_at: string
}
```

**Step 3: Verify build**

Run: `npm run build`
Expected: SUCCESS (no type errors, schema is valid SQL)

**Step 4: Commit**

```bash
git add src/lib/schema.sql src/types/index.ts
git commit -m "feat(renewals): add database schema and TypeScript types"
```

---

### Task 2: API Routes — CRUD for Renewals

**Files:**
- Create: `src/app/api/renewals/route.ts` (GET list, POST create)
- Create: `src/app/api/renewals/[id]/route.ts` (GET one, PUT update, DELETE)

**Step 1: Create `src/app/api/renewals/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { toPaise } from '@/lib/utils'

/**
 * GET /api/renewals - List all renewals with optional status filter.
 * Query params: status ('Active' | 'all')
 */
export async function GET(request: NextRequest) {
  try {
    const db = getDb()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = 'SELECT * FROM renewals'
    const params: string[] = []

    if (status && status !== 'all') {
      query += ' WHERE status = ?'
      params.push(status)
    }

    query += ' ORDER BY renewal_date ASC'

    const renewals = db.prepare(query).all(...params)
    return NextResponse.json({ success: true, data: renewals })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch renewals'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

/**
 * POST /api/renewals - Create a new renewal entry.
 */
export async function POST(request: NextRequest) {
  try {
    const db = getDb()
    const body = await request.json()
    const { domain_name, client_name, services, client_rate, your_cost, renewal_date, status, notes } = body

    if (!domain_name || !client_name || !client_rate || !renewal_date) {
      return NextResponse.json(
        { success: false, error: 'Domain name, client name, rate, and renewal date are required' },
        { status: 400 }
      )
    }

    const result = db.prepare(`
      INSERT INTO renewals (domain_name, client_name, services, client_rate, your_cost, renewal_date, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      domain_name,
      client_name,
      services || 'Domain',
      toPaise(parseFloat(client_rate)),
      toPaise(parseFloat(your_cost || '0')),
      renewal_date,
      status || 'Active',
      notes || null
    )

    const created = db.prepare('SELECT * FROM renewals WHERE id = ?').get(result.lastInsertRowid)
    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create renewal'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
```

**Step 2: Create `src/app/api/renewals/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { toPaise } from '@/lib/utils'

type Context = { params: Promise<{ id: string }> }

/**
 * GET /api/renewals/[id] - Get a single renewal with its payment history.
 */
export async function GET(_request: NextRequest, context: Context) {
  try {
    const db = getDb()
    const { id } = await context.params

    const renewal = db.prepare('SELECT * FROM renewals WHERE id = ?').get(id)
    if (!renewal) {
      return NextResponse.json({ success: false, error: 'Renewal not found' }, { status: 404 })
    }

    const payments = db.prepare(
      'SELECT * FROM renewal_payments WHERE renewal_id = ? ORDER BY year DESC, payment_date DESC'
    ).all(id)

    return NextResponse.json({ success: true, data: { ...renewal, payments } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch renewal'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

/**
 * PUT /api/renewals/[id] - Update a renewal.
 */
export async function PUT(request: NextRequest, context: Context) {
  try {
    const db = getDb()
    const { id } = await context.params
    const body = await request.json()
    const { domain_name, client_name, services, client_rate, your_cost, renewal_date, status, notes } = body

    const existing = db.prepare('SELECT * FROM renewals WHERE id = ?').get(id)
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Renewal not found' }, { status: 404 })
    }

    db.prepare(`
      UPDATE renewals SET domain_name = ?, client_name = ?, services = ?, client_rate = ?,
        your_cost = ?, renewal_date = ?, status = ?, notes = ?
      WHERE id = ?
    `).run(
      domain_name, client_name, services,
      toPaise(parseFloat(client_rate)),
      toPaise(parseFloat(your_cost || '0')),
      renewal_date, status, notes || null, id
    )

    const updated = db.prepare('SELECT * FROM renewals WHERE id = ?').get(id)
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update renewal'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

/**
 * DELETE /api/renewals/[id] - Delete a renewal and its payments.
 */
export async function DELETE(_request: NextRequest, context: Context) {
  try {
    const db = getDb()
    const { id } = await context.params

    const existing = db.prepare('SELECT * FROM renewals WHERE id = ?').get(id)
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Renewal not found' }, { status: 404 })
    }

    db.prepare('DELETE FROM renewal_payments WHERE renewal_id = ?').run(id)
    db.prepare('DELETE FROM renewals WHERE id = ?').run(id)

    return NextResponse.json({ success: true, data: { deleted: true } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete renewal'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
```

**Step 3: Verify build**

Run: `npm run build`
Expected: SUCCESS

**Step 4: Commit**

```bash
git add src/app/api/renewals/
git commit -m "feat(renewals): add CRUD API routes for renewals"
```

---

### Task 3: API Routes — Renewal Payments

**Files:**
- Create: `src/app/api/renewals/[id]/payments/route.ts` (GET, POST)

**Step 1: Create `src/app/api/renewals/[id]/payments/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { toPaise } from '@/lib/utils'

type Context = { params: Promise<{ id: string }> }

/**
 * GET /api/renewals/[id]/payments - List payments for a renewal.
 */
export async function GET(_request: NextRequest, context: Context) {
  try {
    const db = getDb()
    const { id } = await context.params

    const payments = db.prepare(
      'SELECT * FROM renewal_payments WHERE renewal_id = ? ORDER BY year DESC, payment_date DESC'
    ).all(id)

    return NextResponse.json({ success: true, data: payments })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch payments'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

/**
 * POST /api/renewals/[id]/payments - Log a payment for a renewal.
 * After logging, auto-advances renewal_date by 1 year if payment is for the current renewal year.
 */
export async function POST(request: NextRequest, context: Context) {
  try {
    const db = getDb()
    const { id } = await context.params
    const body = await request.json()
    const { amount_paid, payment_date, payment_method, year, notes } = body

    if (!amount_paid || !payment_date || !year) {
      return NextResponse.json(
        { success: false, error: 'Amount, payment date, and year are required' },
        { status: 400 }
      )
    }

    const renewal = db.prepare('SELECT * FROM renewals WHERE id = ?').get(id) as { renewal_date: string } | undefined
    if (!renewal) {
      return NextResponse.json({ success: false, error: 'Renewal not found' }, { status: 404 })
    }

    const result = db.prepare(`
      INSERT INTO renewal_payments (renewal_id, amount_paid, payment_date, payment_method, year, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      toPaise(parseFloat(amount_paid)),
      payment_date,
      payment_method || null,
      year,
      notes || null
    )

    // Auto-advance renewal_date by 1 year if payment covers the current renewal year
    const renewalYear = new Date(renewal.renewal_date).getFullYear()
    if (parseInt(String(year)) >= renewalYear) {
      const currentDate = new Date(renewal.renewal_date)
      currentDate.setFullYear(currentDate.getFullYear() + 1)
      const newDate = currentDate.toISOString().split('T')[0]
      db.prepare('UPDATE renewals SET renewal_date = ? WHERE id = ?').run(newDate, id)
    }

    const created = db.prepare('SELECT * FROM renewal_payments WHERE id = ?').get(result.lastInsertRowid)
    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to log payment'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: SUCCESS

**Step 3: Commit**

```bash
git add src/app/api/renewals/[id]/payments/
git commit -m "feat(renewals): add payment logging API with auto-advance"
```

---

### Task 4: Sidebar Navigation

**Files:**
- Modify: `src/components/layout/Sidebar.tsx` (add Renewals nav item)

**Step 1: Add nav item**

Add to the `navItems` array in `src/components/layout/Sidebar.tsx`, after the Deposits entry and before Expenses:

```typescript
{ href: '/renewals', label: 'Renewals', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
```

This uses the "refresh/cycle" icon from Heroicons — fitting for renewals.

**Step 2: Verify build**

Run: `npm run build`
Expected: SUCCESS

**Step 3: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat(renewals): add Renewals to sidebar navigation"
```

---

### Task 5: Renewals Page UI

**Files:**
- Create: `src/app/renewals/page.tsx`

This is the largest task. The page follows the same pattern as `src/app/expenses/page.tsx`:
- `'use client'` component
- Fetches from `/api/renewals`
- List view with status badges
- Add/Edit modal for renewals
- Log Payment modal
- Delete with ConfirmDialog
- Summary row with total revenue, cost, margin

**Step 1: Create the renewals page**

Create `src/app/renewals/page.tsx` with the following structure:

```
- State: renewals list, loading, statusFilter, showAddModal, editRenewal, showPaymentModal (with selected renewal), deleteId
- fetchRenewals() — GET /api/renewals?status={filter}
- handleCreate/handleUpdate — POST/PUT /api/renewals
- handleDelete — DELETE /api/renewals/[id]
- handleLogPayment — POST /api/renewals/[id]/payments
- Renewal form: domain_name, client_name, services (dropdown: Domain | Domain + Hosting | Domain + Hosting + Email), client_rate (Rs input), your_cost (Rs input), renewal_date, status, notes
- Payment form: amount_paid (pre-filled with client_rate in rupees), payment_date (today), payment_method, year (current year), notes
- Table columns: Domain, Client, Services, Rate, Cost, Margin, Renewal Date, Status (year payment), Actions (Edit, Log Payment, Delete)
- Summary footer: Total Revenue | Total Cost | Total Margin (only for Active)
- Payment status badge: check if a payment exists in current year for that renewal
```

Key implementation details:
- Use `formatCurrency()` from `@/lib/utils` (takes paise)
- Use `toRupees()` when displaying in inputs
- Use `toPaise()` is NOT needed on client — API handles conversion
- Badge variants: Active=green, Discontinued=gray, Managed by Other=blue
- Payment status: Paid=green, Due=yellow, Overdue=red (renewal_date past + no payment this year)
- Services dropdown options: `['Domain', 'Domain + Hosting', 'Domain + Hosting + Email']`
- Status dropdown: `['Active', 'Discontinued', 'Managed by Other']`

The renewal list GET should also return payment status for the current year. Modify the GET /api/renewals to include a subquery:

```sql
SELECT r.*,
  (SELECT COUNT(*) FROM renewal_payments rp WHERE rp.renewal_id = r.id AND rp.year = ?) as paid_this_year
FROM renewals r
```

Pass current year as parameter.

**Step 2: Verify build**

Run: `npm run build`
Expected: SUCCESS

**Step 3: Manual test via Playwright browser**

- Navigate to http://localhost:8000/renewals
- Verify empty state shows
- Add a renewal (techsolutiongroup.in, Tech Solution Group, Domain, 1000, Active)
- Verify it appears in the list
- Edit it, verify changes save
- Log a payment, verify payment status changes
- Delete it with confirm dialog

**Step 4: Commit**

```bash
git add src/app/renewals/ src/app/api/renewals/route.ts
git commit -m "feat(renewals): add renewals list page with CRUD and payment logging"
```

---

### Task 6: Dashboard Integration

**Files:**
- Modify: `src/app/api/dashboard/route.ts` (add renewals summary to GET response)
- Modify: `src/app/page.tsx` (add Upcoming Renewals card)

**Step 1: Add renewals data to dashboard API**

In `src/app/api/dashboard/route.ts`, add queries after existing summary queries:

```typescript
// Upcoming renewals (due in next 30 days, Active only)
const thirtyDaysFromNow = new Date()
thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0]
const todayStr = new Date().toISOString().split('T')[0]
const currentYear = new Date().getFullYear()

const upcomingRenewals = db.prepare(`
  SELECT r.*,
    (SELECT COUNT(*) FROM renewal_payments rp WHERE rp.renewal_id = r.id AND rp.year = ?) as paid_this_year
  FROM renewals r
  WHERE r.status = 'Active'
    AND r.renewal_date <= ?
    AND r.renewal_date >= ?
  ORDER BY r.renewal_date ASC
`).all(currentYear, thirtyDaysStr, todayStr)

// Overdue renewals (past renewal date, no payment this year, Active only)
const overdueRenewals = db.prepare(`
  SELECT r.*
  FROM renewals r
  WHERE r.status = 'Active'
    AND r.renewal_date < ?
    AND NOT EXISTS (
      SELECT 1 FROM renewal_payments rp WHERE rp.renewal_id = r.id AND rp.year = ?
    )
  ORDER BY r.renewal_date ASC
`).all(todayStr, currentYear)
```

Add to the response object:

```typescript
renewals: {
  upcoming: upcomingRenewals,
  overdue: overdueRenewals,
}
```

**Step 2: Add Upcoming Renewals card to dashboard page**

In `src/app/page.tsx`, add the `renewals` field to `DashboardData` interface, then render a card after the existing cards. Show:
- Count of upcoming (next 30 days) + overdue
- List of domain names with renewal dates
- "View All" link to `/renewals`
- Overdue items shown in red

**Step 3: Verify build**

Run: `npm run build`
Expected: SUCCESS

**Step 4: Commit**

```bash
git add src/app/api/dashboard/route.ts src/app/page.tsx
git commit -m "feat(renewals): add upcoming renewals card to dashboard"
```

---

### Task 7: Seed Data

**Files:**
- Create: `src/scripts/seed-renewals.ts` (one-time script)

**Step 1: Create seed script**

Create a script that inserts the initial renewal data from the design doc. Run via `npx tsx src/scripts/seed-renewals.ts`.

Seed data (all rates in rupees, script converts to paise):

| domain_name | client_name | services | client_rate | your_cost | renewal_date | status | notes |
|---|---|---|---|---|---|---|---|
| techsolutiongroup.in | Tech Solution Group | Domain | 1000 | 0 | TBD | Active | |
| airnet-telecom.com | Airnet Telecom | Domain | 1700 | 0 | TBD | Active | |
| raeisp.com | RAE ISP | Domain + Hosting + Email | 5000 | 0 | TBD | Active | |
| hi5sol | Hi5 Solutions | Domain + Hosting | 3000 | 1000 | TBD | Active | 1000 to valley, 2000 to darshan |
| englishatease.in | English At Ease | Domain | 1000 | 0 | TBD | Discontinued | No longer being renewed |
| leroynetworks.com | Leroy Networks | Domain + Hosting | 2500 | 0 | TBD | Active | |
| grandhomes.in | Grand Homes | Domain + Hosting | 2500 | 0 | TBD | Active | |
| healinggrace.co.in | Healing Grace | Domain + Hosting | 0 | 0 | TBD | Managed by Other | Renewed by friend |
| perfectforwarders | Perfect Forwarders | Domain + Hosting | 2500 | 0 | TBD | Active | |

Note: Renewal dates marked TBD — the user will fill in actual dates via the UI or we can ask during implementation.

**Step 2: Run seed script**

Run: `npx tsx src/scripts/seed-renewals.ts`
Expected: "Seeded 9 renewals"

**Step 3: Verify via browser**

Navigate to http://localhost:8000/renewals — all 9 entries should appear.

**Step 4: Commit**

```bash
git add src/scripts/seed-renewals.ts
git commit -m "feat(renewals): add seed script with initial renewal data"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | DB schema + types | schema.sql, types/index.ts |
| 2 | CRUD API routes | api/renewals/route.ts, api/renewals/[id]/route.ts |
| 3 | Payment API | api/renewals/[id]/payments/route.ts |
| 4 | Sidebar nav | Sidebar.tsx |
| 5 | Renewals page UI | renewals/page.tsx (+ API tweak for paid_this_year) |
| 6 | Dashboard card | dashboard/route.ts, page.tsx |
| 7 | Seed data | scripts/seed-renewals.ts |

**Dependencies:** Task 1 → Tasks 2,3 → Task 5. Task 4 is independent. Task 6 depends on Task 1. Task 7 depends on Tasks 1-3.
