'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency, formatDate, toRupees } from '@/lib/utils'
import type { Renewal } from '@/types'

const SERVICES = ['Domain', 'Hosting', 'Domain + Hosting', 'Domain + Hosting + Email', 'SMS', 'WhatsApp'] as const
const STATUSES = ['Active', 'Discontinued', 'Managed by Other'] as const

interface RenewalWithPaymentStatus extends Renewal {
  paid_this_year: number
}

const defaultRenewalForm = {
  domain_name: '',
  client_name: '',
  services: SERVICES[0] as string,
  client_rate: '',
  your_cost: '',
  renewal_date: new Date().toISOString().split('T')[0],
  status: 'Active' as string,
  notes: '',
}

/**
 * Renewals page with CRUD operations and payment logging for domain/hosting renewals.
 */
export default function RenewalsPage() {
  const [renewals, setRenewals] = useState<RenewalWithPaymentStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'Active' | 'all'>('Active')
  const [searchQuery, setSearchQuery] = useState('')
  const [serviceFilter, setServiceFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editRenewal, setEditRenewal] = useState<RenewalWithPaymentStatus | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [renewalForm, setRenewalForm] = useState(defaultRenewalForm)
  const { showToast } = useToast()

  const fetchRenewals = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/renewals?${params}`)
      const json = await res.json()
      if (json.success) setRenewals(json.data)
    } catch {
      showToast('error', 'Failed to load renewals')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, showToast])

  useEffect(() => { fetchRenewals() }, [fetchRenewals])

  /**
   * Creates a new renewal from form data.
   */
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/renewals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(renewalForm),
    })
    const json = await res.json()
    if (json.success) {
      showToast('success', 'Renewal created')
      setShowAddModal(false)
      setRenewalForm(defaultRenewalForm)
      fetchRenewals()
    } else {
      showToast('error', json.error || 'Failed to create renewal')
    }
  }

  /**
   * Updates an existing renewal with form data.
   */
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editRenewal) return
    const res = await fetch(`/api/renewals/${editRenewal.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(renewalForm),
    })
    const json = await res.json()
    if (json.success) {
      showToast('success', 'Renewal updated')
      setEditRenewal(null)
      setRenewalForm(defaultRenewalForm)
      fetchRenewals()
    } else {
      showToast('error', json.error || 'Failed to update renewal')
    }
  }

  /**
   * Deletes a renewal and its payment history.
   */
  const handleDelete = async () => {
    if (!deleteId) return
    const res = await fetch(`/api/renewals/${deleteId}`, { method: 'DELETE' })
    const json = await res.json()
    if (json.success) {
      showToast('success', 'Renewal deleted')
      setDeleteId(null)
      fetchRenewals()
    } else {
      showToast('error', json.error || 'Failed to delete renewal')
    }
  }

  /**
   * Opens the edit modal and pre-fills form with renewal data.
   */
  const openEdit = (renewal: RenewalWithPaymentStatus) => {
    setRenewalForm({
      domain_name: renewal.domain_name,
      client_name: renewal.client_name,
      services: renewal.services,
      client_rate: toRupees(renewal.client_rate).toString(),
      your_cost: toRupees(renewal.your_cost).toString(),
      renewal_date: renewal.renewal_date,
      status: renewal.status,
      notes: renewal.notes || '',
    })
    setEditRenewal(renewal)
  }

  /**
   * Determines payment badge variant based on paid status and renewal date.
   */
  const getPaymentBadge = (renewal: RenewalWithPaymentStatus): { variant: 'green' | 'red' | 'yellow'; label: string } => {
    if (renewal.paid_this_year > 0) {
      return { variant: 'green', label: 'Paid' }
    }
    const today = new Date().toISOString().split('T')[0]
    if (renewal.renewal_date < today) {
      return { variant: 'red', label: 'Overdue' }
    }
    return { variant: 'yellow', label: 'Due' }
  }

  /**
   * Returns the badge variant for a renewal status.
   */
  const getStatusVariant = (status: string): 'green' | 'gray' | 'blue' => {
    if (status === 'Active') return 'green'
    if (status === 'Managed by Other') return 'blue'
    return 'gray'
  }

  // Filter renewals by search query and service type
  const filteredRenewals = renewals.filter(r => {
    const matchesSearch = searchQuery === '' ||
      r.domain_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.client_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesService = serviceFilter === 'all' || r.services === serviceFilter
    return matchesSearch && matchesService
  })

  const activeRenewals = filteredRenewals.filter(r => r.status === 'Active')
  const totalRevenue = activeRenewals.reduce((sum, r) => sum + r.client_rate, 0)
  const totalCost = activeRenewals.reduce((sum, r) => sum + r.your_cost, 0)
  const totalMargin = totalRevenue - totalCost

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Renewals</h1>
        <button
          onClick={() => { setRenewalForm(defaultRenewalForm); setShowAddModal(true) }}
          className="px-4 py-2 text-sm font-medium text-white bg-[#1E5184] rounded-lg hover:bg-[#174068]"
        >
          + Add Renewal
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex gap-2">
          {(['Active', 'all'] as const).map(filter => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                statusFilter === filter
                  ? 'bg-[#1E5184] text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {filter === 'all' ? 'All' : 'Active'}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search domain or client..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none sm:w-64"
        />
        <select
          value={serviceFilter}
          onChange={e => setServiceFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none"
        >
          <option value="all">All Services</option>
          {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : filteredRenewals.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No renewals found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Domain</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Client</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Services</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Rate</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Cost</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Margin</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Renewal Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Payment</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRenewals.map(renewal => {
                  const isActive = renewal.status === 'Active'
                  const paymentBadge = isActive ? getPaymentBadge(renewal) : null
                  return (
                    <tr key={renewal.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">
                        <Link href={`/renewals/${renewal.id}`} className="text-[#1E5184] hover:underline">
                          {renewal.domain_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{renewal.client_name}</td>
                      <td className="px-4 py-3 text-gray-600">{renewal.services}</td>
                      <td className="px-4 py-3 font-medium">{formatCurrency(renewal.client_rate)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatCurrency(renewal.your_cost)}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {renewal.your_cost > 0 ? formatCurrency(renewal.client_rate - renewal.your_cost) : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(renewal.renewal_date)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={getStatusVariant(renewal.status)}>{renewal.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {paymentBadge ? (
                          <Badge variant={paymentBadge.variant}>{paymentBadge.label}</Badge>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(renewal)} className="text-[#1E5184] hover:underline text-sm">Edit</button>
                          <button onClick={() => setDeleteId(renewal.id)} className="text-red-500 hover:underline text-sm">Delete</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary footer for active renewals */}
      {statusFilter === 'Active' && activeRenewals.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="text-xs font-medium text-gray-500 uppercase">Total Annual Revenue</h3>
            <p className="text-2xl font-bold text-[#1E5184] mt-1">{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="text-xs font-medium text-gray-500 uppercase">Total Cost</h3>
            <p className="text-2xl font-bold text-gray-700 mt-1">{formatCurrency(totalCost)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="text-xs font-medium text-gray-500 uppercase">Total Margin</h3>
            <p className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(totalMargin)}</p>
          </div>
        </div>
      )}

      {/* Add Renewal Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Renewal">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Domain Name *</label>
              <input type="text" required value={renewalForm.domain_name} onChange={e => setRenewalForm(prev => ({ ...prev, domain_name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
              <input type="text" required value={renewalForm.client_name} onChange={e => setRenewalForm(prev => ({ ...prev, client_name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Services *</label>
              <select value={renewalForm.services} onChange={e => setRenewalForm(prev => ({ ...prev, services: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none">
                {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client Rate (Rs.) *</label>
              <input type="number" required min="0" value={renewalForm.client_rate} onChange={e => setRenewalForm(prev => ({ ...prev, client_rate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Cost (Rs.)</label>
              <input type="number" min="0" value={renewalForm.your_cost} onChange={e => setRenewalForm(prev => ({ ...prev, your_cost: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Renewal Date *</label>
              <input type="date" required value={renewalForm.renewal_date} onChange={e => setRenewalForm(prev => ({ ...prev, renewal_date: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={renewalForm.status} onChange={e => setRenewalForm(prev => ({ ...prev, status: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none">
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea rows={2} value={renewalForm.notes} onChange={e => setRenewalForm(prev => ({ ...prev, notes: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-[#1E5184] rounded-lg hover:bg-[#174068]">Add Renewal</button>
          </div>
        </form>
      </Modal>

      {/* Edit Renewal Modal */}
      <Modal isOpen={!!editRenewal} onClose={() => setEditRenewal(null)} title="Edit Renewal">
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Domain Name *</label>
              <input type="text" required value={renewalForm.domain_name} onChange={e => setRenewalForm(prev => ({ ...prev, domain_name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
              <input type="text" required value={renewalForm.client_name} onChange={e => setRenewalForm(prev => ({ ...prev, client_name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Services *</label>
              <select value={renewalForm.services} onChange={e => setRenewalForm(prev => ({ ...prev, services: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none">
                {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client Rate (Rs.) *</label>
              <input type="number" required min="0" value={renewalForm.client_rate} onChange={e => setRenewalForm(prev => ({ ...prev, client_rate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Cost (Rs.)</label>
              <input type="number" min="0" value={renewalForm.your_cost} onChange={e => setRenewalForm(prev => ({ ...prev, your_cost: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Renewal Date *</label>
              <input type="date" required value={renewalForm.renewal_date} onChange={e => setRenewalForm(prev => ({ ...prev, renewal_date: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={renewalForm.status} onChange={e => setRenewalForm(prev => ({ ...prev, status: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none">
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea rows={2} value={renewalForm.notes} onChange={e => setRenewalForm(prev => ({ ...prev, notes: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setEditRenewal(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-[#1E5184] rounded-lg hover:bg-[#174068]">Update Renewal</button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Renewal"
        message="Are you sure you want to delete this renewal? All payment history will also be deleted."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
