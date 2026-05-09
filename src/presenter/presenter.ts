import type { MonthlyCycleRow } from '../repository-sqlite/monthly-cycle.repository';
import type { ExpenseOneoffRow } from '../repository-sqlite/expense-oneoff.repository';

function formatCents(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

export const presenter = {
  expenseOneoffCreated(name: string, cents: number, category: string | null): string {
    const cat = category ? ` [${category}]` : '';
    return `✅ Despesa registrada: *${name}*${cat} — ${formatCents(cents)}`;
  },

  expenseMonthlyCreated(name: string, cents: number, dueDay: number, dueMonth: number, category: string | null): string {
    const cat = category ? ` [${category}]` : '';
    const due = `${String(dueDay).padStart(2,'0')}/${String(dueMonth).padStart(2,'0')}`;
    return `✅ Mensal registrada: *${name}*${cat} — ${formatCents(cents)} | vencimento: ${due}`;
  },

  markPaidSuccess(name: string): string {
    return `✅ *${name}* marcada como paga no mês atual.`;
  },

  markPaidNotFound(name: string): string {
    return `❌ Nenhuma mensal em aberto com o nome *${name}* encontrada no mês atual.`;
  },

  markPaidAmbiguous(name: string, cycles: MonthlyCycleRow[]): string {
    const list = cycles.map(c => `  • ID ${c.monthly_expense_id}: ${c.monthly_name} (${formatCents(c.amount_cents)})`).join('\n');
    return `⚠️ Mais de uma mensal *${name}* em aberto. Use o ID:\n${list}\nExemplo: *$$ pago ${cycles[0].monthly_expense_id}*`;
  },

  categorySet(target: string, category: string): string {
    return `✅ Categoria de *${target}* atualizada para *${category}*.`;
  },

  categoryAmbiguous(ref: string): string {
    return `⚠️ Mais de uma despesa com o nome *${ref}*. Use o ID numérico.\nExemplo: *$$ categoria 42 alimentação*`;
  },

  categoryNotFound(ref: string | number): string {
    return `❌ Despesa *${ref}* não encontrada.`;
  },

  resumo(
    totalCents: number,
    byCategory: { name: string | null; total: number }[]
  ): string {
    const lines = byCategory.map(c => {
      const cat = c.name ?? 'Sem categoria';
      return `  • ${cat}: ${formatCents(c.total)}`;
    });
    return `📊 *Resumo do mês*\nTotal: ${formatCents(totalCents)}\n${lines.join('\n') || '  (sem despesas)'}`;
  },

  listar(oneoffs: ExpenseOneoffRow[], cycles: MonthlyCycleRow[]): string {
    const parts: string[] = [];
    if (oneoffs.length > 0) {
      parts.push('*Avulsas:*');
      parts.push(...oneoffs.map(e =>
        `  ${formatDate(e.occurred_on)} ${e.name} — ${formatCents(e.amount_cents)}${e.category_name ? ` [${e.category_name}]` : ''}`
      ));
    }
    if (cycles.length > 0) {
      parts.push('*Mensais:*');
      parts.push(...cycles.map(c => {
        const status = c.status === 'PAID' ? '✅' : '🔴';
        return `  ${status} ${c.monthly_name} — ${formatCents(c.amount_cents)}${c.category_name ? ` [${c.category_name}]` : ''}`;
      }));
    }
    if (parts.length === 0) return '📋 Nenhuma despesa registrada neste mês.';
    return `📋 *Despesas do mês*\n${parts.join('\n')}`;
  },

  vencimentos(cycles: MonthlyCycleRow[], today: string): string {
    if (cycles.length === 0) return '📅 Nenhum vencimento pendente.';
    const todayMs = new Date(today).getTime();
    const lines = cycles.map(c => {
      const dueMs = new Date(c.due_date).getTime();
      const days = Math.round((dueMs - todayMs) / 86400000);
      const daysStr = days === 0 ? 'hoje' : days === 1 ? 'amanhã' : `em ${days} dias`;
      const cat = c.category_name ? ` [${c.category_name}]` : '';
      return `  • ${c.monthly_name}${cat} — ${formatCents(c.amount_cents)} | vence ${daysStr} (${formatDate(c.due_date)})`;
    });
    return `📅 *Vencimentos pendentes:*\n${lines.join('\n')}`;
  },

  periodo(
    month: number,
    year: number,
    totalCents: number,
    byCategory: { name: string | null; total: number }[],
    oneoffs: ExpenseOneoffRow[],
    cycles: MonthlyCycleRow[]
  ): string {
    const header = `📊 *${String(month).padStart(2,'0')}/${year}* — Total: ${formatCents(totalCents)}`;
    const cats = byCategory.map(c => `  • ${c.name ?? 'Sem categoria'}: ${formatCents(c.total)}`);
    return [header, ...cats].join('\n');
  },

  reminderD2(name: string, amountCents: number, dueDate: string): string {
    return `🔔 Lembrete: *${name}* vence em 2 dias (${formatDate(dueDate)}) — ${formatCents(amountCents)}`;
  },

  reminderD1(name: string, amountCents: number, dueDate: string): string {
    return `⚠️ Lembrete: *${name}* vence AMANHÃ (${formatDate(dueDate)}) — ${formatCents(amountCents)}`;
  },

  rolloverNotice(name: string, amountCents: number): string {
    return `📣 *${name}* — ${formatCents(amountCents)} venceu sem pagamento registrado. Um novo ciclo foi aberto.`;
  },

  parseError(message: string, example: string): string {
    return `❌ ${message}\nExemplo: *${example}*`;
  },

  unknownCommand(): string {
    return [
      '❓ Comando não reconhecido. Comandos disponíveis:',
      '  *$$ {nome} {valor} {categoria?}* — despesa avulsa',
      '  *$$ mensal {nome} {valor} {DD/MM?} {categoria?}* — despesa mensal',
      '  *$$ pago {nome}* — marcar mensal como paga',
      '  *$$ categoria {nome|id} {categoria}* — alterar categoria',
      '  *$$ resumo* — resumo do mês',
      '  *$$ listar* — despesas do mês',
      '  *$$ vencimentos* — próximos vencimentos',
      '  *$$ periodo MM/AAAA* — resumo de um mês específico',
    ].join('\n');
  },

  internalError(): string {
    return '❌ Erro interno. Tente novamente.';
  },
};
