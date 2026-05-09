import Database from 'better-sqlite3';

export interface MonthlyCycle {
  id: number;
  monthly_expense_id: number;
  competence_month: number;
  competence_year: number;
  due_date: string;
  status: 'OPEN' | 'PAID' | 'OVERDUE_ROLLED';
  paid_at: string | null;
  reminder_d2_sent_at: string | null;
  reminder_d1_sent_at: string | null;
  rollover_notified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MonthlyCycleRow extends MonthlyCycle {
  monthly_name: string;
  category_name: string | null;
  amount_cents: number;
}

export function upsertCycle(
  db: Database.Database,
  data: {
    monthly_expense_id: number;
    competence_month: number;
    competence_year: number;
    due_date: string;
  }
): MonthlyCycle {
  db.prepare(`
    INSERT INTO monthly_cycles (monthly_expense_id, competence_month, competence_year, due_date)
    VALUES (@monthly_expense_id, @competence_month, @competence_year, @due_date)
    ON CONFLICT (monthly_expense_id, competence_month, competence_year) DO NOTHING
  `).run(data);
  return db.prepare<[number, number, number], MonthlyCycle>(`
    SELECT * FROM monthly_cycles
    WHERE monthly_expense_id = ? AND competence_month = ? AND competence_year = ?
  `).get(data.monthly_expense_id, data.competence_month, data.competence_year)!;
}

export function findOpenCyclesByName(
  db: Database.Database,
  name: string,
  month: number,
  year: number
): MonthlyCycleRow[] {
  return db.prepare<[string, number, number], MonthlyCycleRow>(`
    SELECT mc.*, em.name AS monthly_name, em.amount_cents, c.name AS category_name
    FROM monthly_cycles mc
    JOIN expenses_monthly em ON em.id = mc.monthly_expense_id
    LEFT JOIN categories c ON c.id = em.category_id
    WHERE em.name = ? COLLATE NOCASE
      AND mc.competence_month = ?
      AND mc.competence_year = ?
      AND mc.status = 'OPEN'
  `).all(name, month, year);
}

export function markCyclePaid(db: Database.Database, cycleId: number): void {
  db.prepare(`
    UPDATE monthly_cycles
    SET status = 'PAID', paid_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).run(cycleId);
}

export function markCycleOverdueRolled(db: Database.Database, cycleId: number): void {
  db.prepare(`
    UPDATE monthly_cycles
    SET status = 'OVERDUE_ROLLED', updated_at = datetime('now')
    WHERE id = ?
  `).run(cycleId);
}

export function markReminderD2Sent(db: Database.Database, cycleId: number): void {
  db.prepare(`
    UPDATE monthly_cycles
    SET reminder_d2_sent_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).run(cycleId);
}

export function markReminderD1Sent(db: Database.Database, cycleId: number): void {
  db.prepare(`
    UPDATE monthly_cycles
    SET reminder_d1_sent_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).run(cycleId);
}

export function markRolloverNotified(db: Database.Database, cycleId: number): void {
  db.prepare(`
    UPDATE monthly_cycles
    SET rollover_notified_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).run(cycleId);
}

export function listOpenCyclesDueSoon(db: Database.Database, today: string): MonthlyCycleRow[] {
  return db.prepare<[string], MonthlyCycleRow>(`
    SELECT mc.*, em.name AS monthly_name, em.amount_cents, c.name AS category_name
    FROM monthly_cycles mc
    JOIN expenses_monthly em ON em.id = mc.monthly_expense_id
    LEFT JOIN categories c ON c.id = em.category_id
    WHERE mc.status = 'OPEN' AND mc.due_date >= ?
    ORDER BY mc.due_date ASC
  `).all(today);
}

export function listOpenCyclesForJob(db: Database.Database): MonthlyCycleRow[] {
  return db.prepare<[], MonthlyCycleRow>(`
    SELECT mc.*, em.name AS monthly_name, em.amount_cents, c.name AS category_name
    FROM monthly_cycles mc
    JOIN expenses_monthly em ON em.id = mc.monthly_expense_id
    LEFT JOIN categories c ON c.id = em.category_id
    WHERE mc.status = 'OPEN'
  `).all();
}

export function listCyclesByMonth(
  db: Database.Database,
  month: number,
  year: number
): MonthlyCycleRow[] {
  return db.prepare<[number, number], MonthlyCycleRow>(`
    SELECT mc.*, em.name AS monthly_name, em.amount_cents, c.name AS category_name
    FROM monthly_cycles mc
    JOIN expenses_monthly em ON em.id = mc.monthly_expense_id
    LEFT JOIN categories c ON c.id = em.category_id
    WHERE mc.competence_month = ? AND mc.competence_year = ?
    ORDER BY mc.due_date ASC
  `).all(month, year);
}
