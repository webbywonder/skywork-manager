import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

/**
 * GET /api/enquiries - List enquiries with optional filters.
 * Query params: status, source, search, sort
 */
export async function GET(request: NextRequest) {
  try {
    const db = getDb()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const source = searchParams.get('source')
    const search = searchParams.get('search')
    const sort = searchParams.get('sort')

    let where = 'WHERE 1=1'
    const params: string[] = []

    if (status && status !== 'all') {
      where += ' AND status = ?'
      params.push(status)
    }
    if (source && source !== 'all') {
      where += ' AND source = ?'
      params.push(source)
    }
    if (search) {
      where += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)'
      const term = `%${search}%`
      params.push(term, term, term)
    }

    let orderBy = 'ORDER BY created_at DESC'
    if (sort === 'follow_up') {
      orderBy = 'ORDER BY CASE WHEN follow_up_date IS NULL THEN 1 ELSE 0 END, follow_up_date ASC, created_at DESC'
    }

    const enquiries = db.prepare(
      `SELECT * FROM enquiries ${where} ${orderBy}`
    ).all(...params)

    return NextResponse.json({ success: true, data: enquiries })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch enquiries'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

/**
 * POST /api/enquiries - Create a new enquiry.
 */
export async function POST(request: NextRequest) {
  try {
    const db = getDb()
    const body = await request.json()
    const { date, name, phone, email, source, package_interest, seats, date_requirements, notes, follow_up_date } = body

    if (!name || !phone || !source || !package_interest) {
      return NextResponse.json(
        { success: false, error: 'Name, phone, source, and package interest are required' },
        { status: 400 }
      )
    }

    const result = db.prepare(`
      INSERT INTO enquiries (date, name, phone, email, source, package_interest, seats, date_requirements, notes, follow_up_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      date || new Date().toISOString().split('T')[0],
      name,
      phone,
      email || null,
      source,
      package_interest,
      parseInt(seats, 10) || 1,
      date_requirements || null,
      notes || null,
      follow_up_date || null
    )

    const created = db.prepare('SELECT * FROM enquiries WHERE id = ?').get(result.lastInsertRowid)
    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create enquiry'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
