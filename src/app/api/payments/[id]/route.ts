import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { toPaise } from '@/lib/utils'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * PUT /api/payments/[id] - Update a payment (log received amount, method, etc).
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const db = getDb()
    const { id } = await context.params
    const paymentId = parseInt(id, 10)
    const body = await request.json()

    const existing = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId) as {
      id: number; booking_id: number; amount_due: number; amount_paid: number
    } | undefined

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 })
    }

    const { amount_paid, payment_date, payment_method, payment_reference, notes } = body

    const newAmountPaid = amount_paid !== undefined ? toPaise(parseFloat(amount_paid)) : existing.amount_paid

    let status = 'Pending'
    if (newAmountPaid > 0 && newAmountPaid >= existing.amount_due) {
      status = 'Paid'
    } else if (newAmountPaid > 0) {
      status = 'Partial'
    }

    db.prepare(`
      UPDATE payments SET
        amount_paid = ?, payment_date = ?, payment_method = ?,
        payment_reference = ?, status = ?, notes = ?
      WHERE id = ?
    `).run(
      newAmountPaid,
      payment_date || null,
      payment_method || null,
      payment_reference || null,
      status,
      notes !== undefined ? notes : null,
      paymentId
    )

    // Handle credit balance on overpayment
    if (newAmountPaid > existing.amount_due) {
      const excess = newAmountPaid - existing.amount_due
      const previousExcess = Math.max(0, existing.amount_paid - existing.amount_due)
      const netExcess = excess - previousExcess

      if (netExcess > 0) {
        const booking = db.prepare('SELECT client_id FROM bookings WHERE id = ?').get(existing.booking_id) as { client_id: number | null }
        if (booking?.client_id) {
          db.prepare(
            'UPDATE clients SET credit_balance = credit_balance + ? WHERE id = ?'
          ).run(netExcess, booking.client_id)
        }
      }
    }

    const updated = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId)
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update payment'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
