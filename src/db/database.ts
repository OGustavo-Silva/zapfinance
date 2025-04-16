import { Database } from 'sqlite3';
import { IDBItem } from '../interfaces/interfaces';

export class ZapFinanceDB {
  private db;

  constructor() {
    this.db = new Database('./src/db/zapfinance.db', (err) => { if (err) console.error(err.message) });
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS data(
      id INTEGER PRIMARY KEY,
      name TEXT,
      category TEXT,
      value REAL,
      date TEXT
      ) STRICT
      `);
  }

  insertExpense(expense: IDBItem) {
    try {
      const { name, category, value, date } = expense
      const insert = this.db.prepare('INSERT INTO data VALUES(null, ?, ?, ?, ?)');

      insert.run(name, category, value, date);
    } catch (e) {
      console.log(e);
    }
  }
}
