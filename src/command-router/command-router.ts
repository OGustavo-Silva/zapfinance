import Database from 'better-sqlite3';
import { parseMessage } from '../command-parser/parser';
import { FinanceService } from '../finance-service/finance.service';
import { presenter } from '../presenter/presenter';

export class CommandRouter {
  private readonly finance: FinanceService;

  constructor(private readonly db: Database.Database) {
    this.finance = new FinanceService(db);
  }

  handle(rawMessage: string, messageId: string): string {
    const result = parseMessage(rawMessage);

    // Mensagem sem prefixo $$ — ignorar silenciosamente (retorna null do parser)
    if (result === null) return '';

    if (!result.ok) {
      return presenter.parseError(result.error.message, result.error.example);
    }

    const cmd = result.command;

    try {
      switch (cmd.type) {
        case 'EXPENSE_ONEOFF':    return this.finance.addExpenseOneoff(cmd, messageId);
        case 'EXPENSE_MONTHLY':   return this.finance.addExpenseMonthly(cmd);
        case 'MARK_PAID':         return this.finance.markPaid(cmd);
        case 'SET_CATEGORY':      return this.finance.setCategory(cmd);
        case 'QUERY_RESUMO':      return this.finance.queryResumo();
        case 'QUERY_LISTAR':      return this.finance.queryListar();
        case 'QUERY_VENCIMENTOS': return this.finance.queryVencimentos();
        case 'QUERY_PERIODO':     return this.finance.queryPeriodo(cmd);
        case 'PING':              return presenter.pingCommand();
        case 'UNKNOWN':           return presenter.unknownCommand();
      }
    } catch (err) {
      console.error(`[router] Erro ao processar comando "${rawMessage}":`, err);
      return presenter.internalError();
    }
  }
}
