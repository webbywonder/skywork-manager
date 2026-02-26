import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

interface SummaryRow {
  total: number
}

/**
 * GET /api/dashboard - Get dashboard summary data.
 * Returns revenue, outstanding, occupancy, expenses, deposits.
 */
export async function GET() {
  try {
    const db = getDb()
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const lastMonth = now.getMonth() === 0
      ? `${now.getFullYear() - 1}-12`
      : `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`

    // Revenue this month (sum of amount_paid where payment_date is current month)
    const revenueThisMonth = db.prepare(
      `SELECT COALESCE(SUM(amount_paid), 0) as total FROM payments WHERE payment_date LIKE ?`
    ).get(`${currentMonth}%`) as SummaryRow

    // Revenue last month
    const revenueLastMonth = db.prepare(
      `SELECT COALESCE(SUM(amount_paid), 0) as total FROM payments WHERE payment_date LIKE ?`
    ).get(`${lastMonth}%`) as SummaryRow

    // Outstanding dues: computed from bookings (due - paid)
    // For recurring: monthly_due × months_elapsed - total_paid
    // For one-off: single_due - total_paid
    interface BookingRow {
      id: number
      booking_id: string
      type: string
      rate: number
      seats: number
      gst_applicable: number
      start_date: string
      client_name: string | null
      client_display_id: string | null
    }

    const activeBookings = db.prepare(`
      SELECT b.id, b.booking_id, b.type, b.rate, b.seats, b.gst_applicable, b.start_date,
             c.name as client_name, c.client_id as client_display_id
      FROM bookings b
      LEFT JOIN clients c ON b.client_id = c.id
      WHERE b.status = 'Active'
    `).all() as BookingRow[]

    let outstandingTotal = 0
    const overdueList: { booking_id: string; client_name: string | null; client_display_id: string | null; balance: number }[] = []

    for (const b of activeBookings) {
      const baseMonthly = b.rate * b.seats
      const gstMonthly = b.gst_applicable ? Math.round(baseMonthly * 18 / 100) : 0
      const monthlyDue = baseMonthly + gstMonthly

      let totalDue = monthlyDue
      if (b.type === 'recurring') {
        const start = new Date(b.start_date)
        const monthsElapsed = (now.getFullYear() - start.getFullYear()) * 12
          + (now.getMonth() - start.getMonth()) + 1
        totalDue = monthlyDue * Math.max(1, monthsElapsed)
      }

      const paidRow = db.prepare(
        'SELECT COALESCE(SUM(amount_paid), 0) as total FROM payments WHERE booking_id = ?'
      ).get(b.id) as SummaryRow

      const balance = totalDue - paidRow.total
      if (balance > 0) {
        outstandingTotal += balance
        overdueList.push({
          booking_id: b.booking_id,
          client_name: b.client_name,
          client_display_id: b.client_display_id,
          balance,
        })
      }
    }

    const overduePayments = overdueList

    // Active seats (sum of seats from active bookings)
    const occupancy = db.prepare(
      `SELECT COALESCE(SUM(seats), 0) as total FROM bookings WHERE status = 'Active'`
    ).get() as SummaryRow

    // Expenses this month
    const expensesThisMonth = db.prepare(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date LIKE ?`
    ).get(`${currentMonth}%`) as SummaryRow

    // Deposits held
    const depositsHeld = db.prepare(
      `SELECT COALESCE(SUM(amount), 0) as total FROM deposits WHERE status = 'Held'`
    ).get() as SummaryRow

    // Active clients count
    const activeClients = db.prepare(
      `SELECT COUNT(*) as total FROM clients WHERE status = 'Active'`
    ).get() as SummaryRow

    // Pending follow-ups
    const pendingFollowUps = db.prepare(
      `SELECT COUNT(*) as total FROM enquiries WHERE status IN ('New', 'Contacted', 'Follow-up') AND follow_up_date <= date('now', '+7 days')`
    ).get() as SummaryRow

    return NextResponse.json({
      success: true,
      data: {
        revenue: {
          thisMonth: revenueThisMonth.total,
          lastMonth: revenueLastMonth.total,
        },
        outstanding: outstandingTotal,
        overduePayments,
        occupancy: {
          filled: occupancy.total,
          total: 13,
        },
        expenses: expensesThisMonth.total,
        depositsHeld: depositsHeld.total,
        activeClients: activeClients.total,
        pendingFollowUps: pendingFollowUps.total,
        profitLoss: revenueThisMonth.total - expensesThisMonth.total,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load dashboard'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
