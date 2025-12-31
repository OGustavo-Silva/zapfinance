import { Database } from 'sqlite3';
import { IDBItem } from '../interfaces/interfaces';
import { Base } from '../base';

export class ZapFinanceDB extends Base {
  private db;

  constructor() {
    super()
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

  listAll(): Promise<IDBItem[]> {
    const query = 'SELECT * FROM data';
    return new Promise((resolve, reject) => {
      this.db.all(query, [], (err, rows) => {
        if (err) {
          this.log(`Error listing all: ${err}`);
          reject(err);
        }

        const res: IDBItem[] = [];

        rows.forEach((row) => {
          res.push(row as IDBItem);
        });
        this.log(`List all executed - [${res.length}]`)
        resolve(res);
      });
    })


  }

  insertExpense(expense: IDBItem) {
    return new Promise((resolve, reject) => {
      const { name, category, value, date } = expense;

      const query = 'INSERT INTO data VALUES(null, ?, ?, ?, ?, false, false, \'-\')';
      const insert = this.db.prepare(query);

      const res = insert.run(name, category, value, date);
      if (res) resolve(res);
      else {
        this.log('Error inserting expense');
        reject(res);
      }
    });
  }

  insertMonthlyExpense(expense: IDBItem) {
    return new Promise((resolve, reject) => {
      const { name, category, value, date, isMonthly, dueDate } = expense;

      const query = 'INSERT into data VALUES(null, ?, ?, ?, ?, ?, false, ?)';
      const insert = this.db.prepare(query);

      const res = insert.run(name, category, value, date, isMonthly, dueDate);
      if (res) resolve(res);
      else reject(res);
    })
  }

  getAllMonthly(): Promise<IDBItem[]>{
    const query = 'SELECT * FROM data WHERE isMonthly = true';
    return new Promise((resolve, reject) => {
      this.db.all(query, [], (err, rows) => {
         if (err) {
          this.log(`Error listing all monthly: ${err}`);
          reject(err);
        }

        const res: IDBItem[] = [];

        rows.forEach((row) => {
          res.push(row as IDBItem);
        });
        this.log(`List all executed - [${res.length}]`)
        resolve(res);
      })
    })
  }

  /**
   * Update rows in `data` table using a WHERE filter and a set of changes.
   * - filter: Partial<IDBItem> (or { id?: number }) used for WHERE clause (must provide at least one field)
   * - changes: Partial<IDBItem> fields to set (must provide at least one field)
   * Returns a Promise resolving to the sqlite3 statement result.
   */
  updateByFilter(filter: Partial<IDBItem> & { id?: number }, changes: Partial<IDBItem>) {
    return new Promise((resolve, reject) => {
      try {
        const allowed = ['name', 'category', 'value', 'date', 'isMonthly', 'isPaid'];

        const setKeys = Object.keys(changes).filter((k) => allowed.includes(k));
        if (setKeys.length === 0) return reject(new Error('No valid fields to update'));

        const whereKeys = Object.keys(filter).filter((k) => allowed.includes(k) || k === 'id');
        if (whereKeys.length === 0) return reject(new Error('No WHERE filter provided'));

        const setClause = setKeys.map((k) => `${k} = ?`).join(', ');
        const whereClause = whereKeys.map((k) => `${k} = ?`).join(' AND ');

        const setValues = setKeys.map((k) => (changes as any)[k]);
        const whereValues = whereKeys.map((k) => (filter as any)[k]);
        const sql = `UPDATE data SET ${setClause} WHERE ${whereClause}`;

        const stmt = this.db.prepare(sql);
        const res = stmt.run(...setValues, ...whereValues);
        if (res) {
          this.log(`Update executed: ${sql} -- params: ${JSON.stringify([...setValues, ...whereValues])}`);
          resolve(res);
        } else reject(res);
      } catch (err) {
        this.log(`Error updating: ${err}`);
        reject(err);
      }
    });
  }

  deleteById(id: number) {
    return new Promise((resolve, reject) => {
      const query = 'DELETE FROM data WHERE id = ?';
      const del = this.db.prepare(query);

      const res = del.run(id);
      if (res) resolve(res);
      else reject(res);
    });
  }
}
