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

    return NextResponse.json({ success: true, data: { ...renewal as Record<string, unknown>, payments } })
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
