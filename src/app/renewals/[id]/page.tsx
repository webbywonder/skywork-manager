'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency, formatDate, toRupees } from '@/lib/utils'
import type { Renewal, RenewalPayment, PaymentMethod } from '@/types'

const PAYMENT_METHODS: PaymentMethod[] = ['UPI', 'Cash', 'Bank Transfer', 'GPay']

interface RenewalDetail extends Renewal {
  payments: RenewalPayment[]
}

/**
 * Renewal detail page with info summary and payment history ledger.
 */
export default function RenewalDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { showToast } = useToast()
  const [renewal, setRenewal] = useState<RenewalDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [deletePaymentId, setDeletePaymentId] = useState<number | null>(null)
  const [paymentForm, setPaymentForm] = useState({
    amount_paid: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'UPI' as string,
    year: new Date().getFullYear().toString(),
    notes: '',
  })

  const fetchRenewal = useCallback(async () => {
    try {
      const res = await fetch(`/api/renewals/${params.id}`)
      const json = await res.json()
      if (json.success) {
        setRenewal(json.data)
      } else {
        showToast('error', 'Renewal not found')
        router.push('/renewals')
      }
    } catch {
      showToast('error', 'Failed to load renewal')
    } finally {
      setLoading(false)
    }
  }, [params.id, router, showToast])

  useEffect(() => {
    fetchRenewal()
  }, [fetchRenewal])

  /**
   * Opens payment modal with amount pre-filled from client rate.
   */
  const openPaymentModal = () => {
    if (!renewal) return
    setPaymentForm({
      amount_paid: toRupees(renewal.client_rate).toString(),
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'UPI',
      year: new Date().getFullYear().toString(),
      notes: '',
    })
    setShowPaymentModal(true)
  }

  /**
   * Logs a payment for this renewal.
   */
  const handleLogPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!renewal) return
    try {
      const res = await fetch(`/api/renewals/${renewal.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...paymentForm,
          year: parseInt(paymentForm.year),
        }),
      })
      const json = await res.json()
      if (json.success) {
        showToast('success', 'Payment logged')
        setShowPaymentModal(false)
        fetchRenewal()
      } else {
        showToast('error', json.error || 'Failed to log payment')
      }
    } catch {
      showToast('error', 'Network error: Failed to log payment')
    }
  }

  /**
   * Deletes a payment record.
   */
  const handleDeletePayment = async () => {
    if (!deletePaymentId) return
    try {
      const res = await fetch(`/api/renewals/${params.id}/payments/${deletePaymentId}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        showToast('success', 'Payment deleted')
        setDeletePaymentId(null)
        fetchRenewal()
      } else {
        showToast('error', json.error || 'Failed to delete payment')
      }
    } catch {
      showToast('error', 'Network error: Failed to delete payment')
    }
  }

  if (loading) return <div className="text-gray-500">Loading...</div>
  if (!renewal) return <div className="text-gray-500">Renewal not found</div>

  const margin = renewal.client_rate - renewal.your_cost
  const totalPaid = renewal.payments.reduce((sum, p) => sum + p.amount_paid, 0)
  const isActive = renewal.status === 'Active'

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <button
            onClick={() => router.push('/renewals')}
            className="text-sm text-gray-500 hover:text-[#1E5184] mb-2 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Renewals
          </button>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            {renewal.domain_name}
            <Badge variant={renewal.status === 'Active' ? 'green' : renewal.status === 'Managed by Other' ? 'blue' : 'gray'}>
              {renewal.status}
            </Badge>
          </h1>
          <p className="text-sm text-gray-500 mt-1">{renewal.client_name}</p>
        </div>
        {isActive && (
          <button
            onClick={openPaymentModal}
            className="px-4 py-2 text-sm font-medium text-white bg-[#1E5184] rounded-lg hover:bg-[#174068]"
          >
            + Log Payment
          </button>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">Renewal Details</h3>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Services</dt>
              <dd className="font-medium">{renewal.services}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Client Rate</dt>
              <dd className="font-medium">{formatCurrency(renewal.client_rate)}</dd>
            </div>
            {renewal.your_cost > 0 && (
              <>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Your Cost</dt>
                  <dd className="font-medium">{formatCurrency(renewal.your_cost)}</dd>
                </div>
                <div className="flex justify-between border-t pt-1.5">
                  <dt className="text-gray-500 font-medium">Margin</dt>
                  <dd className="font-bold text-green-600">{formatCurrency(margin)}</dd>
                </div>
              </>
            )}
          </dl>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">Schedule</h3>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Next Renewal</dt>
              <dd className="font-medium">{formatDate(renewal.renewal_date)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Frequency</dt>
              <dd className="font-medium">Yearly</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">Payment Summary</h3>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Total Payments</dt>
              <dd className="font-medium">{renewal.payments.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Total Paid</dt>
              <dd className="font-medium text-green-600">{formatCurrency(totalPaid)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
        </div>
        {renewal.payments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No payments recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Year</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Method</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Notes</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {renewal.payments.map(payment => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{payment.year}</td>
                    <td className="px-4 py-3 font-medium text-green-600">{formatCurrency(payment.amount_paid)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(payment.payment_date)}</td>
                    <td className="px-4 py-3 text-gray-600">{payment.payment_method || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{payment.notes || '-'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setDeletePaymentId(payment.id)}
                        className="text-red-500 hover:underline text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {renewal.notes && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mt-6">
          <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">Notes</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{renewal.notes}</p>
        </div>
      )}

      {/* Log Payment Modal */}
      <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title={`Log Payment — ${renewal.domain_name}`}>
        <form onSubmit={handleLogPayment} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (Rs.) *</label>
              <input type="number" required min="0" value={paymentForm.amount_paid} onChange={e => setPaymentForm(prev => ({ ...prev, amount_paid: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date *</label>
              <input type="date" required value={paymentForm.payment_date} onChange={e => setPaymentForm(prev => ({ ...prev, payment_date: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select value={paymentForm.payment_method} onChange={e => setPaymentForm(prev => ({ ...prev, payment_method: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none">
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
              <input type="number" required value={paymentForm.year} onChange={e => setPaymentForm(prev => ({ ...prev, year: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input type="text" value={paymentForm.notes} onChange={e => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowPaymentModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-[#1E5184] rounded-lg hover:bg-[#174068]">Log Payment</button>
          </div>
        </form>
      </Modal>

      {/* Delete Payment Confirmation */}
      <ConfirmDialog
        isOpen={!!deletePaymentId}
        title="Delete Payment"
        message="Are you sure you want to delete this payment record? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeletePayment}
        onCancel={() => setDeletePaymentId(null)}
      />
    </div>
  )
}
