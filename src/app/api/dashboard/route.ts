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

    // Outstanding dues (pending + overdue + partial)
    const outstanding = db.prepare(
      `SELECT COALESCE(SUM(amount_due - amount_paid), 0) as total FROM payments WHERE status IN ('Pending', 'Overdue', 'Partial')`
    ).get() as SummaryRow

    // Overdue payments list
    const overduePayments = db.prepare(`
      SELECT p.*, b.booking_id, c.name as client_name, c.client_id as client_display_id
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      LEFT JOIN clients c ON b.client_id = c.id
      WHERE p.status IN ('Overdue', 'Pending', 'Partial')
      ORDER BY p.billing_period_start ASC
      LIMIT 20
    `).all()

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
        outstanding: outstanding.total,
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
