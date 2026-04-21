import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/bookings/[id] - Get booking with payment history.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const db = getDb()
    const { id } = await context.params
    const bookingId = parseInt(id, 10)

    const booking = db.prepare(`
      SELECT b.*, c.name as client_name, c.client_id as client_client_id,
             c.phone as client_phone, c.email as client_email, c.company_name as client_company
      FROM bookings b
      LEFT JOIN clients c ON b.client_id = c.id
      WHERE b.id = ?
    `).get(bookingId)

    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 })
    }

    const payments = db.prepare(
      `SELECT * FROM payments WHERE booking_id = ? ORDER BY created_at DESC`
    ).all(bookingId)

    const extras = db.prepare(
      'SELECT * FROM booking_extras WHERE booking_id = ? ORDER BY date DESC, created_at DESC'
    ).all(bookingId)

    const revisions = db.prepare(
      'SELECT * FROM booking_revisions WHERE booking_id = ? ORDER BY changed_at DESC'
    ).all(bookingId)

    return NextResponse.json({ success: true, data: { ...booking, payments, extras, revisions } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch booking'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

/**
 * PUT /api/bookings/[id] - Update booking details.
 * Accepts any combination of: status, notes, package, type, seats, rate,
 * start_date, end_date, days, gst_applicable.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const db = getDb()
    const { id } = await context.params
    const bookingId = parseInt(id, 10)
    const body = await request.json()

    const existing = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId)
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 })
    }

    const fields: string[] = []
    const values: (string | number | null)[] = []

    const allowedFields: Record<string, 'string' | 'number' | 'nullable_string'> = {
      status: 'string',
      completed_date: 'nullable_string',
      notes: 'nullable_string',
      package: 'string',
      type: 'string',
      seats: 'number',
      rate: 'number',
      start_date: 'string',
      end_date: 'nullable_string',
      days: 'number',
      gst_applicable: 'number',
      billing_cycle: 'string',
    }

    // Billing cycle can be corrected at most once after creation. If the client
    // is trying to change it, enforce the cap using the revisions ledger.
    if (body.billing_cycle !== undefined) {
      const next = body.billing_cycle
      if (next !== 'calendar' && next !== 'anniversary') {
        return NextResponse.json(
          { success: false, error: 'Invalid billing_cycle value' },
          { status: 400 }
        )
      }
      const current = (existing as { billing_cycle?: string }).billing_cycle ?? 'calendar'
      if (next !== current) {
        const priorRow = db.prepare(
          "SELECT COUNT(*) as cnt FROM booking_revisions WHERE booking_id = ? AND field_name = 'billing_cycle'"
        ).get(bookingId) as { cnt: number }
        if (priorRow.cnt >= 1) {
          return NextResponse.json(
            { success: false, error: 'Billing cycle can only be corrected once' },
            { status: 400 }
          )
        }
      }
    }

    for (const [field, fieldType] of Object.entries(allowedFields)) {
      if (body[field] !== undefined) {
        fields.push(`${field} = ?`)
        if (fieldType === 'number') {
          values.push(Number(body[field]))
        } else if (fieldType === 'nullable_string') {
          values.push(body[field] || null)
        } else {
          values.push(body[field])
        }
      }
    }

    if (fields.length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 })
    }

    // Log revisions for tracked fields before updating
    const trackedFields = ['rate', 'seats', 'gst_applicable', 'package', 'billing_cycle'] as const
    const existingRecord = existing as Record<string, unknown>
    const insertRevision = db.prepare(
      'INSERT INTO booking_revisions (booking_id, field_name, old_value, new_value) VALUES (?, ?, ?, ?)'
    )
    for (const field of trackedFields) {
      if (body[field] !== undefined) {
        const oldVal = String(existingRecord[field] ?? '')
        const newVal = String(field === 'rate' || field === 'seats' || field === 'gst_applicable'
          ? Number(body[field])
          : body[field])
        if (oldVal !== newVal) {
          insertRevision.run(bookingId, field, oldVal, newVal)
        }
      }
    }

    values.push(bookingId)
    db.prepare(`UPDATE bookings SET ${fields.join(', ')} WHERE id = ?`).run(...values)

    const updated = db.prepare(`
      SELECT b.*, c.name as client_name, c.client_id as client_client_id
      FROM bookings b LEFT JOIN clients c ON b.client_id = c.id
      WHERE b.id = ?
    `).get(bookingId)

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update booking'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

/**
 * DELETE /api/bookings/[id] - Delete a booking and all associated extras and payments.
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const db = getDb()
    const { id } = await context.params
    const bookingId = parseInt(id, 10)

    const existing = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId)
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 })
    }

    // Reverse credit balance from overpayments, then delete payments and booking
    const deleteAll = db.transaction(() => {
      const payments = db.prepare(
        'SELECT amount_due, amount_paid FROM payments WHERE booking_id = ?'
      ).all(bookingId) as { amount_due: number; amount_paid: number }[]

      const booking = db.prepare(
        'SELECT client_id FROM bookings WHERE id = ?'
      ).get(bookingId) as { client_id: number | null }

      if (booking?.client_id) {
        let totalExcess = 0
        for (const p of payments) {
          if (p.amount_paid > p.amount_due) {
            totalExcess += p.amount_paid - p.amount_due
          }
        }
        if (totalExcess > 0) {
          db.prepare(
            'UPDATE clients SET credit_balance = MAX(0, credit_balance - ?) WHERE id = ?'
          ).run(totalExcess, booking.client_id)
        }
      }

      db.prepare('DELETE FROM booking_extras WHERE booking_id = ?').run(bookingId)
      db.prepare('DELETE FROM payments WHERE booking_id = ?').run(bookingId)
      db.prepare('DELETE FROM bookings WHERE id = ?').run(bookingId)
    })
    deleteAll()

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete booking'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
