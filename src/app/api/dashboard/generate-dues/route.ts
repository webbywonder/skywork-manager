import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

interface RecurringBooking {
  id: number
  client_id: number
  rate: number
  join_date: string
  start_date: string
}

/**
 * POST /api/dashboard/generate-dues
 * Auto-generates scheduled due payments for active recurring bookings.
 * Uses the client's join_date as billing anchor.
 */
export async function POST() {
  try {
    const db = getDb()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const recurringBookings = db.prepare(`
      SELECT b.id, b.client_id, b.rate, c.join_date, b.start_date
      FROM bookings b
      JOIN clients c ON b.client_id = c.id
      WHERE b.type = 'recurring' AND b.status = 'Active'
    `).all() as RecurringBooking[]

    let generated = 0

    const insertDue = db.prepare(`
      INSERT INTO payments (booking_id, payment_type, billing_period_start, billing_period_end, amount_due, amount_paid, status)
      VALUES (?, 'scheduled_due', ?, ?, ?, 0, 'Pending')
    `)

    const checkExists = db.prepare(`
      SELECT id FROM payments
      WHERE booking_id = ? AND payment_type = 'scheduled_due'
        AND billing_period_start = ?
    `)

    const generateDues = db.transaction(() => {
      for (const booking of recurringBookings) {
        const joinDay = new Date(booking.join_date).getDate()
        const bookingStart = new Date(booking.start_date)

        // Generate dues from booking start through current month + 1
        const endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0)

        let cycleStart = new Date(bookingStart)
        cycleStart.setDate(joinDay)
        if (cycleStart > bookingStart) {
          cycleStart.setMonth(cycleStart.getMonth() - 1)
        }

        while (cycleStart <= endDate) {
          const cycleEnd = new Date(cycleStart)
          cycleEnd.setMonth(cycleEnd.getMonth() + 1)
          cycleEnd.setDate(cycleEnd.getDate() - 1)

          const periodStart = cycleStart.toISOString().split('T')[0]

          if (cycleStart >= bookingStart || periodStart >= booking.start_date) {
            const existing = checkExists.get(booking.id, periodStart)
            if (!existing) {
              const periodEnd = cycleEnd.toISOString().split('T')[0]
              insertDue.run(booking.id, periodStart, periodEnd, booking.rate)
              generated++
            }
          }

          cycleStart.setMonth(cycleStart.getMonth() + 1)
        }
      }
    })

    generateDues()

    // Mark overdue payments (pending + 7 days past billing_period_start)
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const overdueDate = sevenDaysAgo.toISOString().split('T')[0]

    db.prepare(`
      UPDATE payments SET status = 'Overdue'
      WHERE status = 'Pending'
        AND billing_period_start IS NOT NULL
        AND billing_period_start < ?
    `).run(overdueDate)

    return NextResponse.json({
      success: true,
      data: { generated, message: `${generated} due(s) generated` },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate dues'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
