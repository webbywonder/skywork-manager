'use client'

import { useState, useEffect, useCallback } from 'react'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { DepositWithClient, Client } from '@/types'

/**
 * Deposits list page with held/refunded filter and deposit management.
 */
export default function DepositsPage() {
  const [deposits, setDeposits] = useState<DepositWithClient[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [showNewModal, setShowNewModal] = useState(false)
  const [refundDeposit, setRefundDeposit] = useState<DepositWithClient | null>(null)
  const [showRefundConfirm, setShowRefundConfirm] = useState(false)
  const { showToast } = useToast()

  const [newForm, setNewForm] = useState({
    client_id: '',
    amount: '',
    received_date: new Date().toISOString().split('T')[0],
    payment_method: 'UPI',
    payment_reference: '',
    notes: '',
  })

  const [refundForm, setRefundForm] = useState({
    refund_date: new Date().toISOString().split('T')[0],
    refund_method: 'UPI',
  })

  const fetchDeposits = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/deposits?${params}`)
      const json = await res.json()
      if (json.success) setDeposits(json.data)
    } catch (error) {
      showToast('error', 'Failed to load deposits')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, showToast])

  useEffect(() => {
    fetchDeposits()
    fetch('/api/clients?status=Active&limit=200')
      .then(r => r.json())
      .then(json => { if (json.success) setClients(json.data) })
  }, [fetchDeposits])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/deposits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newForm),
    })
    const json = await res.json()
    if (json.success) {
      showToast('success', 'Deposit logged')
      setShowNewModal(false)
      setNewForm({ client_id: '', amount: '', received_date: new Date().toISOString().split('T')[0], payment_method: 'UPI', payment_reference: '', notes: '' })
      fetchDeposits()
    } else {
      showToast('error', json.error || 'Failed to log deposit')
    }
  }

  const handleRefund = async () => {
    if (!refundDeposit) return
    const res = await fetch(`/api/deposits/${refundDeposit.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'Refunded',
        refund_date: refundForm.refund_date,
        refund_method: refundForm.refund_method,
      }),
    })
    const json = await res.json()
    if (json.success) {
      showToast('success', 'Deposit marked as refunded')
      setShowRefundConfirm(false)
      setRefundDeposit(null)
      fetchDeposits()
    } else {
      showToast('error', json.error || 'Failed to refund deposit')
    }
  }

  const heldTotal = deposits.filter(d => d.status === 'Held').reduce((sum, d) => sum + d.amount, 0)
  const refundedTotal = deposits.filter(d => d.status === 'Refunded').reduce((sum, d) => sum + d.amount, 0)

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Deposits</h1>
        <button
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-[#1E5184] rounded-lg hover:bg-[#174068]"
        >
          + Log Deposit
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="text-xs font-medium text-gray-500 uppercase">Total Held</h3>
          <p className="text-2xl font-bold text-[#1E5184] mt-1">{formatCurrency(heldTotal)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="text-xs font-medium text-gray-500 uppercase">Total Refunded</h3>
          <p className="text-2xl font-bold text-gray-600 mt-1">{formatCurrency(refundedTotal)}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none"
        >
          <option value="all">All</option>
          <option value="Held">Held</option>
          <option value="Refunded">Refunded</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : deposits.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No deposits found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Client</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Received</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Method</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Refund Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {deposits.map(deposit => (
                  <tr key={deposit.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {deposit.client_name}
                      <span className="block text-xs text-gray-500">{deposit.client_client_id}</span>
                    </td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(deposit.amount)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(deposit.received_date)}</td>
                    <td className="px-4 py-3 text-gray-600">{deposit.payment_method}</td>
                    <td className="px-4 py-3">
                      <Badge variant={deposit.status === 'Held' ? 'blue' : 'gray'}>{deposit.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {deposit.refund_date ? formatDate(deposit.refund_date) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {deposit.status === 'Held' && (
                        <button
                          onClick={() => { setRefundDeposit(deposit); setShowRefundConfirm(true) }}
                          className="text-red-600 hover:underline text-sm"
                        >
                          Refund
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Deposit Modal */}
      <Modal isOpen={showNewModal} onClose={() => setShowNewModal(false)} title="Log Deposit">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
              <select
                required
                value={newForm.client_id}
                onChange={e => setNewForm(prev => ({ ...prev, client_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none"
              >
                <option value="">Select a client...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.client_id} - {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (Rs.) *</label>
              <input type="number" required min="0" value={newForm.amount} onChange={e => setNewForm(prev => ({ ...prev, amount: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input type="date" required value={newForm.received_date} onChange={e => setNewForm(prev => ({ ...prev, received_date: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
              <select value={newForm.payment_method} onChange={e => setNewForm(prev => ({ ...prev, payment_method: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none">
                <option value="UPI">UPI</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="GPay">GPay</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
              <input type="text" value={newForm.payment_reference} onChange={e => setNewForm(prev => ({ ...prev, payment_reference: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea rows={2} value={newForm.notes} onChange={e => setNewForm(prev => ({ ...prev, notes: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowNewModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-[#1E5184] rounded-lg hover:bg-[#174068]">Log Deposit</button>
          </div>
        </form>
      </Modal>

      {/* Refund Confirm Dialog */}
      {refundDeposit && (
        <Modal isOpen={showRefundConfirm} onClose={() => { setShowRefundConfirm(false); setRefundDeposit(null) }} title="Refund Deposit">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Refund {formatCurrency(refundDeposit.amount)} to {refundDeposit.client_name}?
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Refund Date</label>
                <input type="date" value={refundForm.refund_date} onChange={e => setRefundForm(prev => ({ ...prev, refund_date: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Refund Method</label>
                <select value={refundForm.refund_method} onChange={e => setRefundForm(prev => ({ ...prev, refund_method: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none">
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="GPay">GPay</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => { setShowRefundConfirm(false); setRefundDeposit(null) }} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleRefund} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">Confirm Refund</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
