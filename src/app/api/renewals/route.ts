import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { toPaise } from '@/lib/utils'

/**
 * GET /api/renewals - List all renewals with optional status filter and current year payment status.
 * Query params: status ('Active' | 'all')
 */
export async function GET(request: NextRequest) {
  try {
    const db = getDb()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const currentYear = new Date().getFullYear()

    let where = ''
    const params: (string | number)[] = [currentYear]

    if (status && status !== 'all') {
      where = 'WHERE r.status = ?'
      params.push(status)
    }

    const renewals = db.prepare(`
      SELECT r.*,
        (SELECT COUNT(*) FROM renewal_payments rp WHERE rp.renewal_id = r.id AND rp.year = ?) as paid_this_year
      FROM renewals r
      ${where}
      ORDER BY r.renewal_date ASC
    `).all(...params)

    return NextResponse.json({ success: true, data: renewals })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch renewals'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

/**
 * POST /api/renewals - Create a new renewal entry.
 */
export async function POST(request: NextRequest) {
  try {
    const db = getDb()
    const body = await request.json()
    const { domain_name, client_name, services, client_rate, your_cost, renewal_date, status, notes } = body

    if (!domain_name || !client_name || !client_rate || !renewal_date) {
      return NextResponse.json(
        { success: false, error: 'Domain name, client name, rate, and renewal date are required' },
        { status: 400 }
      )
    }

    const result = db.prepare(`
      INSERT INTO renewals (domain_name, client_name, services, client_rate, your_cost, renewal_date, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      domain_name,
      client_name,
      services || 'Domain',
      toPaise(parseFloat(client_rate)),
      toPaise(parseFloat(your_cost || '0')),
      renewal_date,
      status || 'Active',
      notes || null
    )

    const created = db.prepare('SELECT * FROM renewals WHERE id = ?').get(result.lastInsertRowid)
    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create renewal'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
