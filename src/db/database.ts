import { Database } from 'sqlite3';
import { DBItem } from '../interfaces/interfaces';

export class ZapFinanceDB {
  private db;

  constructor() {
    this.db = new Database('./src/db/zapfinance.db', (err) => { if (err) console.error(err.message); });

    // const object: DBItem = {
    //   category: 'test',
    //   date: '2025-04-14',
    //   name: 'test name',
    //   value: 100
    // }

    console.log(
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS data(
        id INTEGER PRIMARY KEY,
        name TEXT,
        category TEXT,
        value REAL,
        date TEXT
        ) STRICT
        `)
    )
    

    const insert = this.db.prepare('INSERT INTO data VALUES(null, ?, ?, ?, ?)');
    console.log(insert.run('testname', 'testcategory', 100, '2025-04-14'));
    // this.db.run("INSERT INTO data (id, name, category, value, date) VALUES (null, 'testname', 'testcategory', 100, '2025-04-14')");
    const query = this.db.prepare('SELECT * FROM data');
    
    console.log(query.all());

  }


}
