import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { toPaise } from '@/lib/utils'

/**
 * GET /api/expenses - List expenses with optional filters.
 * Query params: category, month (YYYY-MM)
 */
export async function GET(request: NextRequest) {
  try {
    const db = getDb()
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const month = searchParams.get('month')

    let where = 'WHERE 1=1'
    const params: string[] = []

    if (category && category !== 'all') {
      where += ' AND category = ?'
      params.push(category)
    }
    if (month) {
      where += ' AND date LIKE ?'
      params.push(`${month}%`)
    }

    const expenses = db.prepare(
      `SELECT * FROM expenses ${where} ORDER BY date DESC, created_at DESC`
    ).all(...params)

    return NextResponse.json({ success: true, data: expenses })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch expenses'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

/**
 * POST /api/expenses - Log a one-off expense.
 */
export async function POST(request: NextRequest) {
  try {
    const db = getDb()
    const body = await request.json()
    const { date, category, description, amount, payment_method, notes } = body

    if (!date || !category || !description || !amount) {
      return NextResponse.json(
        { success: false, error: 'Date, category, description, and amount are required' },
        { status: 400 }
      )
    }

    const amountPaise = toPaise(parseFloat(amount))

    const result = db.prepare(`
      INSERT INTO expenses (date, category, description, amount, payment_method, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(date, category, description, amountPaise, payment_method || null, notes || null)

    const created = db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid)
    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create expense'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
