import Database from "better-sqlite3"
import fs from "fs"
import path from "path"

const DB_DIR  = path.join(process.cwd(), "data")
const DB_PATH = path.join(DB_DIR, "dpg.db")

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (_db) return _db

  fs.mkdirSync(DB_DIR, { recursive: true })

  _db = new Database(DB_PATH)
  _db.pragma("journal_mode = WAL")
  _db.pragma("foreign_keys = ON")

  const schema = fs.readFileSync(
    path.join(process.cwd(), "src", "lib", "schema.sql"),
    "utf-8"
  )
  _db.exec(schema)

  // Migrations — idempotent: SQLite throws if column already exists, catch is safe
  try {
    _db.exec("ALTER TABLE design_schemas ADD COLUMN reference_image TEXT")
  } catch {
    // column already exists — no-op
  }

  return _db
}
