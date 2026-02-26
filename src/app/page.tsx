'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency, formatDate } from '@/lib/utils'

interface DashboardData {
  revenue: { thisMonth: number; lastMonth: number }
  outstanding: number
  overduePayments: Array<{
    id: number
    booking_id: string
    client_name: string | null
    client_display_id: string | null
    amount_due: number
    amount_paid: number
    billing_period_start: string | null
    status: string
  }>
  occupancy: { filled: number; total: number }
  expenses: number
  depositsHeld: number
  activeClients: number
  pendingFollowUps: number
  profitLoss: number
}

/**
 * Dashboard page with summary cards, outstanding dues, and quick actions.
 */
export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const { showToast } = useToast()

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard')
      const json = await res.json()
      if (json.success) setData(json.data)
    } catch (error) {
      showToast('error', 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  const handleGenerateDues = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/dashboard/generate-dues', { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        showToast('success', json.data.message)
        fetchDashboard()
      } else {
        showToast('error', json.error || 'Failed to generate dues')
      }
    } catch (error) {
      showToast('error', 'Failed to generate dues')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return <div className="text-gray-500">Loading dashboard...</div>
  if (!data) return <div className="text-gray-500">Failed to load dashboard</div>

  const revenueChange = data.revenue.lastMonth > 0
    ? ((data.revenue.thisMonth - data.revenue.lastMonth) / data.revenue.lastMonth * 100).toFixed(0)
    : null

  const occupancyPercent = Math.round((data.occupancy.filled / data.occupancy.total) * 100)

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex gap-2">
          <button
            onClick={handleGenerateDues}
            disabled={generating}
            className="px-4 py-2 text-sm font-medium text-white bg-[#1E5184] rounded-lg hover:bg-[#174068] disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Generate Dues'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {/* Revenue */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Revenue (This Month)</h3>
          <p className="text-3xl font-bold text-[#1E5184] mt-2">{formatCurrency(data.revenue.thisMonth)}</p>
          {revenueChange !== null && (
            <p className={`text-sm mt-1 ${parseInt(revenueChange) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {parseInt(revenueChange) >= 0 ? '+' : ''}{revenueChange}% vs last month
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">Last month: {formatCurrency(data.revenue.lastMonth)}</p>
        </div>

        {/* Outstanding */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Outstanding Dues</h3>
          <p className="text-3xl font-bold text-yellow-600 mt-2">{formatCurrency(data.outstanding)}</p>
          <p className="text-sm text-gray-500 mt-1">{data.overduePayments.length} payment(s) pending</p>
        </div>

        {/* Occupancy */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Occupancy</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">{data.occupancy.filled} / {data.occupancy.total}</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(100, occupancyPercent)}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 mt-1">{occupancyPercent}% filled</p>
        </div>

        {/* Expenses */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Expenses (This Month)</h3>
          <p className="text-3xl font-bold text-red-500 mt-2">{formatCurrency(data.expenses)}</p>
        </div>

        {/* P&L */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Profit / Loss</h3>
          <p className={`text-3xl font-bold mt-2 ${data.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {data.profitLoss >= 0 ? '+' : ''}{formatCurrency(Math.abs(data.profitLoss))}
          </p>
          <p className="text-sm text-gray-500 mt-1">Revenue minus expenses</p>
        </div>

        {/* Deposits */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Deposits Held</h3>
          <p className="text-3xl font-bold text-[#1E5184] mt-2">{formatCurrency(data.depositsHeld)}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link href="/bookings" className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:border-[#1E5184] transition-colors text-center">
          <div className="text-2xl mb-1">+</div>
          <p className="text-sm font-medium text-gray-700">New Booking</p>
        </Link>
        <Link href="/enquiries" className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:border-[#1E5184] transition-colors text-center">
          <div className="text-2xl mb-1">+</div>
          <p className="text-sm font-medium text-gray-700">New Enquiry</p>
        </Link>
        <Link href="/clients" className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:border-[#1E5184] transition-colors text-center">
          <div className="text-sm font-bold text-[#1E5184] mb-1">{data.activeClients}</div>
          <p className="text-sm font-medium text-gray-700">Active Clients</p>
        </Link>
      </div>

      {/* Outstanding Dues Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Outstanding Dues</h2>
          {data.pendingFollowUps > 0 && (
            <Link href="/enquiries" className="text-sm text-[#1E5184] hover:underline">
              {data.pendingFollowUps} follow-up(s) pending
            </Link>
          )}
        </div>
        {data.overduePayments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No outstanding dues. All caught up!</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Client</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Booking</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Period</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Due</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Paid</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Balance</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.overduePayments.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {p.client_name || 'Walk-in'}
                      {p.client_display_id && (
                        <span className="block text-xs text-gray-500">{p.client_display_id}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.booking_id}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {p.billing_period_start ? formatDate(p.billing_period_start) : '-'}
                    </td>
                    <td className="px-4 py-3">{formatCurrency(p.amount_due)}</td>
                    <td className="px-4 py-3 text-green-600">{formatCurrency(p.amount_paid)}</td>
                    <td className="px-4 py-3 font-medium text-red-600">
                      {formatCurrency(p.amount_due - p.amount_paid)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={p.status === 'Overdue' ? 'red' : p.status === 'Partial' ? 'yellow' : 'gray'}>
                        {p.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
