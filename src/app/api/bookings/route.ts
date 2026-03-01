import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { generateBookingId, toPaise, computeRecurringTotalDue } from '@/lib/utils'

/**
 * GET /api/bookings - List bookings with optional filters.
 * Query params: type, status, client_id, search, page, limit
 */
export async function GET(request: NextRequest) {
  try {
    const db = getDb()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const clientId = searchParams.get('client_id')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = (page - 1) * limit

    let where = 'WHERE 1=1'
    const params: (string | number)[] = []

    if (type && type !== 'all') {
      where += ' AND b.type = ?'
      params.push(type)
    }
    if (status && status !== 'all') {
      where += ' AND b.status = ?'
      params.push(status)
    }
    if (clientId) {
      where += ' AND b.client_id = ?'
      params.push(parseInt(clientId, 10))
    }
    if (search) {
      where += ' AND (b.booking_id LIKE ? OR c.name LIKE ? OR b.walk_in_name LIKE ?)'
      const term = `%${search}%`
      params.push(term, term, term)
    }

    const countRow = db.prepare(
      `SELECT COUNT(*) as total FROM bookings b LEFT JOIN clients c ON b.client_id = c.id ${where}`
    ).get(...params) as { total: number }

    interface BookingRow {
      id: number
      type: string
      rate: number
      seats: number
      gst_applicable: number
      start_date: string
    }

    const bookings = db.prepare(`
      SELECT b.*, c.name as client_name, c.client_id as client_client_id
      FROM bookings b
      LEFT JOIN clients c ON b.client_id = c.id
      ${where}
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset) as (BookingRow & Record<string, unknown>)[]

    // Compute total_due and total_paid for each booking
    const bookingsWithDues = bookings.map(b => {
      const baseMonthly = b.rate * b.seats
      const gstMonthly = b.gst_applicable ? Math.round(baseMonthly * 18 / 100) : 0
      const monthlyDue = baseMonthly + gstMonthly

      const totalDue = b.type === 'recurring'
        ? computeRecurringTotalDue(monthlyDue, b.start_date)
        : monthlyDue

      const paidRow = db.prepare(
        'SELECT COALESCE(SUM(amount_paid), 0) as total FROM payments WHERE booking_id = ?'
      ).get(b.id) as { total: number }

      return { ...b, total_due: totalDue, total_paid: paidRow.total }
    })

    return NextResponse.json({
      success: true,
      data: bookingsWithDues,
      meta: { total: countRow.total, page, limit },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch bookings'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

/**
 * POST /api/bookings - Create a new booking.
 */
export async function POST(request: NextRequest) {
  try {
    const db = getDb()
    const body = await request.json()

    const {
      client_id, walk_in_name, walk_in_phone, type, package: pkg,
      seats, rate, start_date, end_date, days, gst_applicable, notes
    } = body

    if (!type || !pkg || !rate || !start_date) {
      return NextResponse.json(
        { success: false, error: 'Type, package, rate, and start date are required' },
        { status: 400 }
      )
    }

    if (!client_id && !walk_in_name) {
      return NextResponse.json(
        { success: false, error: 'Either a client or walk-in name is required' },
        { status: 400 }
      )
    }

    const today = start_date
    const countToday = db.prepare(
      `SELECT COUNT(*) as cnt FROM bookings WHERE booking_id LIKE ?`
    ).get(`SW-${today.slice(2, 4)}${today.slice(5, 7)}${today.slice(8, 10)}-%`) as { cnt: number }

    const bookingId = generateBookingId(start_date, countToday.cnt)
    const rateInPaise = toPaise(parseFloat(rate))

    const result = db.prepare(`
      INSERT INTO bookings (booking_id, client_id, walk_in_name, walk_in_phone, type, package, seats, rate, start_date, end_date, days, gst_applicable, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      bookingId,
      client_id ? parseInt(client_id, 10) : null,
      walk_in_name || null,
      walk_in_phone || null,
      type,
      pkg,
      parseInt(seats, 10) || 1,
      rateInPaise,
      start_date,
      end_date || null,
      days ? parseInt(days, 10) : null,
      gst_applicable ? 1 : 0,
      notes || null
    )

    const created = db.prepare(`
      SELECT b.*, c.name as client_name, c.client_id as client_client_id
      FROM bookings b LEFT JOIN clients c ON b.client_id = c.id
      WHERE b.id = ?
    `).get(result.lastInsertRowid)

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create booking'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
