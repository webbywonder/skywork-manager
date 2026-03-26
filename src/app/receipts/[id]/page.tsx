'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { formatDate } from '@/lib/utils'

interface ReceiptData {
  receipt_number: string
  payment: {
    id: number
    payment_type: string
    billing_period_start: string | null
    billing_period_end: string | null
    amount_due: number
    amount_paid: number
    payment_date: string | null
    payment_method: string | null
    payment_reference: string | null
    booking_id: string
    booking_type: string
    package: string
    seats: number
    booking_rate: number
    start_date: string
    end_date: string | null
    days: number | null
    gst_applicable: number
    walk_in_name: string | null
    walk_in_phone: string | null
    client_name: string | null
    company_name: string | null
    client_phone: string | null
    client_email: string | null
    client_display_id: string | null
  }
  settings: Record<string, string>
}

/**
 * Print-friendly receipt page matching the SkyWork branding.
 */
export default function ReceiptPage() {
  const params = useParams()
  const [data, setData] = useState<ReceiptData | null>(null)
  const [receiptType, setReceiptType] = useState<'payment' | 'booking'>('payment')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/receipts?payment_id=${params.id}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setData(json.data)
          if (json.data.payment.payment_type === 'advance') {
            setReceiptType('booking')
          }
        }
      })
      .finally(() => setLoading(false))
  }, [params.id])

  if (loading) return <div className="p-8 text-gray-500">Loading receipt...</div>
  if (!data) return <div className="p-8 text-gray-500">Receipt not found</div>

  const { payment, settings, receipt_number } = data
  const customerName = payment.client_name || payment.walk_in_name || 'Walk-in'
  const customerPhone = payment.client_phone || payment.walk_in_phone || ''
  const customerEmail = payment.client_email || ''

  const paidRupees = payment.amount_paid / 100
  const gstRate = payment.gst_applicable ? 18 : 0
  // For ledger-based payments, amount_paid IS the amount (amount_due is legacy/0)
  // Back-calculate the base amount from the paid amount when GST is applicable
  const amountRupees = gstRate > 0 ? Math.round((paidRupees / 1.18) * 100) / 100 : paidRupees
  const gstAmount = gstRate > 0 ? Math.round((paidRupees - amountRupees) * 100) / 100 : 0
  const totalWithGst = amountRupees + gstAmount
  const balanceDue = totalWithGst - paidRupees

  // Compute billing period and next renewal date for recurring bookings
  let renewsOn: string | null = null
  let billingPeriodStart: string | null = payment.billing_period_start
  let billingPeriodEnd: string | null = payment.billing_period_end

  if (payment.booking_type === 'recurring') {
    const payDate = payment.payment_date ? new Date(payment.payment_date) : new Date()

    if (!billingPeriodStart) {
      // Derive billing period from payment date and type
      // Use string manipulation to avoid timezone issues with toISOString()
      const payYear = payDate.getUTCFullYear()
      const payMonth = payDate.getUTCMonth()

      if (payment.payment_type === 'advance') {
        // Advance = paying for next month
        const startYear = payMonth === 11 ? payYear + 1 : payYear
        const startMonth = payMonth === 11 ? 0 : payMonth + 1
        const endDay = new Date(Date.UTC(startYear, startMonth + 1, 0)).getUTCDate()
        billingPeriodStart = `${startYear}-${String(startMonth + 1).padStart(2, '0')}-01`
        billingPeriodEnd = `${startYear}-${String(startMonth + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`
      } else {
        // Current month payment
        const endDay = new Date(Date.UTC(payYear, payMonth + 1, 0)).getUTCDate()
        billingPeriodStart = `${payYear}-${String(payMonth + 1).padStart(2, '0')}-01`
        billingPeriodEnd = `${payYear}-${String(payMonth + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`
      }
    }

    // Next renewal = 1st of the month after billing period
    if (billingPeriodEnd) {
      const [ey, em] = billingPeriodEnd.split('-').map(Number)
      const renewYear = em === 12 ? ey + 1 : ey
      const renewMonth = em === 12 ? 1 : em + 1
      renewsOn = `${renewYear}-${String(renewMonth).padStart(2, '0')}-01`
    }
  }

  const formatRupees = (n: number) => {
    return `Rs. ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const receiptTitle = receiptType === 'booking' ? 'BOOKING CONFIRMATION' : 'PAYMENT RECEIPT'

  const receiptDate = payment.payment_date
    ? new Date(payment.payment_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      {/* Print button */}
      <div className="max-w-[800px] mx-auto mb-4 flex gap-3 print:hidden px-4">
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Back
        </button>
        <select
          value={receiptType}
          onChange={e => setReceiptType(e.target.value as 'payment' | 'booking')}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
        >
          <option value="payment">Payment Receipt</option>
          <option value="booking">Booking Confirmation</option>
        </select>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 text-sm font-medium text-white bg-[#1E5184] rounded-lg hover:bg-[#174068]"
        >
          Print / Save as PDF
        </button>
      </div>

      {/* Receipt */}
      <div className="max-w-[800px] mx-auto bg-white shadow-lg rounded-lg overflow-hidden print:shadow-none print:rounded-none">
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #1E5184 0%, #4A90E2 100%)' }} className="text-white p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-[#1E5184] font-bold text-xl">
                SW
              </div>
              <div>
                <h1 className="text-2xl font-semibold">SKYWORK BORIVALI</h1>
                <p className="text-sm opacity-90">Elevate Your Workday</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-semibold">{receiptTitle}</h2>
              <p className="text-sm">Receipt No: {receipt_number}</p>
              <p className="text-sm">Date: {receiptDate}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-8">
          {/* Parties */}
          <div className="flex gap-6 mb-8">
            <div className="flex-1 bg-[#f5f9ff] rounded-md p-4">
              <h3 className="font-semibold text-[#1E5184] text-sm mb-2">SERVICE PROVIDER</h3>
              <div className="text-sm space-y-1">
                <p><strong>{settings.business_name || 'Webby Wonder'}</strong> (operating as {settings.operating_as || 'SkyWork Borivali'})</p>
                <p className="text-gray-600">{settings.registered_address}</p>
                <p className="mt-2">GSTIN: {settings.gstin}</p>
                <p>Contact: {settings.contact_phone}</p>
                <p>Email: {settings.contact_email}</p>
              </div>
            </div>
            <div className="flex-1 bg-[#f5f9ff] rounded-md p-4">
              <h3 className="font-semibold text-[#1E5184] text-sm mb-2">CUSTOMER</h3>
              <div className="text-sm space-y-1">
                <p><strong>{payment.company_name || customerName}</strong></p>
                {payment.company_name && <p>{customerName}</p>}
                <p className="mt-2">Contact: {customerPhone}</p>
                <p>Email: {customerEmail || 'NA'}</p>
              </div>
            </div>
          </div>

          {/* Service Details */}
          <div className="mb-8">
            <h3 className="font-semibold text-[#1E5184] border-b border-gray-200 pb-1 mb-4">SERVICE DETAILS</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1E5184] text-white">
                  <th className="text-left p-3" style={{ width: '60%' }}>Description</th>
                  <th className="text-left p-3">Qty</th>
                  <th className="text-left p-3">Rate</th>
                  <th className="text-right p-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="p-3">
                    {payment.package} Co-working Space ({payment.seats} seat{payment.seats > 1 ? 's' : ''})
                    <br />
                    <span className="text-gray-500 text-xs">
                      {payment.booking_type === 'recurring' && billingPeriodStart && billingPeriodEnd
                        ? `Period: ${formatDate(billingPeriodStart)} - ${formatDate(billingPeriodEnd)}`
                        : payment.booking_type === 'one-off' && payment.start_date
                          ? `From: ${formatDate(payment.start_date)}${payment.end_date ? ` to ${formatDate(payment.end_date)}` : ''}`
                          : ''}
                    </span>
                  </td>
                  <td className="p-3">{payment.booking_type === 'recurring' ? '1 month' : `${payment.days || 1} day${(payment.days || 1) > 1 ? 's' : ''}`}</td>
                  <td className="p-3">{formatRupees(payment.booking_rate / 100)}</td>
                  <td className="p-3 text-right">{formatRupees(amountRupees)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Renewal Info */}
          {renewsOn && (
            <div className="mb-4 text-sm text-gray-600">
              <strong className="text-[#1E5184]">Next Renewal:</strong> {formatDate(renewsOn)}
            </div>
          )}

          {/* Payment Summary */}
          <div className="mb-8">
            <h3 className="font-semibold text-[#1E5184] border-b border-gray-200 pb-1 mb-4">PAYMENT SUMMARY</h3>
            <div className="bg-[#f5f9ff] rounded-md p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Amount:</span>
                <span>
                  {formatRupees(amountRupees)}
                  {gstRate > 0 && <span className="text-gray-500 text-xs"> (+{gstRate}% GST extra)</span>}
                </span>
              </div>
              {gstRate > 0 && (
                <div className="flex justify-between">
                  <span>GST ({gstRate}%):</span>
                  <span>{formatRupees(gstAmount)}</span>
                </div>
              )}
              {receiptType === 'booking' ? (
                <>
                  <div className="flex justify-between">
                    <span>Advance Payment Received:</span>
                    <span>{formatRupees(paidRupees)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t border-dashed border-[#bbd1e8] pt-2 mt-2 text-[#1E5184]">
                    <span>Balance Due:</span>
                    <span>
                      {formatRupees(Math.max(0, balanceDue))}
                      {gstRate > 0 && <span className="text-xs font-normal"> (including GST)</span>}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between font-bold text-lg border-t border-dashed border-[#bbd1e8] pt-2 mt-2 text-[#1E5184]">
                  <span>Total Paid:</span>
                  <span>{formatRupees(paidRupees)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2">
                <span className="text-gray-500">Payment Method:</span>
                <span>
                  {payment.payment_method || '-'}
                  {payment.payment_reference && ` #${payment.payment_reference}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Date:</span>
                <span>{receiptDate}</span>
              </div>
              {gstRate > 0 && (
                <p className="text-xs italic text-gray-500 pt-1">
                  * GST invoice will be provided when payment is made in full.
                </p>
              )}
            </div>
          </div>

          {/* Terms */}
          <div className="mb-8">
            <h3 className="font-semibold text-[#1E5184] border-b border-gray-200 pb-1 mb-4">TERMS & CONDITIONS</h3>
            <div className="bg-gray-50 rounded-md p-4 text-xs">
              <ul className="list-disc pl-5 space-y-1">
                <li>Working hours: 9:00 AM to 9:00 PM</li>
                <li>Please carry valid ID proof</li>
                <li>Free WiFi and basic amenities included</li>
                <li>No refunds for unused days</li>
                <li>Rescheduling requires 24 hours advance notice</li>
              </ul>
            </div>
          </div>

          {/* Thank you */}
          <div className="text-center mb-4">
            <p className="text-lg font-semibold text-[#1E5184]">Thank you for choosing SkyWork Borivali!</p>
          </div>
          <p className="text-center text-xs italic text-gray-400">
            This is a computer-generated receipt and does not require signature.
          </p>
        </div>

        {/* Footer */}
        <div className="bg-[#f0f4f8] text-center p-5">
          <p className="font-semibold text-[#1E5184]">SKYWORK BORIVALI</p>
          <p className="text-sm text-gray-600 mt-1">
            {settings.workspace_address}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Contact: {settings.contact_phone} | Email: {settings.contact_email}
          </p>
        </div>
      </div>
    </div>
  )
}
