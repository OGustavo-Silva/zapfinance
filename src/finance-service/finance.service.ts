import Database from 'better-sqlite3';
import { toLocalDateString } from './date-utils';
import {
  findOrCreateCategory,
  findCategoryById,
  findCategoryByName,
} from '../repository-sqlite/category.repository';
import { insertExpenseOneoff, listOneoffByMonth, sumOneoffByMonth } from '../repository-sqlite/expense-oneoff.repository';
import {
  insertExpenseMonthly,
  findMonthlyByName,
  findMonthlyById,
  updateMonthlyCategoryById,
} from '../repository-sqlite/expense-monthly.repository';
import {
  upsertCycle,
  findOpenCyclesByName,
  markCyclePaid,
  listCyclesByMonth,
  listOpenCyclesDueSoon,
} from '../repository-sqlite/monthly-cycle.repository';
import { presenter } from '../presenter/presenter';
import type {
  ExpenseOneoffCmd,
  ExpenseMonthlyCmd,
  MarkPaidCmd,
  SetCategoryCmd,
  QueryPeriodoCmd,
} from '../command-parser/types';

export class FinanceService {
  constructor(private readonly db: Database.Database) {}

  addExpenseOneoff(cmd: ExpenseOneoffCmd, messageId: string): string {
    const categoryId = cmd.category
      ? findOrCreateCategory(this.db, cmd.category).id
      : null;

    const today = toLocalDateString();
    insertExpenseOneoff(this.db, {
      name: cmd.name,
      amount_cents: cmd.amountCents,
      category_id: categoryId,
      occurred_on: today,
      source_message_id: messageId,
    });

    return presenter.expenseOneoffCreated(cmd.name, cmd.amountCents, cmd.category);
  }

  addExpenseMonthly(cmd: ExpenseMonthlyCmd): string {
    const categoryId = cmd.category
      ? findOrCreateCategory(this.db, cmd.category).id
      : null;

    const monthly = insertExpenseMonthly(this.db, {
      name: cmd.name,
      amount_cents: cmd.amountCents,
      due_day: cmd.dueDay,
      due_month: cmd.dueMonth,
      category_id: categoryId,
    });

    // Criar ciclo para a competência atual se inexistente
    const now = new Date();
    const competenceMonth = now.getMonth() + 1;
    const competenceYear = now.getFullYear();
    const dueDate = buildDueDate(cmd.dueDay, competenceMonth, competenceYear);

    upsertCycle(this.db, {
      monthly_expense_id: monthly.id,
      competence_month: competenceMonth,
      competence_year: competenceYear,
      due_date: dueDate,
    });

    return presenter.expenseMonthlyCreated(cmd.name, cmd.amountCents, cmd.dueDay, cmd.dueMonth, cmd.category);
  }

  markPaid(cmd: MarkPaidCmd): string {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const cycles = findOpenCyclesByName(this.db, cmd.name, month, year);

    if (cycles.length === 0) return presenter.markPaidNotFound(cmd.name);
    if (cycles.length > 1) return presenter.markPaidAmbiguous(cmd.name, cycles);

    markCyclePaid(this.db, cycles[0].id);
    return presenter.markPaidSuccess(cmd.name);
  }

  setCategory(cmd: SetCategoryCmd): string {
    const category = findOrCreateCategory(this.db, cmd.category);

    if (typeof cmd.ref === 'number') {
      const monthly = findMonthlyById(this.db, cmd.ref);
      if (!monthly) return presenter.categoryNotFound(cmd.ref);
      updateMonthlyCategoryById(this.db, monthly.id, category.id);
      return presenter.categorySet(monthly.name, cmd.category);
    }

    // Referência por nome — buscar em mensais ativas
    const monthlies = findMonthlyByName(this.db, cmd.ref);
    if (monthlies.length === 0) return presenter.categoryNotFound(cmd.ref);
    if (monthlies.length > 1) return presenter.categoryAmbiguous(cmd.ref);

    updateMonthlyCategoryById(this.db, monthlies[0].id, category.id);
    return presenter.categorySet(monthlies[0].name, cmd.category);
  }

  queryResumo(): string {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const oneoffTotal = sumOneoffByMonth(this.db, year, month);
    const cycles = listCyclesByMonth(this.db, month, year);

    const monthlyTotal = cycles.reduce((acc, c) => acc + c.amount_cents, 0);
    const grandTotal = oneoffTotal + monthlyTotal;

    // Agrupar por categoria
    const map = new Map<string | null, number>();

    const oneoffs = listOneoffByMonth(this.db, year, month);
    for (const e of oneoffs) {
      const key = e.category_name;
      map.set(key, (map.get(key) ?? 0) + e.amount_cents);
    }
    for (const c of cycles) {
      const key = c.category_name;
      map.set(key, (map.get(key) ?? 0) + c.amount_cents);
    }

    const byCategory = [...map.entries()]
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);

    return presenter.resumo(grandTotal, byCategory);
  }

  queryListar(): string {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const oneoffs = listOneoffByMonth(this.db, year, month);
    const cycles = listCyclesByMonth(this.db, month, year);
    return presenter.listar(oneoffs, cycles);
  }

  queryVencimentos(): string {
    const today = toLocalDateString();
    const cycles = listOpenCyclesDueSoon(this.db, today);
    return presenter.vencimentos(cycles, today);
  }

  queryPeriodo(cmd: QueryPeriodoCmd): string {
    const { month, year } = cmd;

    const oneoffs = listOneoffByMonth(this.db, year, month);
    const cycles = listCyclesByMonth(this.db, month, year);

    const oneoffTotal = oneoffs.reduce((acc, e) => acc + e.amount_cents, 0);
    const monthlyTotal = cycles.reduce((acc, c) => acc + c.amount_cents, 0);
    const grandTotal = oneoffTotal + monthlyTotal;

    const map = new Map<string | null, number>();
    for (const e of oneoffs) {
      map.set(e.category_name, (map.get(e.category_name) ?? 0) + e.amount_cents);
    }
    for (const c of cycles) {
      map.set(c.category_name, (map.get(c.category_name) ?? 0) + c.amount_cents);
    }

    const byCategory = [...map.entries()]
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);

    return presenter.periodo(month, year, grandTotal, byCategory, oneoffs, cycles);
  }
}

export function buildDueDate(dueDay: number, competenceMonth: number, competenceYear: number): string {
  // Se o dia não existe no mês (ex: 31 em fevereiro), usa o último dia do mês
  const date = new Date(competenceYear, competenceMonth - 1, dueDay);
  if (date.getMonth() !== competenceMonth - 1) {
    // Ultrapassou o mês — usar último dia do mês
    date.setDate(0);
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
