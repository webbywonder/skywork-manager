# SkyWork Manager

A minimal workspace management system for SkyWork Borivali co-working space.

## Project Context

Read `docs/PRD.md` for the full product requirements document. Read `docs/receipt-reference.html` for the existing receipt template that must be matched in styling and terms.

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Database:** SQLite via better-sqlite3 (no ORM, raw SQL is fine)
- **Styling:** Tailwind CSS
- **Language:** TypeScript
- **Deployment:** Local only, runs on localhost

## Project Structure

```
skywork-manager/
  src/
    app/
      layout.tsx            # Root layout with sidebar
      page.tsx              # Dashboard
      enquiries/
        page.tsx            # Enquiries list
      clients/
        page.tsx            # Clients list
        [id]/
          page.tsx          # Client detail (tabbed)
      bookings/
        page.tsx            # Bookings list
        [id]/
          page.tsx          # Booking detail + payment ledger
      deposits/
        page.tsx            # Deposits list
      expenses/
        page.tsx            # Expenses list + recurring tab
      settings/
        page.tsx            # Business details, categories
      api/
        enquiries/
        clients/
        bookings/
        payments/
        deposits/
        expenses/
        receipts/
        dashboard/
    components/
      layout/
        Sidebar.tsx
      ui/                   # Shared UI components (Table, Modal, Badge, Card, etc.)
      forms/                # Form components per module
    lib/
      db.ts                 # SQLite connection + init
      schema.sql            # Table creation SQL
      seed.ts               # Optional seed data
      utils.ts              # Shared helpers (date formatting, ID generation, etc.)
    types/
      index.ts              # TypeScript interfaces for all entities
  docs/
    PRD.md
    receipt-reference.html
  data/
    skywork.db              # SQLite database file (gitignored)
```

## Architecture Decisions

- **No ORM.** Use better-sqlite3 directly with raw SQL. Keep it simple.
- **No authentication.** Single user, local system.
- **Server-side data fetching** where possible using Next.js App Router conventions (Server Components + Route Handlers for mutations).
- **API routes** for all create/update/delete operations. Use Next.js Route Handlers (`app/api/`).
- **Forms** use standard React state + fetch to API routes. No form libraries needed.
- **Modals** for quick create/edit forms. Full pages for detail views.
- **SQLite DB file** lives in `data/skywork.db`. Auto-created on first run if missing.

## Database Conventions

- All tables have `id` (INTEGER PRIMARY KEY AUTOINCREMENT), `created_at`, `updated_at`
- `updated_at` is set via trigger or application code on every update
- Display IDs (like SW-01, SW-250226-01) are generated in application code and stored as strings
- Foreign keys are enforced (`PRAGMA foreign_keys = ON`)
- Dates stored as ISO strings (YYYY-MM-DD)
- Amounts stored as integers in paise/cents to avoid floating point issues (5000.00 = 500000)

## UI/UX Guidelines

- **Minimal and functional.** This is an internal tool, not a customer-facing product.
- **SkyWork brand colour:** Primary blue `#1E5184`, gradient to `#4A90E2`
- **Sidebar navigation** with icons. Collapsible on mobile.
- **Tables** are the primary data display. Include search, filters, and pagination where needed.
- **Status badges** with colour coding: green (active/paid), yellow (pending/partial), red (overdue/cancelled), grey (inactive/completed)
- **Toast notifications** for success/error on form submissions.
- **Confirmation dialogs** for destructive actions (delete, cancel booking, refund deposit).
- Use Tailwind CSS utility classes only. No additional CSS frameworks.

## Key Business Logic

### Recurring Billing Auto-generation
When the dashboard loads (or "Generate Dues" button is pressed), call `POST /api/dashboard/generate-dues`:
1. Fetch all active recurring bookings with their client join_date and rate
2. For each booking, calculate the current billing cycle based on join_date
3. Check if a `scheduled_due` payment already exists for that cycle
4. If not, insert one with `amount_due = rate`, `amount_paid = 0`, `status = 'pending'`
5. Also check for past cycles that might have been missed (e.g. if system wasn't opened for a month)

### Overdue Logic
A payment is overdue if: `status = 'pending'` AND `billing_period_start + 7 days < today`

### Credit Balance
When a payment's `amount_paid > amount_due`, the excess is added to `clients.credit_balance`. This is display-only and not auto-applied to future dues.

### Receipt Number Format
`SW-YYMMDD-NN` where NN is a daily sequential counter.

## Implementation Order

Follow the phases in `docs/PRD.md` Section 10. Build each phase completely before moving to the next:
1. Project Setup & Database
2. Clients
3. Bookings & Payments
4. Deposits
5. Enquiries
6. Expenses
7. Receipts
8. Dashboard & Reports

## Important Notes

- Currency is INR (Rs.). Display as "Rs. X,XXX" with Indian number formatting (commas at lakhs/crores).
- The receipt HTML in `docs/receipt-reference.html` is the exact styling reference. Match the blue gradient header, layout structure, and terms & conditions word-for-word.
- GST is 18% and is optional per booking (toggled via `gst_applicable` field).
- Workspace capacity is 13 seats (9 open + 4 cabin). Used for occupancy calculation on dashboard.
- Operating hours: 9 AM to 9 PM, Sunday off.

## Autonomous Execution

This project is designed to be built autonomously using the Ralph Wiggum plugin. Each phase should be fully functional before moving to the next.

### Phase Completion Criteria

After completing each phase:
1. Run the dev server (`npm run dev`) and verify no build errors
2. Test the relevant pages load correctly in the browser
3. Test CRUD operations work for the module
4. Commit the work with a descriptive message: `git commit -m "Phase N: [description]"`
5. Only then move to the next phase

### If Stuck

After 10 iterations on the same error:
1. Document what is blocking progress in `docs/BLOCKERS.md`
2. List what was attempted
3. Suggest alternative approaches
4. Move on to the next phase if possible, or output `<promise>BLOCKED</promise>`
