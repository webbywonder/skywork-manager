import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * PUT /api/enquiries/[id] - Update an enquiry (status, follow-up date, etc).
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const db = getDb()
    const { id } = await context.params
    const enquiryId = parseInt(id, 10)
    const body = await request.json()

    const existing = db.prepare('SELECT * FROM enquiries WHERE id = ?').get(enquiryId)
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Enquiry not found' }, { status: 404 })
    }

    const {
      date, name, phone, email, source, package_interest, seats,
      date_requirements, notes, status, follow_up_date
    } = body

    db.prepare(`
      UPDATE enquiries SET
        date = COALESCE(?, date), name = COALESCE(?, name), phone = COALESCE(?, phone),
        email = ?, source = COALESCE(?, source), package_interest = COALESCE(?, package_interest),
        seats = COALESCE(?, seats), date_requirements = ?, notes = ?,
        status = COALESCE(?, status), follow_up_date = ?
      WHERE id = ?
    `).run(
      date, name, phone,
      email !== undefined ? email : null,
      source, package_interest,
      seats ? parseInt(seats, 10) : null,
      date_requirements !== undefined ? date_requirements : null,
      notes !== undefined ? notes : null,
      status, follow_up_date !== undefined ? follow_up_date : null,
      enquiryId
    )

    const updated = db.prepare('SELECT * FROM enquiries WHERE id = ?').get(enquiryId)
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update enquiry'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
