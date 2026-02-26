import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { toPaise } from '@/lib/utils'

/**
 * GET /api/payments - List payments, optionally filtered by booking_id.
 */
export async function GET(request: NextRequest) {
  try {
    const db = getDb()
    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('booking_id')

    let where = 'WHERE 1=1'
    const params: (string | number)[] = []

    if (bookingId) {
      where += ' AND p.booking_id = ?'
      params.push(parseInt(bookingId, 10))
    }

    const payments = db.prepare(`
      SELECT p.*, b.booking_id as booking_id_display, c.name as client_name
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      LEFT JOIN clients c ON b.client_id = c.id
      ${where}
      ORDER BY p.created_at DESC
    `).all(...params)

    return NextResponse.json({ success: true, data: payments })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch payments'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

/**
 * POST /api/payments - Log a payment against a booking.
 */
export async function POST(request: NextRequest) {
  try {
    const db = getDb()
    const body = await request.json()

    const {
      booking_id, payment_type, billing_period_start, billing_period_end,
      amount_due, amount_paid, payment_date, payment_method, payment_reference, notes
    } = body

    if (!booking_id || !payment_type) {
      return NextResponse.json(
        { success: false, error: 'Booking ID and payment type are required' },
        { status: 400 }
      )
    }

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(parseInt(booking_id, 10))
    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 })
    }

    const amountDuePaise = amount_due ? toPaise(parseFloat(amount_due)) : 0
    const amountPaidPaise = amount_paid ? toPaise(parseFloat(amount_paid)) : 0

    let status = 'Pending'
    if (amountPaidPaise > 0 && amountPaidPaise >= amountDuePaise) {
      status = 'Paid'
    } else if (amountPaidPaise > 0) {
      status = 'Partial'
    }

    const result = db.prepare(`
      INSERT INTO payments (booking_id, payment_type, billing_period_start, billing_period_end, amount_due, amount_paid, payment_date, payment_method, payment_reference, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      parseInt(booking_id, 10),
      payment_type,
      billing_period_start || null,
      billing_period_end || null,
      amountDuePaise,
      amountPaidPaise,
      payment_date || null,
      payment_method || null,
      payment_reference || null,
      status,
      notes || null
    )

    // Update credit balance if overpayment
    if (amountPaidPaise > amountDuePaise) {
      const excess = amountPaidPaise - amountDuePaise
      const bookingRow = booking as { client_id: number | null }
      if (bookingRow.client_id) {
        db.prepare(
          'UPDATE clients SET credit_balance = credit_balance + ? WHERE id = ?'
        ).run(excess, bookingRow.client_id)
      }
    }

    const created = db.prepare('SELECT * FROM payments WHERE id = ?').get(result.lastInsertRowid)
    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create payment'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
