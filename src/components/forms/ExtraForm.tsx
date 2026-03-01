'use client'

import { useState } from 'react'
import { todayISO } from '@/lib/utils'

interface ExtraFormProps {
  bookingId: number
  onSubmit: (data: { description: string; amount: string; date: string }) => void
  onCancel: () => void
}

/**
 * Form for adding an extra charge (tea, printouts, etc.) to a booking.
 * Amount is entered in rupees and converted to paise server-side.
 */
export default function ExtraForm({ bookingId: _bookingId, onSubmit, onCancel }: ExtraFormProps) {
  const [form, setForm] = useState({
    description: '',
    amount: '',
    date: todayISO(),
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
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
        <input
          type="text"
          required
          placeholder="e.g. Tea, Printouts, Courier"
          value={form.description}
          onChange={e => handleChange('description', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount (Rs.) *</label>
          <input
            type="number"
            min="1"
            step="1"
            required
            value={form.amount}
            onChange={e => handleChange('amount', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
          <input
            type="date"
            required
            value={form.date}
            onChange={e => handleChange('date', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none"
          />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-[#1E5184] rounded-lg hover:bg-[#174068] disabled:opacity-50">
          {submitting ? 'Adding...' : 'Add Extra'}
        </button>
      </div>
    </form>
  )
}
