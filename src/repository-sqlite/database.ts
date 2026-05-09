import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { config } from '../app-bootstrap/config';

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  const dir = path.dirname(config.dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  _db = new Database(config.dbPath);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  applySchema(_db);
  return _db;
}

function applySchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL COLLATE NOCASE,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE (name COLLATE NOCASE)
    );

    CREATE TABLE IF NOT EXISTS expenses_oneoff (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      name              TEXT    NOT NULL,
      amount_cents      INTEGER NOT NULL,
      category_id       INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      occurred_on       TEXT    NOT NULL,
      source_message_id TEXT    NOT NULL UNIQUE,
      created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS expenses_monthly (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT    NOT NULL,
      amount_cents INTEGER NOT NULL,
      due_day      INTEGER NOT NULL DEFAULT 1,
      due_month    INTEGER NOT NULL DEFAULT 1,
      category_id  INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      active       INTEGER NOT NULL DEFAULT 1,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS monthly_cycles (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      monthly_expense_id   INTEGER NOT NULL REFERENCES expenses_monthly(id) ON DELETE CASCADE,
      competence_month     INTEGER NOT NULL,
      competence_year      INTEGER NOT NULL,
      due_date             TEXT    NOT NULL,
      status               TEXT    NOT NULL DEFAULT 'OPEN'
                             CHECK (status IN ('OPEN', 'PAID', 'OVERDUE_ROLLED')),
      paid_at              TEXT,
      reminder_d2_sent_at  TEXT,
      reminder_d1_sent_at  TEXT,
      rollover_notified_at TEXT,
      created_at           TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at           TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE (monthly_expense_id, competence_month, competence_year)
    );

    CREATE TABLE IF NOT EXISTS outbound_messages_log (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      kind            TEXT NOT NULL
                        CHECK (kind IN ('REMINDER_D2','REMINDER_D1','ROLLOVER_NOTICE','COMMAND_REPLY')),
      target_chat_jid TEXT NOT NULL,
      payload_hash    TEXT NOT NULL,
      sent_at         TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (kind, payload_hash)
    );

    CREATE TABLE IF NOT EXISTS wa_session_meta (
      id                INTEGER PRIMARY KEY CHECK (id = 1),
      self_jid          TEXT NOT NULL,
      last_connected_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at        TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_expenses_oneoff_occurred
      ON expenses_oneoff(occurred_on);

    CREATE INDEX IF NOT EXISTS idx_monthly_cycles_due_date
      ON monthly_cycles(due_date);

    CREATE INDEX IF NOT EXISTS idx_monthly_cycles_status
      ON monthly_cycles(status);
  `);
}
