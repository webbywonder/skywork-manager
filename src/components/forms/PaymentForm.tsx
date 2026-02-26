'use client'

import { useState } from 'react'
import type { Payment } from '@/types'
import { toRupees } from '@/lib/utils'

interface PaymentFormProps {
  bookingId: number
  payment?: Payment
  onSubmit: (data: Record<string, string>) => Promise<void>
  onCancel: () => void
}

const PAYMENT_METHODS = ['UPI', 'Cash', 'Bank Transfer', 'GPay'] as const

/**
 * Form for logging or updating a payment.
 */
export default function PaymentForm({ bookingId, payment, onSubmit, onCancel }: PaymentFormProps) {
  const [form, setForm] = useState({
    booking_id: bookingId.toString(),
    payment_type: payment?.payment_type || 'adhoc',
    amount_due: payment ? toRupees(payment.amount_due).toString() : '',
    amount_paid: payment ? toRupees(payment.amount_paid).toString() : '',
    payment_date: payment?.payment_date || new Date().toISOString().split('T')[0],
    payment_method: payment?.payment_method || 'UPI',
    payment_reference: payment?.payment_reference || '',
    notes: payment?.notes || '',
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {!payment && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
            <select
              value={form.payment_type}
              onChange={e => handleChange('payment_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none"
            >
              <option value="advance">Advance</option>
              <option value="adhoc">Ad-hoc</option>
              <option value="scheduled_due">Scheduled Due</option>
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount Due (Rs.)</label>
          <input
            type="number"
            min="0"
            step="1"
            value={form.amount_due}
            onChange={e => handleChange('amount_due', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none"
            readOnly={!!payment}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid (Rs.) *</label>
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
        <div>
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
          {submitting ? 'Saving...' : (payment ? 'Update Payment' : 'Log Payment')}
        </button>
      </div>
    </form>
  )
}
