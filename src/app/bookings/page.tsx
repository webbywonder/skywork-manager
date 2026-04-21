'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import BookingForm from '@/components/forms/BookingForm'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { BookingWithClient } from '@/types'

interface BookingListItem extends BookingWithClient {
  total_due: number
  total_paid: number
}

/**
 * Bookings list page with type/status filters and new booking modal.
 */
export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('Active')
  const [showModal, setShowModal] = useState(false)
  const { showToast } = useToast()

  const fetchBookings = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (typeFilter !== 'all') params.set('type', typeFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (search) params.set('search', search)

      const res = await fetch(`/api/bookings?${params}`)
      const json = await res.json()
      if (json.success) {
        setBookings(json.data)
      }
    } catch (error) {
      showToast('error', 'Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }, [typeFilter, statusFilter, search, showToast])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  const handleCreate = async (data: Record<string, string | boolean>) => {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (json.success) {
      showToast('success', `Booking ${json.data.booking_id} created`)
      setShowModal(false)
      fetchBookings()
    } else {
      showToast('error', json.error || 'Failed to create booking')
    }
  }

  const statusVariant = (status: string) => {
    switch (status) {
      case 'Active': return 'green' as const
      case 'Completed': return 'gray' as const
      case 'Cancelled': return 'red' as const
      default: return 'gray' as const
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-[#1E5184] rounded-lg hover:bg-[#174068]"
        >
          + New Booking
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by booking ID, client..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none flex-1 max-w-sm"
        />
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none"
        >
          <option value="all">All Types</option>
          <option value="one-off">One-off</option>
          <option value="recurring">Recurring</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none"
        >
          <option value="all">All Status</option>
          <option value="Active">Active</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No bookings found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Booking ID</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Client</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Package</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Seats</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Rate</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Start</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Renews On</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Due</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Paid</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Balance</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bookings.map(booking => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/bookings/${booking.id}`} className="text-[#1E5184] font-medium hover:underline">
                        {booking.booking_id}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {booking.client_name || booking.walk_in_name || '-'}
                      {booking.client_client_id && (
                        <span className="block text-xs text-gray-500">{booking.client_client_id}</span>
                      )}
                      {booking.client_phone && (
                        <span className="block text-xs text-gray-500">{booking.client_phone}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={booking.type === 'recurring' ? 'blue' : 'gray'}>
                        {booking.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{booking.package}</td>
                    <td className="px-4 py-3 text-gray-600">{booking.seats}</td>
                    <td className="px-4 py-3 text-gray-600">{formatCurrency(booking.rate)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(booking.start_date)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {(() => {
                        if (booking.type !== 'recurring' || booking.status !== 'Active') return '—'
                        const today = new Date()
                        let year = today.getFullYear()
                        let month: number
                        let day: number
                        if (booking.billing_cycle === 'anniversary') {
                          const anchor = new Date(booking.start_date).getDate()
                          month = today.getMonth()
                          if (today.getDate() >= anchor) month += 1
                          day = anchor
                        } else {
                          month = today.getMonth() + 1
                          day = 1
                        }
                        if (month > 11) { month = 0; year += 1 }
                        return <span className="text-[#1E5184] font-medium">{formatDate(new Date(year, month, day).toISOString().split('T')[0])}</span>
                      })()}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatCurrency(booking.total_due)}</td>
                    <td className="px-4 py-3 text-green-600 font-medium">{formatCurrency(booking.total_paid)}</td>
                    <td className="px-4 py-3">
                      {(() => {
                        const balance = booking.total_due - booking.total_paid
                        if (balance <= 0) return <span className="text-green-600 font-medium">{balance < 0 ? `${formatCurrency(Math.abs(balance))} credit` : 'Clear'}</span>
                        return <span className="text-red-600 font-medium">{formatCurrency(balance)}</span>
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(booking.status)}>{booking.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Booking" size="lg">
        <BookingForm onSubmit={handleCreate} onCancel={() => setShowModal(false)} />
      </Modal>
    </div>
  )
}
