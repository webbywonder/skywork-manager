import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

type Context = { params: Promise<{ id: string; paymentId: string }> }

/**
 * DELETE /api/renewals/[id]/payments/[paymentId] - Delete a renewal payment record.
 */
export async function DELETE(_request: NextRequest, context: Context) {
  try {
    const db = getDb()
    const { id, paymentId } = await context.params

    const existing = db.prepare(
      'SELECT * FROM renewal_payments WHERE id = ? AND renewal_id = ?'
    ).get(paymentId, id)

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 })
    }

    db.prepare('DELETE FROM renewal_payments WHERE id = ?').run(paymentId)
    return NextResponse.json({ success: true, data: { deleted: true } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete payment'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
