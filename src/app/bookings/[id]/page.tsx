'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import PaymentForm from '@/components/forms/PaymentForm'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Payment } from '@/types'

interface BookingDetail {
  id: number
  booking_id: string
  client_id: number | null
  client_name: string | null
  client_client_id: string | null
  client_phone: string | null
  client_email: string | null
  client_company: string | null
  walk_in_name: string | null
  walk_in_phone: string | null
  type: string
  package: string
  seats: number
  rate: number
  start_date: string
  end_date: string | null
  days: number | null
  gst_applicable: number
  status: string
  notes: string | null
  payments: Payment[]
}

/**
 * Booking detail page with info summary and payment ledger.
 */
export default function BookingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { showToast } = useToast()
  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [editPayment, setEditPayment] = useState<Payment | null>(null)

  const fetchBooking = useCallback(async () => {
    try {
      const res = await fetch(`/api/bookings/${params.id}`)
      const json = await res.json()
      if (json.success) {
        setBooking(json.data)
      } else {
        showToast('error', 'Booking not found')
        router.push('/bookings')
      }
    } catch (error) {
      showToast('error', 'Failed to load booking')
    } finally {
      setLoading(false)
    }
  }, [params.id, router, showToast])

  useEffect(() => {
    fetchBooking()
  }, [fetchBooking])

  const handleLogPayment = async (data: Record<string, string>) => {
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (json.success) {
      showToast('success', 'Payment logged')
      setShowPaymentModal(false)
      fetchBooking()
    } else {
      showToast('error', json.error || 'Failed to log payment')
    }
  }

  const handleUpdatePayment = async (data: Record<string, string>) => {
    if (!editPayment) return
    const res = await fetch(`/api/payments/${editPayment.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (json.success) {
      showToast('success', 'Payment updated')
      setEditPayment(null)
      fetchBooking()
    } else {
      showToast('error', json.error || 'Failed to update payment')
    }
  }

  const paymentStatusVariant = (status: string) => {
    switch (status) {
      case 'Paid': return 'green' as const
      case 'Partial': return 'yellow' as const
      case 'Overdue': return 'red' as const
      default: return 'gray' as const
    }
  }

  if (loading) return <div className="text-gray-500">Loading...</div>
  if (!booking) return <div className="text-gray-500">Booking not found</div>

  const totalDue = booking.payments.reduce((sum, p) => sum + p.amount_due, 0)
  const totalPaid = booking.payments.reduce((sum, p) => sum + p.amount_paid, 0)
  const balance = totalDue - totalPaid

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <button
            onClick={() => router.push('/bookings')}
            className="text-sm text-gray-500 hover:text-[#1E5184] mb-2 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Bookings
          </button>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            {booking.booking_id}
            <Badge variant={booking.status === 'Active' ? 'green' : booking.status === 'Cancelled' ? 'red' : 'gray'}>
              {booking.status}
            </Badge>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {booking.client_name || booking.walk_in_name}
            {booking.client_client_id && ` (${booking.client_client_id})`}
          </p>
        </div>
        <button
          onClick={() => setShowPaymentModal(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-[#1E5184] rounded-lg hover:bg-[#174068]"
        >
          + Log Payment
        </button>
      </div>

      {/* Booking Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">Booking Details</h3>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Type</dt>
              <dd className="font-medium capitalize">{booking.type}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Package</dt>
              <dd className="font-medium">{booking.package}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Seats</dt>
              <dd className="font-medium">{booking.seats}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Rate</dt>
              <dd className="font-medium">{formatCurrency(booking.rate)}</dd>
            </div>
            {booking.gst_applicable === 1 && (
              <div className="flex justify-between">
                <dt className="text-gray-500">GST</dt>
                <dd className="font-medium">18%</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">Dates</h3>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Start</dt>
              <dd className="font-medium">{formatDate(booking.start_date)}</dd>
            </div>
            {booking.end_date && (
              <div className="flex justify-between">
                <dt className="text-gray-500">End</dt>
                <dd className="font-medium">{formatDate(booking.end_date)}</dd>
              </div>
            )}
            {booking.days && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Days</dt>
                <dd className="font-medium">{booking.days}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">Payment Summary</h3>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Total Due</dt>
              <dd className="font-medium">{formatCurrency(totalDue)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Total Paid</dt>
              <dd className="font-medium text-green-600">{formatCurrency(totalPaid)}</dd>
            </div>
            <div className="flex justify-between border-t pt-1.5">
              <dt className="text-gray-500 font-medium">Balance</dt>
              <dd className={`font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(Math.abs(balance))}
                {balance < 0 && ' (Credit)'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Payment Ledger */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Payment Ledger</h2>
        </div>
        {booking.payments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No payments recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Period</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Due</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Paid</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Method</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {booking.payments.map(payment => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 capitalize">
                      {payment.payment_type.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {payment.billing_period_start && payment.billing_period_end
                        ? `${formatDate(payment.billing_period_start)} - ${formatDate(payment.billing_period_end)}`
                        : '-'}
                    </td>
                    <td className="px-4 py-3">{formatCurrency(payment.amount_due)}</td>
                    <td className="px-4 py-3 text-green-600">{formatCurrency(payment.amount_paid)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {payment.payment_date ? formatDate(payment.payment_date) : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{payment.payment_method || '-'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={paymentStatusVariant(payment.status)}>{payment.status}</Badge>
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      {(payment.status === 'Pending' || payment.status === 'Partial' || payment.status === 'Overdue') && (
                        <button
                          onClick={() => setEditPayment(payment)}
                          className="text-[#1E5184] hover:underline text-sm"
                        >
                          Record Payment
                        </button>
                      )}
                      {payment.amount_paid > 0 && (
                        <Link
                          href={`/receipts/${payment.id}`}
                          className="text-[#1E5184] hover:underline text-sm"
                          target="_blank"
                        >
                          Receipt
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {booking.notes && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mt-6">
          <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">Notes</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{booking.notes}</p>
        </div>
      )}

      {/* Log Payment Modal */}
      <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Log Payment">
        <PaymentForm
          bookingId={booking.id}
          onSubmit={handleLogPayment}
          onCancel={() => setShowPaymentModal(false)}
        />
      </Modal>

      {/* Record Payment Modal (for updating existing) */}
      <Modal isOpen={!!editPayment} onClose={() => setEditPayment(null)} title="Record Payment">
        {editPayment && (
          <PaymentForm
            bookingId={booking.id}
            payment={editPayment}
            onSubmit={handleUpdatePayment}
            onCancel={() => setEditPayment(null)}
          />
        )}
      </Modal>
    </div>
  )
}
