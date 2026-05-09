import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { FinanceService, buildDueDate } from '../finance-service/finance.service';

function makeInMemoryDb(): Database.Database {
  // Usa banco em memória; reutiliza o schema de getDb via monkey-patch de config
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL COLLATE NOCASE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (name COLLATE NOCASE)
    );
    CREATE TABLE IF NOT EXISTS expenses_oneoff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      occurred_on TEXT NOT NULL,
      source_message_id TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS expenses_monthly (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      due_day INTEGER NOT NULL DEFAULT 1,
      due_month INTEGER NOT NULL DEFAULT 1,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS monthly_cycles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      monthly_expense_id INTEGER NOT NULL REFERENCES expenses_monthly(id) ON DELETE CASCADE,
      competence_month INTEGER NOT NULL,
      competence_year INTEGER NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','PAID','OVERDUE_ROLLED')),
      paid_at TEXT,
      reminder_d2_sent_at TEXT,
      reminder_d1_sent_at TEXT,
      rollover_notified_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (monthly_expense_id, competence_month, competence_year)
    );
    CREATE TABLE IF NOT EXISTS outbound_messages_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL CHECK (kind IN ('REMINDER_D2','REMINDER_D1','ROLLOVER_NOTICE','COMMAND_REPLY')),
      target_chat_jid TEXT NOT NULL,
      payload_hash TEXT NOT NULL,
      sent_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (kind, payload_hash)
    );
    CREATE TABLE IF NOT EXISTS wa_session_meta (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      self_jid TEXT NOT NULL,
      last_connected_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return db;
}

describe('FinanceService — despesa avulsa', () => {
  let db: Database.Database;
  let svc: FinanceService;

  beforeEach(() => {
    db = makeInMemoryDb();
    svc = new FinanceService(db);
  });

  it('insere e confirma despesa avulsa', () => {
    const reply = svc.addExpenseOneoff(
      { type: 'EXPENSE_ONEOFF', name: 'uber', amountCents: 3550, category: 'transporte' },
      'msg-1'
    );
    expect(reply).toContain('uber');
    expect(reply).toContain('R$ 35,50');
    expect(reply).toContain('transporte');
  });

  it('rejeita source_message_id duplicado', () => {
    svc.addExpenseOneoff({ type: 'EXPENSE_ONEOFF', name: 'uber', amountCents: 3550, category: null }, 'msg-dup');
    expect(() =>
      svc.addExpenseOneoff({ type: 'EXPENSE_ONEOFF', name: 'outro', amountCents: 100, category: null }, 'msg-dup')
    ).toThrow();
  });
});

describe('FinanceService — despesa mensal e pagamento', () => {
  let db: Database.Database;
  let svc: FinanceService;

  beforeEach(() => {
    db = makeInMemoryDb();
    svc = new FinanceService(db);
  });

  it('insere mensal e cria ciclo OPEN', () => {
    const reply = svc.addExpenseMonthly({
      type: 'EXPENSE_MONTHLY',
      name: 'netflix',
      amountCents: 5590,
      dueDay: 10,
      dueMonth: 5,
      category: 'streaming',
    });
    expect(reply).toContain('netflix');
    expect(reply).toContain('R$ 55,90');
    expect(reply).toContain('10/05');

    const cycle = db.prepare("SELECT * FROM monthly_cycles WHERE status = 'OPEN'").get();
    expect(cycle).toBeTruthy();
  });

  it('marca pago com sucesso', () => {
    svc.addExpenseMonthly({
      type: 'EXPENSE_MONTHLY',
      name: 'netflix',
      amountCents: 5590,
      dueDay: 10,
      dueMonth: 5,
      category: null,
    });
    const reply = svc.markPaid({ type: 'MARK_PAID', name: 'netflix' });
    expect(reply).toContain('paga');
  });

  it('retorna não encontrado para mensal inexistente', () => {
    const reply = svc.markPaid({ type: 'MARK_PAID', name: 'naoexiste' });
    expect(reply).toContain('Nenhuma');
  });

  it('permite mensais com mesmo nome (sem upsert)', () => {
    svc.addExpenseMonthly({ type: 'EXPENSE_MONTHLY', name: 'internet', amountCents: 10000, dueDay: 5, dueMonth: 1, category: null });
    svc.addExpenseMonthly({ type: 'EXPENSE_MONTHLY', name: 'internet', amountCents: 12000, dueDay: 5, dueMonth: 1, category: null });

    const rows = db.prepare("SELECT * FROM expenses_monthly WHERE name = 'internet'").all();
    expect(rows.length).toBe(2);
  });
});

describe('buildDueDate', () => {
  it('dia válido no mês', () => {
    expect(buildDueDate(10, 5, 2026)).toBe('2026-05-10');
  });

  it('dia 31 em fevereiro → último dia do mês', () => {
    const d = buildDueDate(31, 2, 2026);
    expect(d).toBe('2026-02-28');
  });
});
