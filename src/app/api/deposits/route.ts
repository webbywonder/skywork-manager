import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { toPaise } from '@/lib/utils'

/**
 * GET /api/deposits - List deposits with optional filters.
 * Query params: status, client_id
 */
export async function GET(request: NextRequest) {
  try {
    const db = getDb()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const clientId = searchParams.get('client_id')

    let where = 'WHERE 1=1'
    const params: (string | number)[] = []

    if (status && status !== 'all') {
      where += ' AND d.status = ?'
      params.push(status)
    }
    if (clientId) {
      where += ' AND d.client_id = ?'
      params.push(parseInt(clientId, 10))
    }

    const deposits = db.prepare(`
      SELECT d.*, c.name as client_name, c.client_id as client_client_id
      FROM deposits d
      JOIN clients c ON d.client_id = c.id
      ${where}
      ORDER BY d.created_at DESC
    `).all(...params)

    return NextResponse.json({ success: true, data: deposits })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch deposits'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

/**
 * POST /api/deposits - Log a new deposit.
 */
export async function POST(request: NextRequest) {
  try {
    const db = getDb()
    const body = await request.json()
    const { client_id, amount, received_date, payment_method, payment_reference, notes } = body

    if (!client_id || !amount || !received_date || !payment_method) {
      return NextResponse.json(
        { success: false, error: 'Client, amount, date, and payment method are required' },
        { status: 400 }
      )
    }

    const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(parseInt(client_id, 10))
    if (!client) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 })
    }

    const amountPaise = toPaise(parseFloat(amount))

    const result = db.prepare(`
      INSERT INTO deposits (client_id, amount, received_date, payment_method, payment_reference, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      parseInt(client_id, 10),
      amountPaise,
      received_date,
      payment_method,
      payment_reference || null,
      notes || null
    )

    const created = db.prepare(`
      SELECT d.*, c.name as client_name, c.client_id as client_client_id
      FROM deposits d JOIN clients c ON d.client_id = c.id
      WHERE d.id = ?
    `).get(result.lastInsertRowid)

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create deposit'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
