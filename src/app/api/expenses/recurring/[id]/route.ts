import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { toPaise } from '@/lib/utils'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * PUT /api/expenses/recurring/[id] - Update a recurring expense.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const db = getDb()
    const { id } = await context.params
    const recurringId = parseInt(id, 10)

    if (isNaN(recurringId)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 })
    }

    const existing = db.prepare('SELECT * FROM recurring_expenses WHERE id = ?').get(recurringId)
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Recurring expense not found' }, { status: 404 })
    }

    const body = await request.json()
    const { category, description, amount, frequency, next_due_date, status, notes } = body

    if (!category || !description || !amount || !frequency || !next_due_date) {
      return NextResponse.json(
        { success: false, error: 'Category, description, amount, frequency, and next due date are required' },
        { status: 400 }
      )
    }

    const amountPaise = toPaise(parseFloat(amount))

    db.prepare(`
      UPDATE recurring_expenses SET
        category = ?, description = ?, amount = ?, frequency = ?,
        next_due_date = ?, status = ?, notes = ?
      WHERE id = ?
    `).run(
      category,
      description,
      amountPaise,
      frequency,
      next_due_date,
      status || 'Active',
      notes || null,
      recurringId
    )

    const updated = db.prepare('SELECT * FROM recurring_expenses WHERE id = ?').get(recurringId)
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update recurring expense'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

/**
 * DELETE /api/expenses/recurring/[id] - Delete a recurring expense.
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const db = getDb()
    const { id } = await context.params
    const recurringId = parseInt(id, 10)

    if (isNaN(recurringId)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 })
    }

    const existing = db.prepare('SELECT * FROM recurring_expenses WHERE id = ?').get(recurringId)
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Recurring expense not found' }, { status: 404 })
    }

    db.prepare('DELETE FROM recurring_expenses WHERE id = ?').run(recurringId)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete recurring expense'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
