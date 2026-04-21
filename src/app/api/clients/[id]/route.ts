import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
// Client fields: name, company_name, phone, email, documents, join_date, status, notes

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

    const { name, company_name, phone, email, documents, join_date, status, notes } = body

    if (!name || !phone || !join_date) {
      return NextResponse.json(
        { success: false, error: 'Name, phone, and join date are required' },
        { status: 400 }
      )
    }

    db.prepare(`
      UPDATE clients SET
        name = ?, company_name = ?, phone = ?, email = ?, documents = ?,
        join_date = ?, status = ?, notes = ?
      WHERE id = ?
    `).run(
      name,
      company_name || null,
      phone,
      email || null,
      documents || null,
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

/**
 * DELETE /api/clients/[id] - Delete a client, only if it has no bookings and no deposits.
 * Returns 409 with a descriptive error if any dependent records exist.
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const db = getDb()
    const { id } = await context.params
    const clientId = parseInt(id, 10)

    const existing = db.prepare('SELECT id FROM clients WHERE id = ?').get(clientId)
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 })
    }

    const bookingCount = (db.prepare(
      'SELECT COUNT(*) as cnt FROM bookings WHERE client_id = ?'
    ).get(clientId) as { cnt: number }).cnt

    const depositCount = (db.prepare(
      'SELECT COUNT(*) as cnt FROM deposits WHERE client_id = ?'
    ).get(clientId) as { cnt: number }).cnt

    if (bookingCount > 0 || depositCount > 0) {
      const parts: string[] = []
      if (bookingCount > 0) parts.push(`${bookingCount} booking${bookingCount === 1 ? '' : 's'}`)
      if (depositCount > 0) parts.push(`${depositCount} deposit${depositCount === 1 ? '' : 's'}`)
      return NextResponse.json(
        { success: false, error: `Cannot delete: client has ${parts.join(' and ')}. Remove them first.` },
        { status: 409 }
      )
    }

    db.prepare('DELETE FROM clients WHERE id = ?').run(clientId)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete client'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
