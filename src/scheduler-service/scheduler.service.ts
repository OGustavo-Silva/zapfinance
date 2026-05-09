import Database from 'better-sqlite3';
import { listActiveMonthlies } from '../repository-sqlite/expense-monthly.repository';
import {
  listOpenCyclesForJob,
  upsertCycle,
  markCycleOverdueRolled,
  markReminderD2Sent,
  markReminderD1Sent,
  markRolloverNotified,
} from '../repository-sqlite/monthly-cycle.repository';
import { hashPayload, wasAlreadySent, logOutboundMessage } from '../repository-sqlite/outbound-log.repository';
import { buildDueDate } from '../finance-service/finance.service';
import { toLocalDateString, diffDays } from '../finance-service/date-utils';
import { presenter } from '../presenter/presenter';

export type SendMessageFn = (text: string) => Promise<void>;

export class SchedulerService {
  constructor(
    private readonly db: Database.Database,
    private readonly send: SendMessageFn,
    private readonly selfJid: string
  ) {}

  async runDailyJob(): Promise<void> {
    const today = toLocalDateString();
    console.log(`[scheduler] Job diário iniciado — ${today}`);

    await this.processRollovers(today);
    await this.processReminders(today);

    console.log(`[scheduler] Job diário concluído.`);
  }

  private async processRollovers(today: string): Promise<void> {
    const openCycles = listOpenCyclesForJob(this.db);

    for (const cycle of openCycles) {
      const isOverdue = cycle.due_date < today;
      if (!isOverdue) continue;

      // Marcar ciclo anterior como OVERDUE_ROLLED e notificar, dentro de transação
      const doRollover = this.db.transaction(() => {
        markCycleOverdueRolled(this.db, cycle.id);

        // Calcular próximo ciclo
        const prevMonth = cycle.competence_month;
        const prevYear = cycle.competence_year;
        const nextMonth = prevMonth === 12 ? 1 : prevMonth + 1;
        const nextYear = prevMonth === 12 ? prevYear + 1 : prevYear;

        const monthly = listActiveMonthlies(this.db).find(m => m.id === cycle.monthly_expense_id);
        if (!monthly) return false;

        const nextDueDate = buildDueDate(monthly.due_day, nextMonth, nextYear);
        upsertCycle(this.db, {
          monthly_expense_id: cycle.monthly_expense_id,
          competence_month: nextMonth,
          competence_year: nextYear,
          due_date: nextDueDate,
        });
        return true;
      });

      const shouldNotify = doRollover();
      if (!shouldNotify) continue;

      // Enviar notificação de rollover (idempotente)
      if (!cycle.rollover_notified_at) {
        const msg = presenter.rolloverNotice(cycle.monthly_name, cycle.amount_cents);
        const hash = hashPayload(`ROLLOVER:${cycle.id}:${today}`);
        if (!wasAlreadySent(this.db, 'ROLLOVER_NOTICE', hash)) {
          await this.send(msg);
          logOutboundMessage(this.db, 'ROLLOVER_NOTICE', this.selfJid, hash);
          markRolloverNotified(this.db, cycle.id);
        }
      }
    }
  }

  private async processReminders(today: string): Promise<void> {
    const openCycles = listOpenCyclesForJob(this.db);

    for (const cycle of openCycles) {
      const delta = diffDays(today, cycle.due_date);

      if (delta === 2 && !cycle.reminder_d2_sent_at) {
        const msg = presenter.reminderD2(cycle.monthly_name, cycle.amount_cents, cycle.due_date);
        const hash = hashPayload(`D2:${cycle.id}:${cycle.due_date}`);
        if (!wasAlreadySent(this.db, 'REMINDER_D2', hash)) {
          await this.send(msg);
          logOutboundMessage(this.db, 'REMINDER_D2', this.selfJid, hash);
          markReminderD2Sent(this.db, cycle.id);
        }
      }

      if (delta === 1 && !cycle.reminder_d1_sent_at) {
        const msg = presenter.reminderD1(cycle.monthly_name, cycle.amount_cents, cycle.due_date);
        const hash = hashPayload(`D1:${cycle.id}:${cycle.due_date}`);
        if (!wasAlreadySent(this.db, 'REMINDER_D1', hash)) {
          await this.send(msg);
          logOutboundMessage(this.db, 'REMINDER_D1', this.selfJid, hash);
          markReminderD1Sent(this.db, cycle.id);
        }
      }
    }
  }
}
