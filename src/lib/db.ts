import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_DIR = path.join(process.cwd(), 'data')
const DB_PATH = path.join(DB_DIR, 'skywork.db')
const SCHEMA_PATH = path.join(process.cwd(), 'src', 'lib', 'schema.sql')

let db: Database.Database | null = null

/**
 * Returns the singleton SQLite database connection.
 * Creates the database file and runs schema on first call.
 */
export function getDb(): Database.Database {
  if (db) {
    return db
  }

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true })
  }

  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8')
  db.exec(schema)

  seedDefaultSettings(db)

  return db
}

/**
 * Seeds default business settings if they don't exist.
 */
function seedDefaultSettings(database: Database.Database): void {
  const insertSetting = database.prepare(
    `INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`
  )

  const defaults: Record<string, string> = {
    business_name: 'Webby Wonder',
    operating_as: 'SkyWork Borivali',
    registered_address: '5TH FLOOR, 514, PRIDE OF KALINA, KOLIVERY VILLAGE ROAD, KALINA, SANTACRUZ EAST, Mumbai Suburban, Maharashtra, 400055',
    gstin: '27AWPPG3553P1ZU',
    contact_phone: '+91 9029208698',
    contact_email: 'gadadarshan@gmail.com',
    workspace_address: '1502, Om Siddhivinayak SRA CHS Ltd, Carter Road No. 1, Near Borivali Railway Station, Behind Kasturba Road Police Station, PBC Building Gate No. 2, Borivali East, Mumbai, Maharashtra 400066',
    workspace_capacity: '13',
    open_seats: '9',
    cabin_seats: '4',
    operating_hours: '9:00 AM to 9:00 PM',
    off_day: 'Sunday',
    gst_rate: '18',
    expense_categories: JSON.stringify([
      'WiFi / Internet',
      'Electricity',
      'Cleaning Service',
      'Stationery & Supplies',
      'Tea / Coffee / Snacks',
      'Rent',
      'Maintenance',
      'Other'
    ]),
  }

  const insertMany = database.transaction(() => {
    for (const [key, value] of Object.entries(defaults)) {
      insertSetting.run(key, value)
    }
  })

  insertMany()
}
