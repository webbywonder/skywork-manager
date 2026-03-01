# Renewals Module Design

**Date:** 2026-03-01
**Module:** WebbyWonder — Domain & Hosting Renewals

## Purpose

Track domain/hosting renewal dates and client payments so nothing gets missed. See cost vs revenue margins per client.

## Data Model

### `renewals` table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK AUTOINCREMENT | |
| domain_name | TEXT | NOT NULL | e.g., `raeisp.com` |
| client_name | TEXT | NOT NULL | e.g., `RAE ISP` |
| services | TEXT | NOT NULL | What's included: `Domain`, `Domain + Hosting`, `Domain + Hosting + Email` |
| client_rate | INTEGER | NOT NULL | Amount client pays (paise) |
| your_cost | INTEGER | NOT NULL DEFAULT 0 | Actual cost to registrar/provider (paise) |
| renewal_date | TEXT | NOT NULL | Next renewal date (YYYY-MM-DD) |
| status | TEXT | NOT NULL DEFAULT 'Active' | `Active`, `Discontinued`, `Managed by Other` |
| notes | TEXT | | Free text for splits, remarks |
| created_at | TEXT | DEFAULT datetime('now') | |
| updated_at | TEXT | DEFAULT datetime('now') | |

### `renewal_payments` table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK AUTOINCREMENT | |
| renewal_id | INTEGER | FK → renewals(id), NOT NULL | |
| amount_paid | INTEGER | NOT NULL | Amount received from client (paise) |
| payment_date | TEXT | NOT NULL | |
| payment_method | TEXT | UPI/Cash/Bank Transfer/GPay | |
| year | INTEGER | NOT NULL | Which renewal year this covers (2026, 2027...) |
| notes | TEXT | | Payment reference, remarks |
| created_at | TEXT | DEFAULT datetime('now') | |
| updated_at | TEXT | DEFAULT datetime('now') | |

## UI

### `/renewals` page

- List view sorted by nearest renewal date
- Columns: Domain, Client, Services, Client Rate, Your Cost, Margin, Renewal Date, Payment Status (current year), Status
- Status badges: Active (green), Discontinued (gray), Managed by Other (blue)
- Payment status: Paid (green), Unpaid (yellow), Overdue (red)
- Summary row at bottom: total annual revenue, total cost, total margin
- Filter: Active / All

### Add/Edit Renewal modal

Standard modal form (same pattern as other modules).

### Log Payment modal

Fields: amount (pre-filled with client_rate), payment date, payment method, year, notes.

## Dashboard Integration

Add "Upcoming Renewals" card to main dashboard:
- Renewals due in next 30 days
- Overdue renewals (past renewal date, no payment for current year)
- Count + total amount

## Business Logic

- **Overdue:** renewal_date is past AND no payment exists in `renewal_payments` for that year
- **Auto-advance:** When payment is logged for current year, renewal_date advances by 1 year
- **Margin:** client_rate - your_cost (computed, not stored)
- **Amounts in paise:** Consistent with rest of the system

## Seed Data

| Domain | Client | Services | Client Rate | Your Cost | Status |
|--------|--------|----------|-------------|-----------|--------|
| techsolutiongroup.in | Tech Solution Group | Domain | 1000 | — | Active |
| airnet-telecom.com | Airnet Telecom | Domain | 1700 | — | Active |
| raeisp.com | RAE ISP | Domain + Hosting + Email | 5000 | — | Active |
| hi5sol (domain TBD) | Hi5 Solutions | Domain + Hosting | 3000 | 1000 | Active (notes: 1000 to valley, 2000 to darshan) |
| englishatease.in | English At Ease | Domain | 1000 | — | Discontinued |
| leroynetworks.com | Leroy Networks | Domain + Hosting | 2500 | — | Active |
| grandhomes.in | Grand Homes | Domain + Hosting | 2500 | — | Active |
| healinggrace.co.in | Healing Grace | Hosting + Domain | 0 | 0 | Managed by Other |
| perfectforwarders (domain TBD) | Perfect Forwarders | Domain + Hosting | 2500 | — | Active |

Note: Seed data rates are in rupees above for readability. Will be stored as paise (multiply by 100).
