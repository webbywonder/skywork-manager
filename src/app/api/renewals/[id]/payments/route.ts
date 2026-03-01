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
 * After logging, auto-advances renewal_date by 1 year if payment covers current renewal year.
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
