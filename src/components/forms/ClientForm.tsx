'use client'

import { useState } from 'react'
import type { Client } from '@/types'
import { toRupees } from '@/lib/utils'

interface ClientFormProps {
  client?: Client
  onSubmit: (data: Record<string, string>) => Promise<void>
  onCancel: () => void
}

const PACKAGE_TYPES = ['Daily', 'Weekly', '15-Day', 'Monthly', 'Private Cabin'] as const

const DEFAULT_RATES: Record<string, string> = {
  'Daily': '250',
  'Weekly': '1500',
  '15-Day': '3000',
  'Monthly': '5000',
  'Private Cabin': '10000',
}

/**
 * Form for creating or editing a client.
 */
export default function ClientForm({ client, onSubmit, onCancel }: ClientFormProps) {
  const [form, setForm] = useState({
    name: client?.name || '',
    company_name: client?.company_name || '',
    phone: client?.phone || '',
    email: client?.email || '',
    documents: client?.documents || '',
    package_type: client?.package_type || 'Monthly',
    seats: client?.seats?.toString() || '1',
    rate: client ? toRupees(client.rate).toString() : DEFAULT_RATES['Monthly'],
    join_date: client?.join_date || new Date().toISOString().split('T')[0],
    status: client?.status || 'Active',
    notes: client?.notes || '',
  })
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (field: string, value: string) => {
    const updates: Record<string, string> = { [field]: value }

    if (field === 'package_type' && !client) {
      updates.rate = DEFAULT_RATES[value] || form.rate
    }

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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={e => handleChange('name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
          <input
            type="text"
            value={form.company_name}
            onChange={e => handleChange('company_name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
          <input
            type="tel"
            required
            value={form.phone}
            onChange={e => handleChange('phone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={e => handleChange('email', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Package Type *</label>
          <select
            value={form.package_type}
            onChange={e => handleChange('package_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none"
          >
            {PACKAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Seats *</label>
          <input
            type="number"
            min="1"
            required
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Join Date *</label>
          <input
            type="date"
            required
            value={form.join_date}
            onChange={e => handleChange('join_date', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Documents on File</label>
          <input
            type="text"
            placeholder="e.g. Aadhar, PAN"
            value={form.documents}
            onChange={e => handleChange('documents', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none"
          />
        </div>
        {client && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={form.status}
              onChange={e => handleChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          rows={3}
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
          {submitting ? 'Saving...' : (client ? 'Update Client' : 'Add Client')}
        </button>
      </div>
    </form>
  )
}
