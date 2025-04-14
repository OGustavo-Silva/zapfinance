export interface IUtil {
  slug(txt: string): string;
  sleep(ms: number): void;
}

export interface DBItem {
   name: string;
   category: string;
   value: number;
   date: string;
}