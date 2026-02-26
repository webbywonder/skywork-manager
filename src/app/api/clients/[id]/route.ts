import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { toPaise } from '@/lib/utils'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/clients/[id] - Get a single client by ID.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const db = getDb()
    const { id } = await context.params
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(parseInt(id, 10))

    if (!client) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: client })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch client'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

/**
 * PUT /api/clients/[id] - Update a client.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const db = getDb()
    const { id } = await context.params
    const clientId = parseInt(id, 10)
    const body = await request.json()

    const existing = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId)
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 })
    }

    const { name, company_name, phone, email, documents, package_type, seats, rate, join_date, status, notes } = body

    if (!name || !phone || !package_type || !rate || !join_date) {
      return NextResponse.json(
        { success: false, error: 'Name, phone, package type, rate, and join date are required' },
        { status: 400 }
      )
    }

    const rateInPaise = toPaise(parseFloat(rate))

    db.prepare(`
      UPDATE clients SET
        name = ?, company_name = ?, phone = ?, email = ?, documents = ?,
        package_type = ?, seats = ?, rate = ?, join_date = ?, status = ?, notes = ?
      WHERE id = ?
    `).run(
      name,
      company_name || null,
      phone,
      email || null,
      documents || null,
      package_type,
      parseInt(seats, 10) || 1,
      rateInPaise,
      join_date,
      status || 'Active',
      notes || null,
      clientId
    )

    const updated = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId)
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update client'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
