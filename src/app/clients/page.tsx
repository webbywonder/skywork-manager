'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import ClientForm from '@/components/forms/ClientForm'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency } from '@/lib/utils'
import type { Client } from '@/types'

/**
 * Clients list page with search, status filter, and new client modal.
 */
export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const { showToast } = useToast()

  const fetchClients = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (search) params.set('search', search)

      const res = await fetch(`/api/clients?${params}`)
      const json = await res.json()
      if (json.success) {
        setClients(json.data)
      }
    } catch (error) {
      showToast('error', 'Failed to load clients')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search, showToast])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const handleCreate = async (data: Record<string, string>) => {
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (json.success) {
      showToast('success', `Client ${json.data.client_id} created`)
      setShowModal(false)
      fetchClients()
    } else {
      showToast('error', json.error || 'Failed to create client')
    }
  }

  const statusBadgeVariant = (status: string) => {
    return status === 'Active' ? 'green' : 'gray'
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-[#1E5184] rounded-lg hover:bg-[#174068]"
        >
          + New Client
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by name, ID, phone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none flex-1 max-w-sm"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none"
        >
          <option value="all">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : clients.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No clients found. Add your first client to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Package</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Rate</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Seats</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clients.map(client => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/clients/${client.id}`} className="text-[#1E5184] font-medium hover:underline">
                        {client.client_id}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/clients/${client.id}`} className="hover:text-[#1E5184]">
                        {client.name}
                        {client.company_name && (
                          <span className="block text-xs text-gray-500">{client.company_name}</span>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{client.phone}</td>
                    <td className="px-4 py-3 text-gray-600">{client.package_type}</td>
                    <td className="px-4 py-3 text-gray-600">{formatCurrency(client.rate)}</td>
                    <td className="px-4 py-3 text-gray-600">{client.seats}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusBadgeVariant(client.status)}>{client.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Client Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Client" size="lg">
        <ClientForm onSubmit={handleCreate} onCancel={() => setShowModal(false)} />
      </Modal>
    </div>
  )
}
