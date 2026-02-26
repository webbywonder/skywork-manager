import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * PUT /api/deposits/[id] - Update deposit (mark as refunded).
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const db = getDb()
    const { id } = await context.params
    const depositId = parseInt(id, 10)
    const body = await request.json()

    const existing = db.prepare('SELECT * FROM deposits WHERE id = ?').get(depositId)
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Deposit not found' }, { status: 404 })
    }

    const { status, refund_date, refund_method, notes } = body

    db.prepare(`
      UPDATE deposits SET status = ?, refund_date = ?, refund_method = ?, notes = ?
      WHERE id = ?
    `).run(
      status || 'Held',
      refund_date || null,
      refund_method || null,
      notes !== undefined ? notes : null,
      depositId
    )

    const updated = db.prepare(`
      SELECT d.*, c.name as client_name, c.client_id as client_client_id
      FROM deposits d JOIN clients c ON d.client_id = c.id
      WHERE d.id = ?
    `).get(depositId)

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update deposit'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
