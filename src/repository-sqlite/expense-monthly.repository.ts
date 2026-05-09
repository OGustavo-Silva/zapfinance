import Database from 'better-sqlite3';

export interface ExpenseMonthly {
  id: number;
  name: string;
  amount_cents: number;
  due_day: number;
  due_month: number;
  category_id: number | null;
  active: number;
  created_at: string;
  updated_at: string;
}

export function insertExpenseMonthly(
  db: Database.Database,
  data: {
    name: string;
    amount_cents: number;
    due_day: number;
    due_month: number;
    category_id: number | null;
  }
): ExpenseMonthly {
  const result = db.prepare(`
    INSERT INTO expenses_monthly (name, amount_cents, due_day, due_month, category_id)
    VALUES (@name, @amount_cents, @due_day, @due_month, @category_id)
  `).run(data);
  return db.prepare<[number], ExpenseMonthly>(
    'SELECT * FROM expenses_monthly WHERE id = ?'
  ).get(result.lastInsertRowid as number)!;
}

export function findMonthlyByName(db: Database.Database, name: string): ExpenseMonthly[] {
  return db.prepare<[string], ExpenseMonthly>(
    `SELECT * FROM expenses_monthly WHERE name = ? COLLATE NOCASE AND active = 1`
  ).all(name);
}

export function findMonthlyById(db: Database.Database, id: number): ExpenseMonthly | undefined {
  return db.prepare<[number], ExpenseMonthly>(
    'SELECT * FROM expenses_monthly WHERE id = ?'
  ).get(id);
}

export function updateMonthlyCategoryById(
  db: Database.Database,
  id: number,
  categoryId: number
): void {
  db.prepare(`
    UPDATE expenses_monthly SET category_id = ?, updated_at = datetime('now') WHERE id = ?
  `).run(categoryId, id);
}

export function listActiveMonthlies(db: Database.Database): ExpenseMonthly[] {
  return db.prepare<[], ExpenseMonthly>(
    'SELECT * FROM expenses_monthly WHERE active = 1'
  ).all();
}
