'use client'

import { useState, useEffect, useCallback } from 'react'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Expense, RecurringExpense } from '@/types'

const CATEGORIES = [
  'WiFi / Internet', 'Electricity', 'Cleaning Service',
  'Stationery & Supplies', 'Tea / Coffee / Snacks', 'Rent',
  'Maintenance', 'Other',
]
const FREQUENCIES = ['Monthly', 'Quarterly', 'Half-yearly', 'Yearly'] as const
const PAYMENT_METHODS = ['UPI', 'Cash', 'Bank Transfer', 'GPay'] as const

type TabId = 'expenses' | 'recurring'

/**
 * Expenses page with tabs for one-off expenses and recurring expense management.
 */
export default function ExpensesPage() {
  const [activeTab, setActiveTab] = useState<TabId>('expenses')
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [recurring, setRecurring] = useState<RecurringExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7))
  const [showNewExpense, setShowNewExpense] = useState(false)
  const [showNewRecurring, setShowNewRecurring] = useState(false)
  const [editRecurring, setEditRecurring] = useState<RecurringExpense | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteRecurringId, setDeleteRecurringId] = useState<number | null>(null)
  const { showToast } = useToast()

  const [expenseForm, setExpenseForm] = useState({
    date: new Date().toISOString().split('T')[0],
    category: CATEGORIES[0], description: '', amount: '', payment_method: 'UPI', notes: '',
  })

  const [recurringForm, setRecurringForm] = useState({
    category: CATEGORIES[0], description: '', amount: '', frequency: 'Monthly',
    next_due_date: new Date().toISOString().split('T')[0], auto_remind: true, notes: '',
  })

  const fetchExpenses = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (categoryFilter !== 'all') params.set('category', categoryFilter)
      if (monthFilter) params.set('month', monthFilter)
      const res = await fetch(`/api/expenses?${params}`)
      const json = await res.json()
      if (json.success) setExpenses(json.data)
    } catch (error) {
      showToast('error', 'Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }, [categoryFilter, monthFilter, showToast])

  const fetchRecurring = useCallback(async () => {
    try {
      const res = await fetch('/api/expenses/recurring')
      const json = await res.json()
      if (json.success) setRecurring(json.data)
    } catch (error) {
      showToast('error', 'Failed to load recurring expenses')
    }
  }, [showToast])

  useEffect(() => { fetchExpenses() }, [fetchExpenses])
  useEffect(() => { fetchRecurring() }, [fetchRecurring])

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/expenses', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expenseForm),
    })
    const json = await res.json()
    if (json.success) {
      showToast('success', 'Expense logged')
      setShowNewExpense(false)
      setExpenseForm({ date: new Date().toISOString().split('T')[0], category: CATEGORIES[0], description: '', amount: '', payment_method: 'UPI', notes: '' })
      fetchExpenses()
    } else {
      showToast('error', json.error || 'Failed to log expense')
    }
  }

  const handleCreateRecurring = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/expenses/recurring', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recurringForm),
    })
    const json = await res.json()
    if (json.success) {
      showToast('success', 'Recurring expense created')
      setShowNewRecurring(false)
      setRecurringForm({ category: CATEGORIES[0], description: '', amount: '', frequency: 'Monthly', next_due_date: new Date().toISOString().split('T')[0], auto_remind: true, notes: '' })
      fetchRecurring()
    } else {
      showToast('error', json.error || 'Failed to create recurring expense')
    }
  }

  const handleGenerateExpenses = async () => {
    const res = await fetch('/api/expenses/recurring', { method: 'PUT' })
    const json = await res.json()
    if (json.success) {
      showToast('success', `${json.data.generated} expense(s) generated`)
      fetchExpenses()
      fetchRecurring()
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    const res = await fetch(`/api/expenses/${deleteId}`, { method: 'DELETE' })
    const json = await res.json()
    if (json.success) {
      showToast('success', 'Expense deleted')
      setDeleteId(null)
      fetchExpenses()
    }
  }

  const handleEditRecurring = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editRecurring) return
    try {
      const res = await fetch(`/api/expenses/recurring/${editRecurring.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...recurringForm, status: editRecurring.status }),
      })
      const json = await res.json()
      if (json.success) {
        showToast('success', 'Recurring expense updated')
        setEditRecurring(null)
        fetchRecurring()
      } else {
        showToast('error', json.error || 'Failed to update')
      }
    } catch {
      showToast('error', 'Network error: Failed to update')
    }
  }

  const handleDeleteRecurring = async () => {
    if (!deleteRecurringId) return
    try {
      const res = await fetch(`/api/expenses/recurring/${deleteRecurringId}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        showToast('success', 'Recurring expense deleted')
        setDeleteRecurringId(null)
        fetchRecurring()
      } else {
        showToast('error', json.error || 'Failed to delete')
      }
    } catch {
      showToast('error', 'Network error: Failed to delete')
    }
  }

  const openEditRecurring = (rec: RecurringExpense) => {
    setRecurringForm({
      category: rec.category,
      description: rec.description,
      amount: (rec.amount / 100).toString(),
      frequency: rec.frequency,
      next_due_date: rec.next_due_date,
      auto_remind: rec.auto_remind === 1,
      notes: rec.notes || '',
    })
    setEditRecurring(rec)
  }

  const monthTotal = expenses.reduce((sum, e) => sum + e.amount, 0)

  // Category summary
  const categorySummary = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount
    return acc
  }, {})

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
        <div className="flex gap-2">
          <button onClick={handleGenerateExpenses} className="px-4 py-2 text-sm font-medium text-[#1E5184] bg-white border border-[#1E5184] rounded-lg hover:bg-blue-50">
            Generate Due Expenses
          </button>
          <button onClick={() => activeTab === 'expenses' ? setShowNewExpense(true) : setShowNewRecurring(true)} className="px-4 py-2 text-sm font-medium text-white bg-[#1E5184] rounded-lg hover:bg-[#174068]">
            + {activeTab === 'expenses' ? 'Log Expense' : 'New Recurring'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {[{ id: 'expenses' as TabId, label: 'Expenses' }, { id: 'recurring' as TabId, label: 'Recurring' }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-[#1E5184] text-[#1E5184]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'expenses' && (
        <>
          {/* Monthly summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="text-xs font-medium text-gray-500 uppercase">Month Total</h3>
              <p className="text-2xl font-bold text-[#1E5184] mt-1">{formatCurrency(monthTotal)}</p>
            </div>
            {Object.entries(categorySummary).slice(0, 3).map(([cat, total]) => (
              <div key={cat} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <h3 className="text-xs font-medium text-gray-500 uppercase truncate">{cat}</h3>
                <p className="text-lg font-bold text-gray-700 mt-1">{formatCurrency(total)}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none">
              <option value="all">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
          </div>

          {/* Expenses Table */}
          {loading ? <div className="text-gray-500">Loading...</div> : expenses.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">No expenses for this period.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Amount</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Method</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {expenses.map(expense => (
                      <tr key={expense.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600">{formatDate(expense.date)}</td>
                        <td className="px-4 py-3 text-gray-600">{expense.category}</td>
                        <td className="px-4 py-3">{expense.description}</td>
                        <td className="px-4 py-3 font-medium">{formatCurrency(expense.amount)}</td>
                        <td className="px-4 py-3 text-gray-600">{expense.payment_method || '-'}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => setDeleteId(expense.id)} className="text-red-600 hover:underline text-sm">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'recurring' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {recurring.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No recurring expenses defined.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Amount</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Frequency</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Next Due</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recurring.map(rec => (
                    <tr key={rec.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600">{rec.category}</td>
                      <td className="px-4 py-3">{rec.description}</td>
                      <td className="px-4 py-3 font-medium">{formatCurrency(rec.amount)}</td>
                      <td className="px-4 py-3 text-gray-600">{rec.frequency}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(rec.next_due_date)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={rec.status === 'Active' ? 'green' : 'gray'}>{rec.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEditRecurring(rec)} className="text-[#1E5184] hover:underline text-sm">Edit</button>
                          <button onClick={() => setDeleteRecurringId(rec.id)} className="text-red-500 hover:underline text-sm">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* New Expense Modal */}
      <Modal isOpen={showNewExpense} onClose={() => setShowNewExpense(false)} title="Log Expense">
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input type="date" required value={expenseForm.date} onChange={e => setExpenseForm(prev => ({ ...prev, date: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select value={expenseForm.category} onChange={e => setExpenseForm(prev => ({ ...prev, category: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <input type="text" required value={expenseForm.description} onChange={e => setExpenseForm(prev => ({ ...prev, description: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (Rs.) *</label>
              <input type="number" required min="0" value={expenseForm.amount} onChange={e => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select value={expenseForm.payment_method} onChange={e => setExpenseForm(prev => ({ ...prev, payment_method: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none">
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea rows={2} value={expenseForm.notes} onChange={e => setExpenseForm(prev => ({ ...prev, notes: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowNewExpense(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-[#1E5184] rounded-lg hover:bg-[#174068]">Log Expense</button>
          </div>
        </form>
      </Modal>

      {/* New Recurring Modal */}
      <Modal isOpen={showNewRecurring} onClose={() => setShowNewRecurring(false)} title="New Recurring Expense">
        <form onSubmit={handleCreateRecurring} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select value={recurringForm.category} onChange={e => setRecurringForm(prev => ({ ...prev, category: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency *</label>
              <select value={recurringForm.frequency} onChange={e => setRecurringForm(prev => ({ ...prev, frequency: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none">
                {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <input type="text" required value={recurringForm.description} onChange={e => setRecurringForm(prev => ({ ...prev, description: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (Rs.) *</label>
              <input type="number" required min="0" value={recurringForm.amount} onChange={e => setRecurringForm(prev => ({ ...prev, amount: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Next Due Date *</label>
              <input type="date" required value={recurringForm.next_due_date} onChange={e => setRecurringForm(prev => ({ ...prev, next_due_date: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea rows={2} value={recurringForm.notes} onChange={e => setRecurringForm(prev => ({ ...prev, notes: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowNewRecurring(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-[#1E5184] rounded-lg hover:bg-[#174068]">Create Recurring</button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Expense"
        message="Are you sure you want to delete this expense?"
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      {/* Edit Recurring Modal */}
      <Modal isOpen={!!editRecurring} onClose={() => setEditRecurring(null)} title="Edit Recurring Expense">
        <form onSubmit={handleEditRecurring} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select value={recurringForm.category} onChange={e => setRecurringForm(prev => ({ ...prev, category: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency *</label>
              <select value={recurringForm.frequency} onChange={e => setRecurringForm(prev => ({ ...prev, frequency: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none">
                {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <input type="text" required value={recurringForm.description} onChange={e => setRecurringForm(prev => ({ ...prev, description: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (Rs.) *</label>
              <input type="number" required min="0" value={recurringForm.amount} onChange={e => setRecurringForm(prev => ({ ...prev, amount: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Next Due Date *</label>
              <input type="date" required value={recurringForm.next_due_date} onChange={e => setRecurringForm(prev => ({ ...prev, next_due_date: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={editRecurring?.status || 'Active'} onChange={e => setEditRecurring(prev => prev ? { ...prev, status: e.target.value as 'Active' | 'Paused' } : null)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none">
                <option value="Active">Active</option>
                <option value="Paused">Paused</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea rows={2} value={recurringForm.notes} onChange={e => setRecurringForm(prev => ({ ...prev, notes: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5184] focus:border-transparent outline-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setEditRecurring(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-[#1E5184] rounded-lg hover:bg-[#174068]">Update Recurring</button>
          </div>
        </form>
      </Modal>

      {/* Delete Recurring Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteRecurringId}
        title="Delete Recurring Expense"
        message="Are you sure you want to delete this recurring expense? This will not remove already-generated expenses."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteRecurring}
        onCancel={() => setDeleteRecurringId(null)}
      />
    </div>
  )
}
