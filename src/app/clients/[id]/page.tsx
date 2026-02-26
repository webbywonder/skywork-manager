'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import ClientForm from '@/components/forms/ClientForm'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Client, BookingWithClient, DepositWithClient } from '@/types'

type TabId = 'overview' | 'bookings' | 'deposit'

/**
 * Client detail page with tabbed view: Overview, Bookings & Payments, Deposit.
 */
export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { showToast } = useToast()
  const [client, setClient] = useState<Client | null>(null)
  const [bookings, setBookings] = useState<BookingWithClient[]>([])
  const [deposits, setDeposits] = useState<DepositWithClient[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [showEditModal, setShowEditModal] = useState(false)

  const fetchClient = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${params.id}`)
      const json = await res.json()
      if (json.success) {
        setClient(json.data)
      } else {
        showToast('error', 'Client not found')
        router.push('/clients')
        return
      }
      // Fetch bookings
      const bookingsRes = await fetch(`/api/bookings?client_id=${params.id}`)
      const bookingsJson = await bookingsRes.json()
      if (bookingsJson.success) setBookings(bookingsJson.data)

      // Fetch deposits
      const depositsRes = await fetch(`/api/deposits?client_id=${params.id}`)
      const depositsJson = await depositsRes.json()
      if (depositsJson.success) setDeposits(depositsJson.data)
    } catch (error) {
      showToast('error', 'Failed to load client')
    } finally {
      setLoading(false)
    }
  }, [params.id, router, showToast])

  useEffect(() => {
    fetchClient()
  }, [fetchClient])

  const handleUpdate = async (data: Record<string, string>) => {
    const res = await fetch(`/api/clients/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (json.success) {
      showToast('success', 'Client updated')
      setShowEditModal(false)
      fetchClient()
    } else {
      showToast('error', json.error || 'Failed to update client')
    }
  }

  if (loading) return <div className="text-gray-500">Loading...</div>
  if (!client) return <div className="text-gray-500">Client not found</div>

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'bookings', label: 'Bookings & Payments' },
    { id: 'deposit', label: 'Deposit' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <button
            onClick={() => router.push('/clients')}
            className="text-sm text-gray-500 hover:text-[#1E5184] mb-2 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Clients
          </button>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            {client.name}
            <Badge variant={client.status === 'Active' ? 'green' : 'gray'}>{client.status}</Badge>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {client.client_id}
            {client.company_name && ` • ${client.company_name}`}
          </p>
        </div>
        <button
          onClick={() => setShowEditModal(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-[#1E5184] rounded-lg hover:bg-[#174068]"
        >
          Edit Client
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#1E5184] text-[#1E5184]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Contact Details</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Phone</dt>
                <dd className="text-sm font-medium">{client.phone}</dd>
              </div>
              {client.email && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Email</dt>
                  <dd className="text-sm font-medium">{client.email}</dd>
                </div>
              )}
              {client.documents && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Documents</dt>
                  <dd className="text-sm font-medium">{client.documents}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Membership</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Package</dt>
                <dd className="text-sm font-medium">{client.package_type}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Rate</dt>
                <dd className="text-sm font-medium">{formatCurrency(client.rate)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Seats</dt>
                <dd className="text-sm font-medium">{client.seats}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Join Date</dt>
                <dd className="text-sm font-medium">{formatDate(client.join_date)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Credit Balance</dt>
                <dd className="text-sm font-medium text-green-600">{formatCurrency(client.credit_balance)}</dd>
              </div>
            </dl>
          </div>

          {client.notes && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Notes</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'bookings' && (
        <div className="space-y-4">
          {bookings.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
              No bookings found for this client.
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Booking ID</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Package</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Rate</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Start</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bookings.map(b => (
                      <tr key={b.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Link href={`/bookings/${b.id}`} className="text-[#1E5184] font-medium hover:underline">
                            {b.booking_id}
                          </Link>
                        </td>
                        <td className="px-4 py-3 capitalize">{b.type}</td>
                        <td className="px-4 py-3">{b.package}</td>
                        <td className="px-4 py-3">{formatCurrency(b.rate)}</td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(b.start_date)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={b.status === 'Active' ? 'green' : b.status === 'Cancelled' ? 'red' : 'gray'}>
                            {b.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'deposit' && (
        <div className="space-y-4">
          {deposits.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
              No deposits found for this client.
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Amount</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Received</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Method</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Refund Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {deposits.map(d => (
                      <tr key={d.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{formatCurrency(d.amount)}</td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(d.received_date)}</td>
                        <td className="px-4 py-3 text-gray-600">{d.payment_method}</td>
                        <td className="px-4 py-3">
                          <Badge variant={d.status === 'Held' ? 'blue' : 'gray'}>{d.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{d.refund_date ? formatDate(d.refund_date) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Client" size="lg">
        <ClientForm client={client} onSubmit={handleUpdate} onCancel={() => setShowEditModal(false)} />
      </Modal>
    </div>
  )
}
