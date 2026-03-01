import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_DIR = path.join(process.cwd(), 'data')
const DB_PATH = path.join(DB_DIR, 'skywork.db')
const SCHEMA_PATH = path.join(process.cwd(), 'src', 'lib', 'schema.sql')

/**
 * Seeds initial renewal data into the database.
 * Safe to run multiple times — checks for existing entries by domain_name.
 */
function seedRenewals(): void {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true })
  }

  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Ensure schema exists
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8')
  db.exec(schema)

  const insert = db.prepare(`
    INSERT OR IGNORE INTO renewals (domain_name, client_name, services, client_rate, your_cost, renewal_date, status, notes)
    SELECT ?, ?, ?, ?, ?, ?, ?, ?
    WHERE NOT EXISTS (SELECT 1 FROM renewals WHERE domain_name = ?)
  `)

  // All rates in rupees, converted to paise (* 100)
  const renewals = [
    { domain: 'techsolutiongroup.in', client: 'Tech Solution Group', services: 'Domain', rate: 1000, cost: 0, date: '2026-06-01', status: 'Active', notes: null },
    { domain: 'airnet-telecom.com', client: 'Airnet Telecom', services: 'Domain', rate: 1700, cost: 0, date: '2026-06-01', status: 'Active', notes: null },
    { domain: 'raeisp.com', client: 'RAE ISP', services: 'Domain + Hosting + Email', rate: 5000, cost: 0, date: '2026-06-01', status: 'Active', notes: 'Domain 1700 + Hosting 2000 + Email 1300' },
    { domain: 'hi5sol', client: 'Hi5 Solutions', services: 'Domain + Hosting', rate: 3000, cost: 1000, date: '2026-06-01', status: 'Active', notes: '1000 to valley, 2000 to darshan' },
    { domain: 'englishatease.in', client: 'English At Ease', services: 'Domain', rate: 1000, cost: 0, date: '2026-01-01', status: 'Discontinued', notes: 'No longer being renewed' },
    { domain: 'leroynetworks.com', client: 'Leroy Networks', services: 'Domain + Hosting', rate: 2500, cost: 0, date: '2026-06-01', status: 'Active', notes: null },
    { domain: 'grandhomes.in', client: 'Grand Homes', services: 'Domain + Hosting', rate: 2500, cost: 0, date: '2026-06-01', status: 'Active', notes: null },
    { domain: 'healinggrace.co.in', client: 'Healing Grace', services: 'Domain + Hosting', rate: 0, cost: 0, date: '2026-06-01', status: 'Managed by Other', notes: 'Renewed by friend' },
    { domain: 'perfectforwarders', client: 'Perfect Forwarders', services: 'Domain + Hosting', rate: 2500, cost: 0, date: '2026-06-01', status: 'Active', notes: null },
  ]

  let inserted = 0
  const insertMany = db.transaction(() => {
    for (const r of renewals) {
      const result = insert.run(
        r.domain, r.client, r.services,
        r.rate * 100, r.cost * 100,
        r.date, r.status, r.notes,
        r.domain
      )
      if (result.changes > 0) inserted++
    }
  })

  insertMany()
  db.close()

  console.log(`Seeded ${inserted} renewals (${renewals.length - inserted} already existed)`)
}

seedRenewals()
