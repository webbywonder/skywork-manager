# Booking Extras Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add per-booking extras tracking (tea, printouts, etc.) with log-and-collect billing on the booking detail page.

**Architecture:** New `booking_extras` table linked to bookings via FK. CRUD API at `/api/bookings/[id]/extras`. New "Extras" section below the Payment Ledger on the booking detail page with inline form modal and summary of unpaid total.

**Tech Stack:** SQLite (better-sqlite3), Next.js App Router API routes, React client components, Tailwind CSS v4.

---

### Task 1: Add `booking_extras` table to schema

**Files:**
- Modify: `src/lib/schema.sql` (append after renewals section, ~line 177)

**Step 1: Add the table and trigger**

Append to `src/lib/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS booking_extras (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL REFERENCES bookings(id),
  description TEXT NOT NULL,
  amount INTEGER NOT NULL,
  date TEXT NOT NULL,
  is_paid INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TRIGGER IF NOT EXISTS update_booking_extras_timestamp AFTER UPDATE ON booking_extras
BEGIN UPDATE booking_extras SET updated_at = datetime('now') WHERE id = NEW.id; END;
```

**Step 2: Verify schema loads**

Run: `npm run build`
Expected: Clean build, no errors. Table auto-created on next `getDb()` call.

**Step 3: Commit**

```bash
git add src/lib/schema.sql
git commit -m "feat(extras): add booking_extras table to schema"
```

---

### Task 2: Add TypeScript type for BookingExtra

**Files:**
- Modify: `src/types/index.ts` (append after `RenewalPayment` interface, ~line 171)

**Step 1: Add the interface**

Append to `src/types/index.ts`:

```typescript
export interface BookingExtra {
  id: number
  booking_id: number
  description: string
  amount: number
  date: string
  is_paid: number
  created_at: string
  updated_at: string
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(extras): add BookingExtra type"
```

---

### Task 3: Create API routes for booking extras

**Files:**
- Create: `src/app/api/bookings/[id]/extras/route.ts` (GET list + POST create)
- Create: `src/app/api/bookings/[id]/extras/[extraId]/route.ts` (PUT toggle paid + DELETE)

**Step 1: Create the list + create route**

Create `src/app/api/bookings/[id]/extras/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { toPaise } from '@/lib/utils'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/bookings/[id]/extras - List extras for a booking.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const db = getDb()
    const { id } = await context.params
    const bookingId = parseInt(id, 10)

    const extras = db.prepare(
      'SELECT * FROM booking_extras WHERE booking_id = ? ORDER BY date DESC, created_at DESC'
    ).all(bookingId)

    return NextResponse.json({ success: true, data: extras })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch extras'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

/**
 * POST /api/bookings/[id]/extras - Add an extra charge to a booking.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const db = getDb()
    const { id } = await context.params
    const bookingId = parseInt(id, 10)
    const body = await request.json()

    const { description, amount, date } = body

    if (!description || !amount || !date) {
      return NextResponse.json(
        { success: false, error: 'Description, amount, and date are required' },
        { status: 400 }
      )
    }

    const booking = db.prepare('SELECT id FROM bookings WHERE id = ?').get(bookingId)
    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 })
    }

    const amountPaise = toPaise(parseFloat(amount))

    const result = db.prepare(
      'INSERT INTO booking_extras (booking_id, description, amount, date) VALUES (?, ?, ?, ?)'
    ).run(bookingId, description.trim(), amountPaise, date)

    const created = db.prepare('SELECT * FROM booking_extras WHERE id = ?').get(result.lastInsertRowid)
    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add extra'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
```

**Step 2: Create the update + delete route**

Create `src/app/api/bookings/[id]/extras/[extraId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

interface RouteContext {
  params: Promise<{ id: string; extraId: string }>
}

/**
 * PUT /api/bookings/[id]/extras/[extraId] - Toggle paid status of an extra.
 */
export async function PUT(_request: NextRequest, context: RouteContext) {
  try {
    const db = getDb()
    const { id, extraId } = await context.params
    const bookingId = parseInt(id, 10)
    const extraIdNum = parseInt(extraId, 10)

    const existing = db.prepare(
      'SELECT * FROM booking_extras WHERE id = ? AND booking_id = ?'
    ).get(extraIdNum, bookingId) as { is_paid: number } | undefined

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Extra not found' }, { status: 404 })
    }

    const newStatus = existing.is_paid ? 0 : 1
    db.prepare('UPDATE booking_extras SET is_paid = ? WHERE id = ?').run(newStatus, extraIdNum)

    const updated = db.prepare('SELECT * FROM booking_extras WHERE id = ?').get(extraIdNum)
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update extra'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

/**
 * DELETE /api/bookings/[id]/extras/[extraId] - Delete an extra.
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const db = getDb()
    const { id, extraId } = await context.params
    const bookingId = parseInt(id, 10)
    const extraIdNum = parseInt(extraId, 10)

    const existing = db.prepare(
      'SELECT id FROM booking_extras WHERE id = ? AND booking_id = ?'
    ).get(extraIdNum, bookingId)

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Extra not found' }, { status: 404 })
    }

    db.prepare('DELETE FROM booking_extras WHERE id = ?').run(extraIdNum)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete extra'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
```

**Step 3: Verify build**

Run: `npm run build`
Expected: PASS, new routes appear in output.

**Step 4: Commit**

```bash
git add src/app/api/bookings/\[id\]/extras/
git commit -m "feat(extras): add CRUD API routes for booking extras"
```

---

### Task 4: Load extras in booking detail API

**Files:**
- Modify: `src/app/api/bookings/[id]/route.ts` (~line 29-33)

**Step 1: Add extras query alongside payments**

In `GET /api/bookings/[id]`, after the payments query (line 29-31), add:

```typescript
    const extras = db.prepare(
      'SELECT * FROM booking_extras WHERE booking_id = ? ORDER BY date DESC, created_at DESC'
    ).all(bookingId)
```

And update the response on line 33 from:
```typescript
    return NextResponse.json({ success: true, data: { ...booking, payments } })
```
to:
```typescript
    return NextResponse.json({ success: true, data: { ...booking, payments, extras } })
```

**Step 2: Also delete extras when deleting a booking**

In `DELETE /api/bookings/[id]`, inside the `deleteAll` transaction (before the payments delete on line 115), add:

```typescript
      db.prepare('DELETE FROM booking_extras WHERE booking_id = ?').run(bookingId)
```

**Step 3: Verify build**

Run: `npm run build`
Expected: PASS

**Step 4: Commit**

```bash
git add src/app/api/bookings/\[id\]/route.ts
git commit -m "feat(extras): include extras in booking detail API and cascade delete"
```

---

### Task 5: Create ExtraForm component

**Files:**
- Create: `src/components/forms/ExtraForm.tsx`

**Step 1: Create the form**

```typescript
'use client'

import { useState } from 'react'
import { todayISO } from '@/lib/utils'

interface ExtraFormProps {
  bookingId: number
  onSubmit: (data: { description: string; amount: string; date: string }) => void
  onCancel: () => void
}

/**
 * Simple form for logging an extra charge against a booking.
 */
export default function ExtraForm({ bookingId: _bookingId, onSubmit, onCancel }: ExtraFormProps) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO())

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ description: description.trim(), amount, date })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="e.g. Tea, Printouts, Courier"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1E5184] focus:border-transparent"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Amount (Rs.)</label>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="0"
          min="1"
          step="1"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1E5184] focus:border-transparent"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1E5184] focus:border-transparent"
          required
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-[#1E5184] rounded-lg hover:bg-[#174068]"
        >
          Add Extra
        </button>
      </div>
    </form>
  )
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/forms/ExtraForm.tsx
git commit -m "feat(extras): add ExtraForm component"
```

---

### Task 6: Add Extras section to booking detail page

**Files:**
- Modify: `src/app/bookings/[id]/page.tsx`

**Step 1: Add imports and state**

Add to imports (after PaymentForm import):
```typescript
import ExtraForm from '@/components/forms/ExtraForm'
import type { BookingExtra } from '@/types'
```

Add `extras` to the `BookingDetail` interface:
```typescript
  extras: BookingExtra[]
```

Add state for the extras modal and delete confirm (after `showDeleteBooking` state):
```typescript
  const [showExtraModal, setShowExtraModal] = useState(false)
  const [deleteExtra, setDeleteExtra] = useState<BookingExtra | null>(null)
```

**Step 2: Add handler functions**

Add after `handleDeleteBooking`:

```typescript
  const handleAddExtra = async (data: { description: string; amount: string; date: string }) => {
    try {
      const res = await fetch(`/api/bookings/${params.id}/extras`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (json.success) {
        showToast('success', 'Extra added')
        setShowExtraModal(false)
        fetchBooking()
      } else {
        showToast('error', json.error || 'Failed to add extra')
      }
    } catch {
      showToast('error', 'Network error: Failed to add extra')
    }
  }

  const handleToggleExtraPaid = async (extra: BookingExtra) => {
    try {
      const res = await fetch(`/api/bookings/${params.id}/extras/${extra.id}`, { method: 'PUT' })
      const json = await res.json()
      if (json.success) {
        showToast('success', extra.is_paid ? 'Marked as unpaid' : 'Marked as paid')
        fetchBooking()
      } else {
        showToast('error', json.error || 'Failed to update extra')
      }
    } catch {
      showToast('error', 'Network error: Failed to update extra')
    }
  }

  const handleDeleteExtra = async () => {
    if (!deleteExtra) return
    try {
      const res = await fetch(`/api/bookings/${params.id}/extras/${deleteExtra.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        showToast('success', 'Extra deleted')
        setDeleteExtra(null)
        fetchBooking()
      } else {
        showToast('error', json.error || 'Failed to delete extra')
      }
    } catch {
      showToast('error', 'Network error: Failed to delete extra')
    }
  }
```

**Step 3: Add Extras section in JSX**

After the Notes section (after `{booking.notes && ...}` block, before the Log Payment Modal), add:

```tsx
      {/* Extras */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Extras</h2>
            {booking.extras.length > 0 && (() => {
              const unpaidTotal = booking.extras
                .filter(e => !e.is_paid)
                .reduce((sum, e) => sum + e.amount, 0)
              return unpaidTotal > 0 ? (
                <p className="text-sm text-red-600 mt-0.5">Unpaid: {formatCurrency(unpaidTotal)}</p>
              ) : null
            })()}
          </div>
          <button
            onClick={() => setShowExtraModal(true)}
            className="px-3 py-1.5 text-sm font-medium text-white bg-[#1E5184] rounded-lg hover:bg-[#174068]"
          >
            + Add Extra
          </button>
        </div>
        {booking.extras.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No extras recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {booking.extras.map(extra => (
                  <tr key={extra.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{extra.description}</td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(extra.amount)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(extra.date)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        extra.is_paid
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {extra.is_paid ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      <button
                        onClick={() => handleToggleExtraPaid(extra)}
                        className="text-[#1E5184] hover:underline text-sm"
                      >
                        {extra.is_paid ? 'Mark Unpaid' : 'Mark Paid'}
                      </button>
                      <button
                        onClick={() => setDeleteExtra(extra)}
                        className="text-red-500 hover:underline text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
```

**Step 4: Add the Extra modal and delete confirm dialog**

After the Delete Booking ConfirmDialog, add:

```tsx
      {/* Add Extra Modal */}
      <Modal isOpen={showExtraModal} onClose={() => setShowExtraModal(false)} title="Add Extra" size="sm">
        <ExtraForm
          bookingId={booking.id}
          onSubmit={handleAddExtra}
          onCancel={() => setShowExtraModal(false)}
        />
      </Modal>

      {/* Delete Extra Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteExtra}
        title="Delete Extra"
        message={`Are you sure you want to delete "${deleteExtra?.description}" (${deleteExtra ? formatCurrency(deleteExtra.amount) : ''})? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteExtra}
        onCancel={() => setDeleteExtra(null)}
      />
```

**Step 5: Verify build**

Run: `npm run build`
Expected: PASS

**Step 6: Commit**

```bash
git add src/app/bookings/\[id\]/page.tsx
git commit -m "feat(extras): add Extras section to booking detail page"
```

---

### Task 7: Manual verification via Playwright

**Step 1: Start dev server and verify**

1. Navigate to a booking detail page (e.g., Paras Kothari's booking)
2. Verify "Extras" section appears below Payment Ledger
3. Click "+ Add Extra" → fill description "Tea", amount "50", date today → submit
4. Verify extra appears in the table with "Unpaid" badge
5. Click "Mark Paid" → verify badge changes to "Paid"
6. Click "Mark Unpaid" → verify badge changes back
7. Click "Delete" → confirm → verify extra is removed
8. Verify "Unpaid: Rs. X" summary shows correctly when unpaid extras exist

**Step 2: Commit any fixes if needed**
