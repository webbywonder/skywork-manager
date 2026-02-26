import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * DELETE /api/expenses/[id] - Delete an expense.
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const db = getDb()
    const { id } = await context.params
    const expenseId = parseInt(id, 10)

    const existing = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expenseId)
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Expense not found' }, { status: 404 })
    }

    db.prepare('DELETE FROM expenses WHERE id = ?').run(expenseId)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete expense'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
