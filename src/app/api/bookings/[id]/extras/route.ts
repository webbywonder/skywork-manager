import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { toPaise } from '@/lib/utils'

type Context = { params: Promise<{ id: string }> }

/**
 * GET /api/bookings/[id]/extras - List extras for a booking.
 */
export async function GET(_request: NextRequest, context: Context) {
  try {
    const db = getDb()
    const { id } = await context.params

    const extras = db.prepare(
      'SELECT * FROM booking_extras WHERE booking_id = ? ORDER BY date DESC, created_at DESC'
    ).all(id)

    return NextResponse.json({ success: true, data: extras })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch extras'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

/**
 * POST /api/bookings/[id]/extras - Add an extra charge to a booking.
 */
export async function POST(request: NextRequest, context: Context) {
  try {
    const db = getDb()
    const { id } = await context.params
    const body = await request.json()
    const { description, amount, date } = body

    if (!description || !amount || !date) {
      return NextResponse.json(
        { success: false, error: 'Description, amount, and date are required' },
        { status: 400 }
      )
    }

    const booking = db.prepare('SELECT id FROM bookings WHERE id = ?').get(id)
    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 })
    }

    const result = db.prepare(`
      INSERT INTO booking_extras (booking_id, description, amount, date)
      VALUES (?, ?, ?, ?)
    `).run(
      id,
      description,
      toPaise(parseFloat(amount)),
      date
    )

    const created = db.prepare('SELECT * FROM booking_extras WHERE id = ?').get(result.lastInsertRowid)
    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add extra'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
