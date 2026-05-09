import Database from 'better-sqlite3';

export interface ExpenseOneoff {
  id: number;
  name: string;
  amount_cents: number;
  category_id: number | null;
  occurred_on: string;
  source_message_id: string;
  created_at: string;
}

export interface ExpenseOneoffRow extends ExpenseOneoff {
  category_name: string | null;
}

export function insertExpenseOneoff(
  db: Database.Database,
  data: {
    name: string;
    amount_cents: number;
    category_id: number | null;
    occurred_on: string;
    source_message_id: string;
  }
): ExpenseOneoff {
  const result = db.prepare(`
    INSERT INTO expenses_oneoff (name, amount_cents, category_id, occurred_on, source_message_id)
    VALUES (@name, @amount_cents, @category_id, @occurred_on, @source_message_id)
  `).run(data);
  return db.prepare<[number], ExpenseOneoff>(
    'SELECT * FROM expenses_oneoff WHERE id = ?'
  ).get(result.lastInsertRowid as number)!;
}

export function listOneoffByMonth(
  db: Database.Database,
  year: number,
  month: number
): ExpenseOneoffRow[] {
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const to = `${year}-${String(month).padStart(2, '0')}-31`;
  return db.prepare<[string, string], ExpenseOneoffRow>(`
    SELECT e.*, c.name AS category_name
    FROM expenses_oneoff e
    LEFT JOIN categories c ON c.id = e.category_id
    WHERE e.occurred_on BETWEEN ? AND ?
    ORDER BY e.occurred_on ASC, e.id ASC
  `).all(from, to);
}

export function sumOneoffByMonth(
  db: Database.Database,
  year: number,
  month: number
): number {
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const to = `${year}-${String(month).padStart(2, '0')}-31`;
  const row = db.prepare<[string, string], { total: number }>(
    'SELECT COALESCE(SUM(amount_cents), 0) AS total FROM expenses_oneoff WHERE occurred_on BETWEEN ? AND ?'
  ).get(from, to)!;
  return row.total;
}
