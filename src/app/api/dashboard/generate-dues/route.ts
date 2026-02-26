import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

/**
 * POST /api/dashboard/generate-dues
 * Marks overdue bookings where payment is behind schedule.
 * No longer creates scheduled_due payment rows - dues are computed dynamically.
 */
export async function POST() {
  try {
    const db = getDb()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Mark overdue: pending scheduled_due payments older than 7 days
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const overdueDate = sevenDaysAgo.toISOString().split('T')[0]

    const result = db.prepare(`
      UPDATE payments SET status = 'Overdue'
      WHERE status = 'Pending'
        AND billing_period_start IS NOT NULL
        AND billing_period_start < ?
    `).run(overdueDate)

    return NextResponse.json({
      success: true,
      data: {
        generated: 0,
        overdueMarked: result.changes,
        message: result.changes > 0
          ? `${result.changes} payment(s) marked as overdue`
          : 'All dues are up to date',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process dues'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
