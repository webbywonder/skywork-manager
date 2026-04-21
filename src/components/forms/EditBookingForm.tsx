'use client'

import { useState } from 'react'

const PACKAGE_TYPES = ['Daily', 'Weekly', '15-Day', 'Monthly', 'Private Cabin', 'Custom'] as const

interface EditBookingFormProps {
  booking: {
    type: string
    package: string
    seats: number
    rate: number
    start_date: string
    end_date: string | null
    days: number | null
    gst_applicable: number
    billing_cycle: 'calendar' | 'anniversary'
    notes: string | null
  }
  /** Whether the billing_cycle has already been corrected once and is now locked. */
  billingCycleLocked?: boolean
  onSubmit: (data: Record<string, string | number | boolean | null>) => Promise<void>
  onCancel: () => void
}

/**
 * Form for editing an existing booking's details.
 * Pre-filled with current values. Rate is in paise (displayed as rupees).
 */
export default function EditBookingForm({ booking, billingCycleLocked = false, onSubmit, onCancel }: EditBookingFormProps) {
  const [form, setForm] = useState({
    type: booking.type,
    package: booking.package,
    seats: booking.seats.toString(),
    rate: (booking.rate / 100).toString(),
    start_date: booking.start_date,
    end_date: booking.end_date || '',
    days: booking.days?.toString() || '',
    gst_applicable: booking.gst_applicable === 1,
    billing_cycle: booking.billing_cycle,
    notes: booking.notes || '',
  })
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (field: string, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload: Record<string, string | number | boolean | null> = {
        type: form.type,
        package: form.package,
        seats: parseInt(form.seats, 10),
        rate: Math.round(parseFloat(form.rate) * 100),
        start_date: form.start_date,
        end_date: form.end_date || null,
        days: form.days ? parseInt(form.days, 10) : null,
        gst_applicable: form.gst_applicable ? 1 : 0,
        notes: form.notes || null,
      }
      if (!billingCycleLocked) {
        payload.billing_cycle = form.billing_cycle
      }
      await onSubmit(payload)
    } finally {
      setSubmitting(false)
    }
  }

  const isRecurring = form.type === 'recurring'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Package *</label>
          <select
            value={form.package}
            onChange={e => handleChange('package', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none"
          >
            {PACKAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            value={form.type}
            onChange={e => handleChange('type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none"
          >
            <option value="one-off">One-off</option>
            <option value="recurring">Recurring</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Seats</label>
          <input
            type="number"
            min="1"
            value={form.seats}
            onChange={e => handleChange('seats', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rate (Rs.) *</label>
          <input
            type="number"
            min="0"
            step="1"
            required
            value={form.rate}
            onChange={e => handleChange('rate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
          <input
            type="date"
            required
            value={form.start_date}
            onChange={e => handleChange('start_date', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none"
          />
        </div>

        {isRecurring && (
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Billing Cycle
              {billingCycleLocked && (
                <span className="ml-2 text-xs font-normal text-gray-500">(already corrected once — locked)</span>
              )}
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="billing_cycle"
                  checked={form.billing_cycle === 'calendar'}
                  onChange={() => handleChange('billing_cycle', 'calendar')}
                  disabled={billingCycleLocked}
                  className="mt-1 text-[#1E5184] disabled:opacity-50"
                />
                <span>
                  <span className="font-medium text-gray-700">One-to-One</span>
                  <span className="block text-xs text-gray-500">Calendar-aligned. First partial month prorated; renews on the 1st.</span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="billing_cycle"
                  checked={form.billing_cycle === 'anniversary'}
                  onChange={() => handleChange('billing_cycle', 'anniversary')}
                  disabled={billingCycleLocked}
                  className="mt-1 text-[#1E5184] disabled:opacity-50"
                />
                <span>
                  <span className="font-medium text-gray-700">Booking-to-Booking</span>
                  <span className="block text-xs text-gray-500">Anniversary-based. Full month charged each period, renews on the start date.</span>
                </span>
              </label>
            </div>
          </div>
        )}

        {!isRecurring && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={form.end_date}
                onChange={e => handleChange('end_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Days</label>
              <input
                type="number"
                min="1"
                value={form.days}
                onChange={e => handleChange('days', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none"
              />
            </div>
          </>
        )}

        <div className="flex items-center gap-2 pt-6">
          <input
            type="checkbox"
            id="edit-gst"
            checked={form.gst_applicable}
            onChange={e => handleChange('gst_applicable', e.target.checked)}
            className="rounded border-gray-300"
          />
          <label htmlFor="edit-gst" className="text-sm font-medium text-gray-700">GST Applicable (18%)</label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          rows={2}
          value={form.notes}
          onChange={e => handleChange('notes', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 text-sm font-medium text-white bg-[#1E5184] rounded-lg hover:bg-[#174068] disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
