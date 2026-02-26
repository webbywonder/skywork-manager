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

    return NextResponse.json({ success: true, data: { ...booking, payments } })
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
