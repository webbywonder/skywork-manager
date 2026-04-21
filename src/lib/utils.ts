/**
 * Formats an amount in paise to Indian Rupee display format.
 * Example: 500000 -> "Rs. 5,000"
 */
export function formatCurrency(paise: number): string {
  const rupees = paise / 100
  return `Rs. ${formatIndianNumber(rupees)}`
}

/**
 * Formats a number with Indian number system grouping.
 * Example: 100000 -> "1,00,000"
 */
export function formatIndianNumber(num: number): string {
  const parts = num.toFixed(0).split('.')
  let intPart = parts[0]
  const isNegative = intPart.startsWith('-')
  if (isNegative) {
    intPart = intPart.slice(1)
  }

  if (intPart.length <= 3) {
    return (isNegative ? '-' : '') + intPart
  }

  const lastThree = intPart.slice(-3)
  const remaining = intPart.slice(0, -3)
  const formatted = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',')

  return (isNegative ? '-' : '') + formatted + ',' + lastThree
}

/**
 * Generates a client display ID in format SW-NN.
 */
export function generateClientId(lastId: number): string {
  const next = lastId + 1
  return `SW-${String(next).padStart(2, '0')}`
}

/**
 * Generates a booking display ID in format SW-YYMMDD-NN.
 */
export function generateBookingId(date: string, dailyCount: number): string {
  const d = new Date(date)
  const yy = String(d.getFullYear()).slice(-2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const nn = String(dailyCount + 1).padStart(2, '0')
  return `SW-${yy}${mm}${dd}-${nn}`
}

/**
 * Generates a receipt number in format SW-YYMMDD-NN.
 */
export function generateReceiptNumber(date: string, dailyCount: number): string {
  return generateBookingId(date, dailyCount)
}

/**
 * Formats date string to a readable format.
 * Example: "2026-02-26" -> "26 Feb 2026"
 */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

/**
 * Returns today's date as ISO string (YYYY-MM-DD).
 */
export function todayISO(): string {
  const d = new Date()
  return d.toISOString().split('T')[0]
}

/**
 * Converts rupees to paise for storage.
 */
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100)
}

/**
 * Converts paise to rupees for display.
 */
export function toRupees(paise: number): number {
  return paise / 100
}

/**
 * Computes total due for a recurring booking from start_date to endDate (or today).
 *
 * Billing cycles:
 *  - 'calendar' (one-to-one, default): aligned to the calendar month. If the
 *    start day is not the 1st, the first month is prorated at rate/30 × days
 *    remaining; every subsequent calendar month is charged in full.
 *  - 'anniversary' (booking-to-booking): periods run from the start day to the
 *    same day next month (e.g. 5th → 5th). Each period started is charged in
 *    full — no proration.
 *
 * @param endDate - Optional end date (e.g. completed_date). Defaults to today.
 * @param billingCycle - Defaults to 'calendar' for backwards compatibility.
 */
export function computeRecurringTotalDue(
  monthlyDue: number,
  startDate: string,
  endDate?: string,
  billingCycle: 'calendar' | 'anniversary' = 'calendar',
): number {
  const start = new Date(startDate)
  const now = endDate ? new Date(endDate) : new Date()

  if (billingCycle === 'anniversary') {
    let periods = (now.getFullYear() - start.getFullYear()) * 12
      + (now.getMonth() - start.getMonth())
    if (now.getDate() >= start.getDate()) periods += 1
    return monthlyDue * Math.max(1, periods)
  }

  const startDay = start.getDate()

  if (startDay === 1) {
    const monthsElapsed = (now.getFullYear() - start.getFullYear()) * 12
      + (now.getMonth() - start.getMonth()) + 1
    return monthlyDue * Math.max(1, monthsElapsed)
  }

  // Prorate the first partial month: rate / 30 × days remaining (inclusive of start day, using standardised 30-day month)
  const daysRemaining = 30 - startDay + 1
  const proratedFirst = Math.round(monthlyDue / 30 * daysRemaining)

  // Full calendar months after the start month up to and including current month
  const fullMonths = (now.getFullYear() - start.getFullYear()) * 12
    + (now.getMonth() - start.getMonth())

  return proratedFirst + monthlyDue * Math.max(0, fullMonths)
}
