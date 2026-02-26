'use client'

import { useState, useEffect, useCallback } from 'react'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { formatDate } from '@/lib/utils'
import type { Enquiry } from '@/types'

const SOURCES = ['Google', 'Walk-in', 'Referral', 'WhatsApp', 'Other'] as const
const STATUSES = ['New', 'Contacted', 'Follow-up', 'Converted', 'Lost'] as const
const PACKAGES = ['Daily', 'Weekly', '15-Day', 'Monthly', 'Private Cabin'] as const

/**
 * Enquiries list page with filters, new enquiry, and status management.
 */
export default function EnquiriesPage() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [sortByFollowUp, setSortByFollowUp] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  const [editEnquiry, setEditEnquiry] = useState<Enquiry | null>(null)
  const { showToast } = useToast()

  const [newForm, setNewForm] = useState({
    date: new Date().toISOString().split('T')[0],
    name: '', phone: '', email: '',
    source: 'Walk-in', package_interest: 'Monthly',
    seats: '1', date_requirements: '', notes: '', follow_up_date: '',
  })

  const fetchEnquiries = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (sourceFilter !== 'all') params.set('source', sourceFilter)
      if (search) params.set('search', search)
      if (sortByFollowUp) params.set('sort', 'follow_up')
      const res = await fetch(`/api/enquiries?${params}`)
      const json = await res.json()
      if (json.success) setEnquiries(json.data)
    } catch (error) {
      showToast('error', 'Failed to load enquiries')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, sourceFilter, search, sortByFollowUp, showToast])

  useEffect(() => { fetchEnquiries() }, [fetchEnquiries])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/enquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newForm),
    })
    const json = await res.json()
    if (json.success) {
      showToast('success', 'Enquiry logged')
      setShowNewModal(false)
      setNewForm({ date: new Date().toISOString().split('T')[0], name: '', phone: '', email: '', source: 'Walk-in', package_interest: 'Monthly', seats: '1', date_requirements: '', notes: '', follow_up_date: '' })
      fetchEnquiries()
    } else {
      showToast('error', json.error || 'Failed to create enquiry')
    }
  }

  const handleStatusUpdate = async (enquiry: Enquiry, newStatus: string) => {
    const res = await fetch(`/api/enquiries/${enquiry.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    const json = await res.json()
    if (json.success) {
      showToast('success', `Status updated to ${newStatus}`)
      fetchEnquiries()
    } else {
      showToast('error', json.error || 'Failed to update status')
    }
  }

  const statusVariant = (status: string) => {
    switch (status) {
      case 'New': return 'blue' as const
      case 'Contacted': return 'yellow' as const
      case 'Follow-up': return 'yellow' as const
      case 'Converted': return 'green' as const
      case 'Lost': return 'red' as const
      default: return 'gray' as const
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Enquiries</h1>
        <button onClick={() => setShowNewModal(true)} className="px-4 py-2 text-sm font-medium text-white bg-[#1E5184] rounded-lg hover:bg-[#174068]">
          + New Enquiry
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none flex-1 max-w-xs" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none">
          <option value="all">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none">
          <option value="all">All Sources</option>
          {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <label className="flex items-center gap-2 px-3 py-2">
          <input type="checkbox" checked={sortByFollowUp} onChange={e => setSortByFollowUp(e.target.checked)} className="rounded border-gray-300" />
          <span className="text-sm text-gray-700">Sort by follow-up</span>
        </label>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : enquiries.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No enquiries found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Source</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Package</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Follow-up</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {enquiries.map(enquiry => (
                  <tr key={enquiry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">{formatDate(enquiry.date)}</td>
                    <td className="px-4 py-3 font-medium">{enquiry.name}</td>
                    <td className="px-4 py-3 text-gray-600">{enquiry.phone}</td>
                    <td className="px-4 py-3 text-gray-600">{enquiry.source}</td>
                    <td className="px-4 py-3 text-gray-600">{enquiry.package_interest}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {enquiry.follow_up_date ? formatDate(enquiry.follow_up_date) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(enquiry.status)}>{enquiry.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={enquiry.status}
                        onChange={e => handleStatusUpdate(enquiry, e.target.value)}
                        className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-[#1E5184] outline-none"
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Enquiry Modal */}
      <Modal isOpen={showNewModal} onClose={() => setShowNewModal(false)} title="New Enquiry" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" value={newForm.date} onChange={e => setNewForm(prev => ({ ...prev, date: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input type="text" required value={newForm.name} onChange={e => setNewForm(prev => ({ ...prev, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
              <input type="tel" required value={newForm.phone} onChange={e => setNewForm(prev => ({ ...prev, phone: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={newForm.email} onChange={e => setNewForm(prev => ({ ...prev, email: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source *</label>
              <select value={newForm.source} onChange={e => setNewForm(prev => ({ ...prev, source: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none">
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Package Interest *</label>
              <select value={newForm.package_interest} onChange={e => setNewForm(prev => ({ ...prev, package_interest: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none">
                {PACKAGES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seats</label>
              <input type="number" min="1" value={newForm.seats} onChange={e => setNewForm(prev => ({ ...prev, seats: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Date</label>
              <input type="date" value={newForm.follow_up_date} onChange={e => setNewForm(prev => ({ ...prev, follow_up_date: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Requirements</label>
            <input type="text" placeholder="e.g. Need desk for March 1-15" value={newForm.date_requirements} onChange={e => setNewForm(prev => ({ ...prev, date_requirements: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea rows={2} value={newForm.notes} onChange={e => setNewForm(prev => ({ ...prev, notes: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowNewModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-[#1E5184] rounded-lg hover:bg-[#174068]">Log Enquiry</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
