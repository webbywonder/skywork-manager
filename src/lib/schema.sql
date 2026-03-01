PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS enquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  source TEXT NOT NULL CHECK(source IN ('Google', 'Walk-in', 'Referral', 'WhatsApp', 'Other')),
  package_interest TEXT NOT NULL CHECK(package_interest IN ('Daily', 'Weekly', '15-Day', 'Monthly', 'Private Cabin', 'Custom')),
  seats INTEGER NOT NULL DEFAULT 1,
  date_requirements TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'New' CHECK(status IN ('New', 'Contacted', 'Follow-up', 'Converted', 'Lost')),
  follow_up_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  company_name TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  documents TEXT,
  package_type TEXT NOT NULL CHECK(package_type IN ('Daily', 'Weekly', '15-Day', 'Monthly', 'Private Cabin', 'Custom')),
  seats INTEGER NOT NULL DEFAULT 1,
  rate INTEGER NOT NULL,
  join_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Inactive')),
  notes TEXT,
  credit_balance INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id TEXT NOT NULL UNIQUE,
  client_id INTEGER REFERENCES clients(id),
  walk_in_name TEXT,
  walk_in_phone TEXT,
  type TEXT NOT NULL CHECK(type IN ('one-off', 'recurring')),
  package TEXT NOT NULL CHECK(package IN ('Daily', 'Weekly', '15-Day', 'Monthly', 'Private Cabin', 'Custom')),
  seats INTEGER NOT NULL DEFAULT 1,
  rate INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT,
  days INTEGER,
  gst_applicable INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Completed', 'Cancelled')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL REFERENCES bookings(id),
  payment_type TEXT NOT NULL CHECK(payment_type IN ('scheduled_due', 'advance', 'adhoc')),
  billing_period_start TEXT,
  billing_period_end TEXT,
  amount_due INTEGER NOT NULL,
  amount_paid INTEGER NOT NULL DEFAULT 0,
  payment_date TEXT,
  payment_method TEXT CHECK(payment_method IN ('UPI', 'Cash', 'Bank Transfer', 'GPay')),
  payment_reference TEXT,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'Partial', 'Paid', 'Overdue')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS deposits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  amount INTEGER NOT NULL,
  received_date TEXT NOT NULL,
  payment_method TEXT NOT NULL CHECK(payment_method IN ('UPI', 'Cash', 'Bank Transfer', 'GPay')),
  payment_reference TEXT,
  status TEXT NOT NULL DEFAULT 'Held' CHECK(status IN ('Held', 'Refunded')),
  refund_date TEXT,
  refund_method TEXT CHECK(refund_method IN ('UPI', 'Cash', 'Bank Transfer', 'GPay')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recurring_expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount INTEGER NOT NULL,
  frequency TEXT NOT NULL CHECK(frequency IN ('Monthly', 'Quarterly', 'Half-yearly', 'Yearly')),
  next_due_date TEXT NOT NULL,
  auto_remind INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Paused')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recurring_expense_id INTEGER REFERENCES recurring_expenses(id),
  date TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount INTEGER NOT NULL,
  payment_method TEXT CHECK(payment_method IN ('UPI', 'Cash', 'Bank Transfer', 'GPay')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Triggers for updated_at
CREATE TRIGGER IF NOT EXISTS update_enquiries_timestamp AFTER UPDATE ON enquiries
BEGIN UPDATE enquiries SET updated_at = datetime('now') WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS update_clients_timestamp AFTER UPDATE ON clients
BEGIN UPDATE clients SET updated_at = datetime('now') WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS update_bookings_timestamp AFTER UPDATE ON bookings
BEGIN UPDATE bookings SET updated_at = datetime('now') WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS update_payments_timestamp AFTER UPDATE ON payments
BEGIN UPDATE payments SET updated_at = datetime('now') WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS update_deposits_timestamp AFTER UPDATE ON deposits
BEGIN UPDATE deposits SET updated_at = datetime('now') WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS update_recurring_expenses_timestamp AFTER UPDATE ON recurring_expenses
BEGIN UPDATE recurring_expenses SET updated_at = datetime('now') WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS update_expenses_timestamp AFTER UPDATE ON expenses
BEGIN UPDATE expenses SET updated_at = datetime('now') WHERE id = NEW.id; END;

CREATE TABLE IF NOT EXISTS renewals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  services TEXT NOT NULL DEFAULT 'Domain',
  client_rate INTEGER NOT NULL,
  your_cost INTEGER NOT NULL DEFAULT 0,
  renewal_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Discontinued', 'Managed by Other')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS renewal_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  renewal_id INTEGER NOT NULL REFERENCES renewals(id),
  amount_paid INTEGER NOT NULL,
  payment_date TEXT NOT NULL,
  payment_method TEXT CHECK(payment_method IN ('UPI', 'Cash', 'Bank Transfer', 'GPay')),
  year INTEGER NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TRIGGER IF NOT EXISTS update_renewals_timestamp AFTER UPDATE ON renewals
BEGIN UPDATE renewals SET updated_at = datetime('now') WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS update_renewal_payments_timestamp AFTER UPDATE ON renewal_payments
BEGIN UPDATE renewal_payments SET updated_at = datetime('now') WHERE id = NEW.id; END;
