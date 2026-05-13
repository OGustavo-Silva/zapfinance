import { tokenize, parseAmountToCents, parseDayMonth, parseMonthYear, parseDayOfMonth, looksLikeAmount, looksLikeDayMonth, looksLikeDayOfMonth } from './tokenizer';
import type { ParseResult, ParsedCommand } from './types';

const PREFIX = '$$';

export function parseMessage(raw: string): ParseResult | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith(PREFIX)) return null;

  const body = trimmed.slice(PREFIX.length).trim();
  if (body.length === 0) {
    return err('Nenhum comando informado.', '$$ {despesa} {valor}');
  }

  let tokens: string[];
  try {
    tokens = tokenize(body);
  } catch (e: unknown) {
    return err((e as Error).message, '$$ "nome com espaço" 35,50 "categoria"');
  }

  const keyword = tokens[0].toLowerCase();

  // Queries sem parâmetros
  if (keyword === 'resumo') return ok({ type: 'QUERY_RESUMO' });
  if (keyword === 'listar') return ok({ type: 'QUERY_LISTAR' });
  if (keyword === 'vencimentos') return ok({ type: 'QUERY_VENCIMENTOS' });
  if (keyword === 'ping') return ok({ type: 'PING' })

  // $$ periodo MM/AAAA
  if (keyword === 'periodo') {
    if (tokens.length < 2) return err('Informe o período.', '$$ periodo 05/2026');
    const parsed = parseMonthYear(tokens[1]);
    if (!parsed) return err('Período inválido. Use o formato MM/AAAA.', '$$ periodo 05/2026');
    return ok({ type: 'QUERY_PERIODO', month: parsed.month, year: parsed.year });
  }

  // $$ pago {nome}
  if (keyword === 'pago') {
    if (tokens.length < 2) return err('Informe o nome da despesa mensal.', '$$ pago netflix');
    const name = tokens.slice(1).join(' ');
    return ok({ type: 'MARK_PAID', name });
  }

  // $$ categoria {nome|id} {nova_categoria}
  if (keyword === 'categoria') {
    if (tokens.length < 3) {
      return err('Informe a despesa e a nova categoria.', '$$ categoria netflix "streaming"');
    }
    const refToken = tokens[1];
    const idNum = parseInt(refToken, 10);
    const ref: string | number =
      /^\d+$/.test(refToken) && idNum > 0 ? idNum : refToken;
    const category = tokens.slice(2).join(' ');
    return ok({ type: 'SET_CATEGORY', ref, category });
  }

  // $$ mensal {nome} {valor} {vencimento DD?} {categoria?}
  if (keyword === 'mensal') {
    return parseMonthlyCommand(tokens.slice(1));
  }

  // $$ {nome} {valor} {categoria?}  — despesa avulsa
  return parseOneoffCommand(tokens);
}

function parseMonthlyCommand(args: string[]): ParseResult {
  if (args.length < 2) {
    return err('Informe nome e valor.', '$$ mensal netflix 55,90 10(dia de vencimento) streaming');
  }

  // Encontrar o índice do valor (primeiro token que parece dinheiro)
  const amountIdx = args.findIndex(t => looksLikeAmount(t));
  if (amountIdx === -1) {
    return err('Valor monetário não encontrado.', '$$ mensal netflix 55,90 10(dia de vencimento) streaming');
  }

  const name = args.slice(0, amountIdx).join(' ').trim();
  if (!name) return err('Nome da despesa não pode ser vazio.', '$$ mensal netflix 55,90');

  const amountCents = parseAmountToCents(args[amountIdx]);
  if (amountCents === undefined) {
    return err('Valor inválido.', '$$ mensal netflix 55,90');
  }

  const rest = args.slice(amountIdx + 1);

  let dueDay = 1;
  let category: string | null = null;
  let restIdx = 0;

  if (rest.length > 0 && looksLikeDayOfMonth(rest[0])) {
    const day = parseDayOfMonth(rest[0]);
    if (!day) return err('Dia de vencimento inválido. Use DD.', '$$ mensal netflix 55,90 10');
    dueDay = day;
    restIdx = 1;
  } else if (rest.length > 0 && looksLikeDayMonth(rest[0])) {
    // Compatibilidade retroativa: se vier DD/MM, usamos apenas o dia.
    const dm = parseDayMonth(rest[0]);
    if (!dm) return err('Data de vencimento inválida. Use DD.', '$$ mensal netflix 55,90 10');
    dueDay = dm.day;
    restIdx = 1;
  }

  if (rest.length > restIdx) {
    category = rest.slice(restIdx).join(' ').trim() || null;
  }

  return ok({ type: 'EXPENSE_MONTHLY', name, amountCents, dueDay, category });
}

function parseOneoffCommand(args: string[]): ParseResult {
  if (args.length < 2) {
    return err('Informe nome e valor.', '$$ uber 35,50 transporte');
  }

  const amountIdx = args.findIndex(t => looksLikeAmount(t));
  if (amountIdx === -1) {
    return err('Valor monetário não encontrado.', '$$ uber 35,50 transporte');
  }

  const name = args.slice(0, amountIdx).join(' ').trim();
  if (!name) return err('Nome da despesa não pode ser vazio.', '$$ uber 35,50');

  const amountCents = parseAmountToCents(args[amountIdx]);
  if (amountCents === undefined) return err('Valor inválido.', '$$ uber 35,50');

  const rest = args.slice(amountIdx + 1);
  const category = rest.length > 0 ? rest.join(' ').trim() : null;

  return ok({ type: 'EXPENSE_ONEOFF', name, amountCents, category });
}

function ok(command: ParsedCommand): ParseResult {
  return { ok: true, command };
}

function err(message: string, example: string): ParseResult {
  return { ok: false, error: { message, example } };
}
