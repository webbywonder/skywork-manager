import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { toPaise } from '@/lib/utils'

/**
 * GET /api/expenses/recurring - List recurring expenses.
 */
export async function GET() {
  try {
    const db = getDb()
    const recurring = db.prepare('SELECT * FROM recurring_expenses ORDER BY next_due_date ASC').all()
    return NextResponse.json({ success: true, data: recurring })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch recurring expenses'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

/**
 * POST /api/expenses/recurring - Create a recurring expense definition.
 */
export async function POST(request: NextRequest) {
  try {
    const db = getDb()
    const body = await request.json()
    const { category, description, amount, frequency, next_due_date, auto_remind, notes } = body

    if (!category || !description || !amount || !frequency || !next_due_date) {
      return NextResponse.json(
        { success: false, error: 'Category, description, amount, frequency, and next due date are required' },
        { status: 400 }
      )
    }

    const amountPaise = toPaise(parseFloat(amount))

    const result = db.prepare(`
      INSERT INTO recurring_expenses (category, description, amount, frequency, next_due_date, auto_remind, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(category, description, amountPaise, frequency, next_due_date, auto_remind ? 1 : 0, notes || null)

    const created = db.prepare('SELECT * FROM recurring_expenses WHERE id = ?').get(result.lastInsertRowid)
    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create recurring expense'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

/**
 * PUT /api/expenses/recurring - Generate expense entries from due recurring expenses.
 */
export async function PUT() {
  try {
    const db = getDb()
    const today = new Date().toISOString().split('T')[0]

    const dueRecurring = db.prepare(
      `SELECT * FROM recurring_expenses WHERE status = 'Active' AND next_due_date <= ?`
    ).all(today) as Array<{
      id: number; category: string; description: string; amount: number;
      frequency: string; next_due_date: string
    }>

    let generated = 0

    const generate = db.transaction(() => {
      for (const rec of dueRecurring) {
        db.prepare(`
          INSERT INTO expenses (recurring_expense_id, date, category, description, amount)
          VALUES (?, ?, ?, ?, ?)
        `).run(rec.id, rec.next_due_date, rec.category, rec.description, rec.amount)

        const nextDate = new Date(rec.next_due_date)
        switch (rec.frequency) {
          case 'Monthly': nextDate.setMonth(nextDate.getMonth() + 1); break
          case 'Quarterly': nextDate.setMonth(nextDate.getMonth() + 3); break
          case 'Half-yearly': nextDate.setMonth(nextDate.getMonth() + 6); break
          case 'Yearly': nextDate.setFullYear(nextDate.getFullYear() + 1); break
        }

        db.prepare('UPDATE recurring_expenses SET next_due_date = ? WHERE id = ?')
          .run(nextDate.toISOString().split('T')[0], rec.id)

        generated++
      }
    })

    generate()
    return NextResponse.json({ success: true, data: { generated } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate expenses'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
