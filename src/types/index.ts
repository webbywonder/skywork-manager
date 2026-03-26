export interface Enquiry {
  id: number
  date: string
  name: string
  phone: string
  email: string | null
  source: 'Google' | 'Walk-in' | 'Referral' | 'WhatsApp' | 'Other'
  package_interest: PackageType
  seats: number
  date_requirements: string | null
  notes: string | null
  status: 'New' | 'Contacted' | 'Follow-up' | 'Converted' | 'Lost'
  follow_up_date: string | null
  created_at: string
  updated_at: string
}

export type PackageType = 'Daily' | 'Weekly' | '15-Day' | 'Monthly' | 'Private Cabin' | 'Custom'

export interface Client {
  id: number
  client_id: string
  name: string
  company_name: string | null
  phone: string
  email: string | null
  documents: string | null
  package_type: PackageType
  seats: number
  rate: number
  join_date: string
  status: 'Active' | 'Inactive'
  notes: string | null
  credit_balance: number
  created_at: string
  updated_at: string
}

export type BookingType = 'one-off' | 'recurring'
export type BookingStatus = 'Active' | 'Completed' | 'Cancelled'

export interface Booking {
  id: number
  booking_id: string
  client_id: number | null
  walk_in_name: string | null
  walk_in_phone: string | null
  type: BookingType
  package: PackageType
  seats: number
  rate: number
  start_date: string
  end_date: string | null
  days: number | null
  gst_applicable: number
  status: BookingStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export type PaymentType = 'scheduled_due' | 'advance' | 'adhoc'
export type PaymentStatus = 'Pending' | 'Partial' | 'Paid' | 'Overdue'
export type PaymentMethod = 'UPI' | 'Cash' | 'Bank Transfer' | 'GPay'

export interface Payment {
  id: number
  booking_id: number
  payment_type: PaymentType
  billing_period_start: string | null
  billing_period_end: string | null
  amount_due: number
  amount_paid: number
  payment_date: string | null
  payment_method: PaymentMethod | null
  payment_reference: string | null
  status: PaymentStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export type DepositStatus = 'Held' | 'Refunded'

export interface Deposit {
  id: number
  client_id: number
  amount: number
  received_date: string
  payment_method: PaymentMethod
  payment_reference: string | null
  status: DepositStatus
  refund_date: string | null
  refund_method: PaymentMethod | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type ExpenseFrequency = 'Monthly' | 'Quarterly' | 'Half-yearly' | 'Yearly'

export interface RecurringExpense {
  id: number
  category: string
  description: string
  amount: number
  frequency: ExpenseFrequency
  next_due_date: string
  auto_remind: number
  status: 'Active' | 'Paused'
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Expense {
  id: number
  recurring_expense_id: number | null
  date: string
  category: string
  description: string
  amount: number
  payment_method: PaymentMethod | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface BookingWithClient extends Booking {
  client_name: string | null
  client_client_id: string | null
  client_phone: string | null
}

export interface PaymentWithBooking extends Payment {
  booking_id_display: string
  client_name: string | null
}

export interface DepositWithClient extends Deposit {
  client_name: string
  client_client_id: string
}

export type RenewalStatus = 'Active' | 'Discontinued' | 'Managed by Other'

export interface Renewal {
  id: number
  domain_name: string
  client_name: string
  services: string
  client_rate: number
  your_cost: number
  renewal_date: string
  status: RenewalStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface RenewalPayment {
  id: number
  renewal_id: number
  amount_paid: number
  payment_date: string
  payment_method: PaymentMethod | null
  year: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface BookingExtra {
  id: number
  booking_id: number
  description: string
  amount: number
  date: string
  is_paid: number
  created_at: string
  updated_at: string
}
