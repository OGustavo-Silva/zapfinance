export interface IUtil {
  slug(txt: string): string;
  sleep(ms: number): void;
}

export interface IExpense {
  name: string;
  category: string | undefined;
  value: number;
  isMonthly?: number;
  isPaid?: number
}

export interface IDBItem {
  id?: number;
  name: string;
  category: string | undefined;
  value: number;
  date: string;
  isMonthly?: number;
  isPaid?: number
}