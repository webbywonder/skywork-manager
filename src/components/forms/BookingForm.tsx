'use client'

import { useState, useEffect } from 'react'
import type { Client } from '@/types'

interface BookingFormProps {
  clientId?: number
  onSubmit: (data: Record<string, string | boolean>) => Promise<void>
  onCancel: () => void
}

const PACKAGE_TYPES = ['Daily', 'Weekly', '15-Day', 'Monthly', 'Private Cabin', 'Custom'] as const

const DEFAULT_RATES: Record<string, string> = {
  'Daily': '250',
  'Weekly': '1500',
  '15-Day': '3000',
  'Monthly': '5000',
  'Private Cabin': '10000',
  'Custom': '',
}

/**
 * Form for creating a new booking (one-off or recurring).
 */
export default function BookingForm({ clientId, onSubmit, onCancel }: BookingFormProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [isWalkIn, setIsWalkIn] = useState(false)
  const [form, setForm] = useState({
    client_id: clientId?.toString() || '',
    walk_in_name: '',
    walk_in_phone: '',
    type: 'one-off',
    package: 'Daily' as string,
    seats: '1',
    rate: DEFAULT_RATES['Daily'],
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    days: '1',
    gst_applicable: false,
    billing_cycle: 'calendar',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/clients?status=Active&limit=200')
      .then(r => r.json())
      .then(json => {
        if (json.success) setClients(json.data)
      })
  }, [])

  const handleChange = (field: string, value: string | boolean) => {
    const updates: Record<string, string | boolean> = { [field]: value }

    if (field === 'package' && typeof value === 'string') {
      updates.rate = DEFAULT_RATES[value] || form.rate
      if (value === 'Monthly' || value === 'Private Cabin') {
        updates.type = 'recurring'
      } else {
        updates.type = 'one-off'
      }
    }

    // No auto-fill from client - package/rate/seats are booking-level decisions

    setForm(prev => ({ ...prev, ...updates }))
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

  const isRecurring = form.type === 'recurring'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Client or Walk-in toggle */}
      <div className="flex items-center gap-4 mb-2">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={!isWalkIn}
            onChange={() => setIsWalkIn(false)}
            className="text-[#1E5184]"
          />
          <span className="text-sm font-medium text-gray-700">Existing Client</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={isWalkIn}
            onChange={() => setIsWalkIn(true)}
            className="text-[#1E5184]"
          />
          <span className="text-sm font-medium text-gray-700">Walk-in</span>
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {!isWalkIn ? (
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
            <select
              required={!isWalkIn}
              value={form.client_id}
              onChange={e => handleChange('client_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none"
            >
              <option value="">Select a client...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.client_id} - {c.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                required={isWalkIn}
                value={form.walk_in_name}
                onChange={e => handleChange('walk_in_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={form.walk_in_phone}
                onChange={e => handleChange('walk_in_phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none"
              />
            </div>
          </>
        )}

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
            <label className="block text-sm font-medium text-gray-700 mb-1">Billing Cycle</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="billing_cycle"
                  checked={form.billing_cycle === 'calendar'}
                  onChange={() => handleChange('billing_cycle', 'calendar')}
                  className="mt-1 text-[#1E5184]"
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
                  className="mt-1 text-[#1E5184]"
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
            id="gst"
            checked={form.gst_applicable as boolean}
            onChange={e => handleChange('gst_applicable', e.target.checked)}
            className="rounded border-gray-300"
          />
          <label htmlFor="gst" className="text-sm font-medium text-gray-700">GST Applicable (18%)</label>
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
          {submitting ? 'Creating...' : 'Create Booking'}
        </button>
      </div>
    </form>
  )
}
