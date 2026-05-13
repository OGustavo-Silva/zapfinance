// DTOs tipados resultantes do parse de cada comando

export type CommandType =
  | 'EXPENSE_ONEOFF'
  | 'EXPENSE_MONTHLY'
  | 'MARK_PAID'
  | 'SET_CATEGORY'
  | 'QUERY_RESUMO'
  | 'QUERY_LISTAR'
  | 'QUERY_VENCIMENTOS'
  | 'QUERY_PERIODO'
  | 'PING'
  | 'UNKNOWN';

export interface ExpenseOneoffCmd {
  type: 'EXPENSE_ONEOFF';
  name: string;
  amountCents: number;
  category: string | null;
}

export interface ExpenseMonthlyCmd {
  type: 'EXPENSE_MONTHLY';
  name: string;
  amountCents: number;
  dueDay: number;
  dueMonth: number;
  category: string | null;
}

export interface MarkPaidCmd {
  type: 'MARK_PAID';
  name: string;
}

export interface SetCategoryCmd {
  type: 'SET_CATEGORY';
  ref: string | number;  // nome ou ID inteiro positivo
  category: string;
}

export interface QueryResumoCmd {
  type: 'QUERY_RESUMO';
}

export interface QueryListarCmd {
  type: 'QUERY_LISTAR';
}

export interface QueryVencimentosCmd {
  type: 'QUERY_VENCIMENTOS';
}

export interface QueryPeriodoCmd {
  type: 'QUERY_PERIODO';
  month: number;
  year: number;
}

export interface PingCommand {
  type: 'PING'
}

export interface UnknownCmd {
  type: 'UNKNOWN';
  keyword: string;
}

export type ParsedCommand =
  | ExpenseOneoffCmd
  | ExpenseMonthlyCmd
  | MarkPaidCmd
  | SetCategoryCmd
  | QueryResumoCmd
  | QueryListarCmd
  | QueryVencimentosCmd
  | QueryPeriodoCmd
  | PingCommand
  | UnknownCmd;

export interface ParseError {
  message: string;
  example: string;
}

export type ParseResult =
  | { ok: true; command: ParsedCommand }
  | { ok: false; error: ParseError };
