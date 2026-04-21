import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { generateReceiptNumber } from '@/lib/utils'

/**
 * GET /api/receipts?payment_id=N - Get receipt data for a payment.
 * Aggregates payment, booking, and client details for rendering.
 */
export async function GET(request: NextRequest) {
  try {
    const db = getDb()
    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get('payment_id')

    if (!paymentId) {
      return NextResponse.json({ success: false, error: 'payment_id is required' }, { status: 400 })
    }

    const payment = db.prepare(`
      SELECT p.*, b.booking_id, b.type as booking_type, b.package, b.seats,
             b.rate as booking_rate, b.start_date, b.end_date, b.days,
             b.gst_applicable, b.billing_cycle, b.walk_in_name, b.walk_in_phone,
             c.name as client_name, c.company_name, c.phone as client_phone,
             c.email as client_email, c.client_id as client_display_id
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      LEFT JOIN clients c ON b.client_id = c.id
      WHERE p.id = ?
    `).get(parseInt(paymentId, 10))

    if (!payment) {
      return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 })
    }

    const today = new Date().toISOString().split('T')[0]
    const countToday = db.prepare(
      `SELECT COUNT(*) as cnt FROM payments WHERE created_at LIKE ?`
    ).get(`${today}%`) as { total?: number; cnt?: number }
    const receiptNumber = generateReceiptNumber(today, (countToday.cnt || 1) - 1)

    const settings: Record<string, string> = {}
    const settingsRows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>
    for (const row of settingsRows) {
      settings[row.key] = row.value
    }

    return NextResponse.json({
      success: true,
      data: {
        receipt_number: receiptNumber,
        payment,
        settings,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate receipt'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
