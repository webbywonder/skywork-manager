# SkyWork Borivali - Workspace Management System

## Product Requirements Document (PRD)

**Version:** 1.1
**Date:** 26 February 2026
**Author:** Darshan Gada
**Status:** Draft

---

## 1. Overview

A minimal, locally-hosted workspace management system for SkyWork Borivali to replace the current Excel-based workflow. The system will manage enquiries, clients, bookings (with payments), deposits, expenses, and receipts through a simple web dashboard.

**Tech Stack:** Next.js (App Router) + SQLite (better-sqlite3) + Tailwind CSS
**Deployment:** Local only, no authentication required

---

## 2. Problem Statement

Managing recurring rent, deposits, one-off bookings, and expenses across multiple Excel sheets is tedious and error-prone. Key pain points include tracking who has paid for which month, handling overpayments/credits, managing one-off and recurring bookings in one place, chasing deposit refunds, and generating reports.

---

## 3. Core Modules

### 3.1 Enquiries

A standalone log for tracking workspace enquiries. Not linked to the Client entity.

**Fields:**
- Date
- Name
- Phone
- Email (optional)
- Source (Google, Walk-in, Referral, WhatsApp, Other)
- Package Interest (Daily, Weekly, 15-Day, Monthly, Private Cabin)
- Seats required
- Date requirements (optional)
- Notes
- Status (New, Contacted, Follow-up, Converted, Lost)
- Follow-up date (optional)

**Functionality:**
- Log new enquiries
- Filter/search by status, date, source
- Mark status updates
- Sort by follow-up date to surface pending follow-ups

---

### 3.2 Clients

Central entity that links bookings, rent, deposits, and payments together.

**Fields:**
- Client ID (auto-generated, e.g. SW-01)
- Name
- Company name (optional)
- Phone
- Email (optional)
- Documents on file (Aadhar, PAN, etc.)
- Package type (Daily, Weekly, 15-Day, Monthly, Private Cabin)
- Seats
- Rate per cycle (custom per client, e.g. 5,000/month or 10,000/month)
- Join date (used as billing anchor date)
- Status (Active, Inactive)
- Notes

**Functionality:**
- CRUD operations
- Client detail page showing linked deposit, bookings, payment history, and current balance/credit
- Quick view of active vs inactive clients

---

### 3.3 Bookings & Payments

A **Booking** represents the agreement/contract with a client (whether daily, weekly, or monthly). A booking can have multiple **Payments** logged against it over time.

**Booking Types:**

- **One-off (Daily, Weekly, 15-Day, Custom):** A single booking with a defined start/end date. One or more payments logged against it (e.g. advance + balance).
- **Recurring (Monthly, Private Cabin):** A continuous booking that stays active until the client leaves. The system auto-generates a monthly **Payment Due** entry based on the client's join date as the billing anchor. Payments are manually logged against these dues.

**Booking Fields:**
- Booking ID (auto-generated, e.g. SW-250226-01)
- Client (linked) or walk-in name + phone (for one-off without client record)
- Type (One-off, Recurring)
- Package (Daily, Weekly, 15-Day, Monthly, Private Cabin, Custom)
- Seats
- Rate (custom per client)
- Start date
- End date (for one-off) / open-ended (for recurring)
- Days count (for one-off)
- GST applicable (yes/no, 18%)
- Status (Active, Completed, Cancelled)
- Notes

**Payment Fields:**
- Booking (linked)
- Payment type (Scheduled Due, Advance, Ad-hoc)
- Billing period (for recurring, e.g. "15 Feb 2026 - 14 Mar 2026")
- Amount due
- Amount paid
- Payment date
- Payment method (UPI, Cash, Bank Transfer, GPay)
- Payment reference (optional)
- Status (Pending, Partial, Paid, Overdue)
- Notes

**How recurring billing works:**

1. When a recurring booking is created, the system uses the client's **join date** as the billing anchor (e.g. joined 15th = due every 15th).
2. Each month, a Payment record with type "Scheduled Due" is auto-generated under the booking with the client's custom rate.
3. You manually log when payment is received, updating the amount paid, method, and reference.
4. If a client overpays, the excess is stored as **credit balance** on the client profile (not auto-adjusted against future dues).
5. Overdue indicator appears when payment is not received within 7 days of due date.

**Auto-generation logic:**
- Runs when the dashboard loads (+ a manual "Generate Dues" button)
- For each active recurring booking, if no Scheduled Due payment exists for the current billing cycle, one is created
- Billing cycle: from join-date of current month to day before join-date of next month

**How one-off bookings work:**

1. Booking is created with start/end dates, days, rate, and total calculated.
2. Payments are logged against it (e.g. 500 advance on booking, 250 balance on day 1).
3. Booking auto-marks as Completed once fully paid and end date has passed.

**Functionality:**
- Create one-off or recurring bookings
- Auto-generate monthly dues for recurring bookings
- Log payments against any booking
- Payment ledger per booking showing full history
- Show overpayment as credit on client profile
- Filter bookings by type, status, client
- Generate receipt or booking confirmation from a payment record

---

### 3.4 Deposits

Linked to a client. Tracks security deposits held and refunded.

**Fields:**
- Client (linked)
- Amount
- Received date
- Payment method (UPI, Cash, Bank Transfer, GPay)
- Payment reference (optional)
- Status (Held, Refunded)
- Refund date (optional)
- Refund method (optional)
- Notes

**Functionality:**
- Log deposit against a client
- Mark as refunded with date and method
- Visible on client profile
- Summary view of all held vs refunded deposits

---

### 3.5 Expenses

Track both recurring and one-off business expenses.

**Expense Categories (pre-defined, editable):**
- WiFi / Internet
- Electricity
- Cleaning Service
- Stationery & Supplies (cleaning liquid, toilet paper, handwash, etc.)
- Tea / Coffee / Snacks
- Rent (if applicable)
- Maintenance
- Other

**Recurring Expense Fields:**
- Category
- Description (e.g. "Airtel WiFi", "JioFiber")
- Amount
- Frequency (Monthly, Quarterly, Half-yearly, Yearly)
- Next due date
- Auto-generate reminder (yes/no)
- Status (Active, Paused)
- Notes

**One-off Expense Fields:**
- Date
- Category
- Description
- Amount
- Payment method
- Notes

**Functionality:**
- Log one-off expenses quickly
- Define recurring expenses with different frequencies (monthly, quarterly, half-yearly, yearly)
- Auto-generate expense entries based on frequency when due
- Monthly expense summary by category
- Edit/delete expenses

---

### 3.6 Receipts

Simple document generation for clients who need them.

**Two types:**

1. **Payment Receipt:** Generated from a specific Payment record. For clients whose company requires proof of payment.
2. **Booking Confirmation:** Generated when a client pays in advance. Confirms the booking details and advance payment received, with balance due noted.

**Generated from:** A Payment record (linked to a Booking)

**Receipt includes:**
- Receipt number (auto-generated)
- Receipt type (Payment Receipt / Booking Confirmation)
- Date
- Service provider details (Webby Wonder, GSTIN, address)
- Customer details (from client record or walk-in details)
- Service description (package, dates, seats)
- Amount breakdown (amount, GST if applicable, total)
- For Booking Confirmation: advance paid, balance due, balance due date
- Payment details (method, reference, date)
- Terms & conditions (matching existing template exactly):
  - Working hours: 9:00 AM to 9:00 PM
  - Please carry valid ID proof
  - Free WiFi and basic amenities included
  - No refunds for unused days
  - Rescheduling requires 24 hours advance notice
- "This is a computer-generated receipt and does not require signature."

**Functionality:**
- Generate Payment Receipt or Booking Confirmation from a payment record
- Print-friendly / downloadable as PDF
- Follows existing receipt branding (SkyWork blue gradient header, same layout)

---

## 4. Reports

### 4.1 Client Report
- Individual client page showing:
  - Profile details
  - Current balance / credit
  - Deposit status
  - Active booking(s) with payment ledger (all payments with status)
  - Completed bookings history
  - Total revenue from this client

### 4.2 Overall Dashboard Report
- **Revenue summary:** Monthly revenue (payments collected), with month-over-month comparison
- **Outstanding dues:** List of clients with pending/overdue payments
- **Occupancy:** Active seats filled vs total capacity (13 seats)
- **Expense summary:** Monthly expenses by category, total expenses
- **Profit/Loss:** Revenue minus expenses for the month
- **Deposits:** Total deposits held

---

## 5. Database Schema (SQLite)

### Tables

**enquiries**
- id, date, name, phone, email, source, package_interest, seats, date_requirements, notes, status, follow_up_date, created_at, updated_at

**clients**
- id, client_id (display ID like SW-01), name, company_name, phone, email, documents, package_type, seats, rate, join_date, status, notes, credit_balance, created_at, updated_at

**bookings**
- id, booking_id (display ID), client_id (nullable FK), walk_in_name, walk_in_phone, type (one-off, recurring), package, seats, rate, start_date, end_date (nullable for recurring), days (for one-off), gst_applicable, status, notes, created_at, updated_at

**payments**
- id, booking_id (FK), payment_type (scheduled_due, advance, adhoc), billing_period_start (nullable), billing_period_end (nullable), amount_due, amount_paid, payment_date, payment_method, payment_reference, status, notes, created_at, updated_at

**deposits**
- id, client_id (FK), amount, received_date, payment_method, payment_reference, status, refund_date, refund_method, notes, created_at, updated_at

**recurring_expenses**
- id, category, description, amount, frequency, next_due_date, auto_remind, status, notes, created_at, updated_at

**expenses**
- id, recurring_expense_id (nullable FK), date, category, description, amount, payment_method, notes, created_at, updated_at

---

## 6. UI Structure

### Navigation (Sidebar)
- Dashboard (home/reports)
- Enquiries
- Clients
- Bookings
- Deposits
- Expenses
- Settings (categories, business details for receipts)

### Key Pages
- **Dashboard:** Revenue card, outstanding dues card, occupancy card, expense card, P&L card, quick actions (log payment, new booking, new enquiry)
- **Enquiries:** Table with filters + "New Enquiry" button
- **Clients:** List view with status filter + "New Client" form. Click-through to client detail page
- **Client Detail:** Tabbed view (Overview, Bookings & Payments, Deposit, Generate Receipt)
- **Bookings:** Table with type/status filter + "New Booking" form. Click-through to booking detail with payment ledger
- **Booking Detail:** Booking info + payment history table + "Log Payment" button + "Generate Receipt/Confirmation" button
- **Deposits:** Table showing all deposits with held/refunded filter
- **Expenses:** Table with category filter + "Log Expense" form. Separate tab for managing recurring expenses

---

## 7. Non-functional Requirements

- **Performance:** Instant for the data volume expected (< 100 clients). SQLite is more than sufficient.
- **Data safety:** SQLite DB file stored locally. User responsible for backups.
- **Browser support:** Modern browsers (Chrome, Edge, Firefox).
- **Mobile responsive:** Basic responsiveness for quick data entry from phone on local network (optional/nice-to-have).
- **No external dependencies:** No cloud services, no API keys, no login.

---

## 8. Out of Scope (v1)

- Multi-user access / authentication
- Cloud hosting / deployment
- Automated WhatsApp/email notifications
- GST filing / tax reports
- Data import from existing Excel sheets
- Invoice generation (separate from receipt)
- Seat allocation / floor plan view

---

## 9. Future Considerations (v2)

- Import existing data from CSV
- WhatsApp integration for payment reminders
- Automated receipt emailing
- Multi-location support
- Backup/restore functionality
- GST-compliant invoice generation

---

## 10. Implementation Phases

Build in this order. Each phase should be fully working before moving to the next.

### Phase 1: Project Setup & Database
- Initialise Next.js (App Router) with Tailwind CSS
- Set up SQLite with better-sqlite3
- Create all tables with a seed/migration script
- Build the sidebar layout shell with navigation

### Phase 2: Clients Module
- Client list page with status filter and search
- New Client form (modal or inline)
- Client detail page (shell with tabs)
- Edit/deactivate client

### Phase 3: Bookings & Payments Module
- Bookings list page with type/status filters
- New Booking form (one-off and recurring types)
- Booking detail page with payment ledger
- Log Payment form against a booking
- Auto-generate scheduled dues for recurring bookings (API route triggered on dashboard load + manual button)
- Credit balance calculation on client when overpayment occurs
- Overdue status logic (7 days past due date)

### Phase 4: Deposits Module
- Deposits list page with held/refunded filter
- Log deposit against a client
- Mark deposit as refunded
- Show deposit on client detail page

### Phase 5: Enquiries Module
- Enquiries list page with status/source/date filters
- New Enquiry form
- Status update flow
- Sort by follow-up date

### Phase 6: Expenses Module
- Expenses list with category filter
- Log one-off expense form
- Recurring expenses management (CRUD)
- Auto-generate expense entries from recurring definitions
- Monthly expense summary view

### Phase 7: Receipts
- Payment Receipt generation from a payment record
- Booking Confirmation generation from an advance payment
- Print-friendly HTML page matching existing SkyWork branding
- Browser print-to-PDF functionality

### Phase 8: Dashboard & Reports
- Dashboard with summary cards (revenue, outstanding, occupancy, expenses, P&L)
- Outstanding dues list
- Monthly revenue chart/comparison
- Client report (aggregated on client detail page)
- "Generate Dues" button on dashboard

---

## 11. Business Constants

These values are used across the system for receipts, settings defaults, and display.

**Service Provider:**
- Business Name: Webby Wonder (operating as SkyWork Borivali)
- Registered Address: 5TH FLOOR, 514, PRIDE OF KALINA, KOLIVERY VILLAGE ROAD, KALINA, SANTACRUZ EAST, Mumbai Suburban, Maharashtra, 400055
- GSTIN: 27AWPPG3553P1ZU
- Contact: +91 9029208698
- Email: gadadarshan@gmail.com

**Workspace Address (for receipts footer):**
- 1502, Om Siddhivinayak SRA CHS Ltd, Carter Road No. 1, Near Borivali Railway Station, Behind Kasturba Road Police Station, PBC Building Gate No. 2, Borivali East, Mumbai, Maharashtra 400066

**Workspace Capacity:** 13 seats (9 open area + 4 private cabin)
**Operating Hours:** 9:00 AM to 9:00 PM (Sunday off)
**GST Rate:** 18%

**Default Package Rates (can be overridden per client):**
- Daily Pass: Rs. 250/day
- Weekly Package: Rs. 1,500/week
- 15-Day Package: Rs. 3,000
- Monthly Membership: Rs. 5,000/month
- Private Cabin (4-seater): Rs. 10,000/month
