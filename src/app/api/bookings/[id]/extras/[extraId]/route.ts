import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

type Context = { params: Promise<{ id: string; extraId: string }> }

/**
 * PUT /api/bookings/[id]/extras/[extraId] - Toggle is_paid status of an extra.
 */
export async function PUT(_request: NextRequest, context: Context) {
  try {
    const db = getDb()
    const { id, extraId } = await context.params

    const existing = db.prepare(
      'SELECT * FROM booking_extras WHERE id = ? AND booking_id = ?'
    ).get(extraId, id) as { is_paid: number } | undefined

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Extra not found' }, { status: 404 })
    }

    const newStatus = existing.is_paid === 0 ? 1 : 0
    db.prepare('UPDATE booking_extras SET is_paid = ? WHERE id = ?').run(newStatus, extraId)

    const updated = db.prepare('SELECT * FROM booking_extras WHERE id = ?').get(extraId)
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update extra'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

/**
 * DELETE /api/bookings/[id]/extras/[extraId] - Delete an extra from a booking.
 */
export async function DELETE(_request: NextRequest, context: Context) {
  try {
    const db = getDb()
    const { id, extraId } = await context.params

    const existing = db.prepare(
      'SELECT * FROM booking_extras WHERE id = ? AND booking_id = ?'
    ).get(extraId, id)

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Extra not found' }, { status: 404 })
    }

    db.prepare('DELETE FROM booking_extras WHERE id = ?').run(extraId)
    return NextResponse.json({ success: true, data: { deleted: true } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete extra'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
