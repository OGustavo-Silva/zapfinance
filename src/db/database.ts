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
      date TEXT,
      isMonthly INTEGER DEFAULT 0,
      isPaid INTEGER DEFAULT 0
      ) STRICT
      `);
  }

  insertExpense(expense: IDBItem) {
    return new Promise((resolve, reject) => {
      const { name, category, value, date } = expense;

      const query = 'INSERT INTO data VALUES(null, ?, ?, ?, ?, 0, 0)';
      const insert = this.db.prepare(query);

      const res = insert.run(name, category, value, date);
      if (res) resolve(res);
      else reject(res);
    });
  }

  insertMonthlyExpense(expense: IDBItem) {
    return new Promise((resolve, reject) => {
      const { name, category, value, date, isMonthly } = expense;

      const query = 'INSERT into data VALUES(null, ?, ?, ?, ?, ?, 0)';
      const insert = this.db.prepare(query);

      const res = insert.run(name, category, value, date, isMonthly);
      if (res) resolve(res);
      else reject(res);
    })
  }

  setCategory(name: string, category: string) {
    return new Promise((resolve, reject) => {
      const update = this.db.prepare('UPDATE data SET category = ? WHERE name = ?');

      const res = update.run(category, name);
      if (res) resolve(res);
      else reject(res);
    });
  }
}
