/**
 * Tokenizer PT-BR com suporte a aspas duplas.
 * Tokens dentro de aspas são preservados como unidade única.
 */
export function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (ch === '"') {
      if (inQuotes) {
        if (current.length > 0) tokens.push(current);
        current = '';
        inQuotes = false;
      } else {
        inQuotes = true;
      }
      continue;
    }

    if (ch === ' ' && !inQuotes) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += ch;
  }

  if (inQuotes) {
    throw new Error('Aspas não fechadas na mensagem.');
  }
  if (current.length > 0) tokens.push(current);

  return tokens;
}

/**
 * Converte valor monetário (vírgula ou ponto decimal) em centavos inteiros.
 * Retorna undefined se o formato for inválido.
 */
export function parseAmountToCents(raw: string): number | undefined {
  const normalized = raw.replace(',', '.');
  const num = parseFloat(normalized);
  if (isNaN(num) || num < 0) return undefined;
  return Math.round(num * 100);
}

/**
 * Valida e retorna {day, month} de uma string DD/MM.
 */
export function parseDayMonth(raw: string): { day: number; month: number } | undefined {
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!match) return undefined;
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  if (day < 1 || day > 31 || month < 1 || month > 12) return undefined;
  return { day, month };
}

/**
 * Valida e retorna {month, year} de uma string MM/AAAA.
 */
export function parseMonthYear(raw: string): { month: number; year: number } | undefined {
  const match = raw.match(/^(\d{1,2})\/(\d{4})$/);
  if (!match) return undefined;
  const month = parseInt(match[1], 10);
  const year = parseInt(match[2], 10);
  if (month < 1 || month > 12) return undefined;
  return { month, year };
}

/**
 * Verifica se um token parece ser valor monetário.
 */
export function looksLikeAmount(token: string): boolean {
  return /^\d+([.,]\d{1,2})?$/.test(token);
}

/**
 * Verifica se um token parece ser data DD/MM.
 */
export function looksLikeDayMonth(token: string): boolean {
  return /^\d{1,2}\/\d{1,2}$/.test(token);
}
