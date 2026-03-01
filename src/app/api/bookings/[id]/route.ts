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

    return NextResponse.json({ success: true, data: { ...booking, payments, extras } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch booking'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

/**
 * PUT /api/bookings/[id] - Update booking status.
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

    const { status, notes } = body

    if (status) {
      db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, bookingId)
    }
    if (notes !== undefined) {
      db.prepare('UPDATE bookings SET notes = ? WHERE id = ?').run(notes, bookingId)
    }

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
