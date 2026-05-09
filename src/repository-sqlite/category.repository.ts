import Database from 'better-sqlite3';

export interface Category {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export function findOrCreateCategory(db: Database.Database, name: string): Category {
  const existing = db.prepare<[string], Category>(
    'SELECT * FROM categories WHERE name = ? COLLATE NOCASE'
  ).get(name);
  if (existing) return existing;

  const result = db.prepare('INSERT INTO categories (name) VALUES (?)').run(name);
  return db.prepare<[number], Category>('SELECT * FROM categories WHERE id = ?')
    .get(result.lastInsertRowid as number)!;
}

export function findCategoryById(db: Database.Database, id: number): Category | undefined {
  return db.prepare<[number], Category>('SELECT * FROM categories WHERE id = ?').get(id);
}

export function findCategoryByName(db: Database.Database, name: string): Category | undefined {
  return db.prepare<[string], Category>(
    'SELECT * FROM categories WHERE name = ? COLLATE NOCASE'
  ).get(name);
}

export function listCategories(db: Database.Database): Category[] {
  return db.prepare<[], Category>('SELECT * FROM categories ORDER BY name ASC').all();
}
