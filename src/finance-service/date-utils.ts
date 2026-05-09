/**
 * Retorna a data local no formato YYYY-MM-DD usando o timezone do processo.
 */
export function toLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Retorna quantos dias de diferença entre duas datas ISO (YYYY-MM-DD).
 * Positivo significa que b > a.
 */
export function diffDays(a: string, b: string): number {
  const msA = new Date(a).getTime();
  const msB = new Date(b).getTime();
  return Math.round((msB - msA) / 86400000);
}
