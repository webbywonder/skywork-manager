import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { generateClientId } from '@/lib/utils'

/**
 * GET /api/clients - List all clients with optional filters.
 * Query params: status, search, page, limit
 */
export async function GET(request: NextRequest) {
  try {
    const db = getDb()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = (page - 1) * limit

    let where = 'WHERE 1=1'
    const params: (string | number)[] = []

    if (status && status !== 'all') {
      where += ' AND status = ?'
      params.push(status)
    }

    if (search) {
      where += ' AND (name LIKE ? OR client_id LIKE ? OR phone LIKE ? OR company_name LIKE ?)'
      const term = `%${search}%`
      params.push(term, term, term, term)
    }

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM clients ${where}`).get(...params) as { total: number }
    const clients = db.prepare(
      `SELECT * FROM clients ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset)

    return NextResponse.json({
      success: true,
      data: clients,
      meta: { total: countRow.total, page, limit },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch clients'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

/**
 * POST /api/clients - Create a new client.
 */
export async function POST(request: NextRequest) {
  try {
    const db = getDb()
    const body = await request.json()

    const { name, company_name, phone, email, documents, join_date, notes } = body

    if (!name || !phone || !join_date) {
      return NextResponse.json(
        { success: false, error: 'Name, phone, and join date are required' },
        { status: 400 }
      )
    }

    const lastClient = db.prepare(
      `SELECT MAX(CAST(REPLACE(client_id, 'SW-', '') AS INTEGER)) as last_num FROM clients`
    ).get() as { last_num: number | null }

    const clientId = generateClientId(lastClient.last_num || 0)

    const result = db.prepare(`
      INSERT INTO clients (client_id, name, company_name, phone, email, documents, package_type, seats, rate, join_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, 'Monthly', 1, 0, ?, ?)
    `).run(
      clientId,
      name,
      company_name || null,
      phone,
      email || null,
      documents || null,
      join_date,
      notes || null
    )

    const created = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid)

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create client'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
