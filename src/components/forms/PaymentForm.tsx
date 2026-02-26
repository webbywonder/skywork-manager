'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'

interface PaymentFormProps {
  bookingId: number
  bookingRate?: number
  bookingSeats?: number
  bookingGst?: boolean
  onSubmit: (data: Record<string, string>) => Promise<void>
  onCancel: () => void
}

const PAYMENT_METHODS = ['UPI', 'Cash', 'Bank Transfer', 'GPay'] as const
const PAYMENT_TYPES = [
  { value: 'advance', label: 'Advance' },
  { value: 'adhoc', label: 'Ad-hoc' },
  { value: 'scheduled_due', label: 'Scheduled Due' },
] as const

/**
 * Form for logging a payment. Each submission creates a new ledger entry.
 * The due amount is computed from the booking and shown as context only.
 */
export default function PaymentForm({
  bookingId, bookingRate, bookingSeats, bookingGst,
  onSubmit, onCancel,
}: PaymentFormProps) {
  const [form, setForm] = useState({
    booking_id: bookingId.toString(),
    payment_type: 'adhoc',
    amount_paid: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'UPI',
    payment_reference: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onSubmit(form)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Booking rate context */}
      {bookingRate && bookingRate > 0 && (
        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
          Booking rate: {formatCurrency(bookingRate)} × {bookingSeats || 1} seat{(bookingSeats || 1) > 1 ? 's' : ''}
          {bookingGst && ' + 18% GST'}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
          <select
            value={form.payment_type}
            onChange={e => handleChange('payment_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none"
          >
            {PAYMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount (Rs.) *</label>
          <input
            type="number"
            min="0"
            step="1"
            required
            value={form.amount_paid}
            onChange={e => handleChange('amount_paid', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
          <input
            type="date"
            value={form.payment_date}
            onChange={e => handleChange('payment_date', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
          <select
            value={form.payment_method}
            onChange={e => handleChange('payment_method', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none"
          >
            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
          <input
            type="text"
            placeholder="Transaction ID or reference"
            value={form.payment_reference}
            onChange={e => handleChange('payment_reference', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none"
          />
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
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-[#1E5184] rounded-lg hover:bg-[#174068] disabled:opacity-50">
          {submitting ? 'Saving...' : 'Log Payment'}
        </button>
      </div>
    </form>
  )
}
