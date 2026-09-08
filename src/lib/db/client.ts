import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const DB_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'posinnovate_finance.db');

declare global {
  // eslint-disable-next-line no-var
  var __dbInstance: Database.Database | undefined;
}

function getDatabase(): Database.Database {
  if (!global.__dbInstance) {
    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables(db);
    seedInitialData(db);
    global.__dbInstance = db;
  }
  return global.__dbInstance;
}

function initTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'USER',
      monthly_income REAL NOT NULL DEFAULT 2000000,
      current_cash REAL NOT NULL DEFAULT 200000,
      payday_day INTEGER NOT NULL DEFAULT 30,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT 'Tag',
      color TEXT NOT NULL DEFAULT '#00ADB5',
      monthly_budget REAL NOT NULL DEFAULT 0,
      is_fixed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'Nequi',
      notes TEXT,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_amount REAL NOT NULL DEFAULT 0,
      monthly_contribution REAL NOT NULL DEFAULT 0,
      target_date TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
    CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
  `);
}

function seedInitialData(db: Database.Database) {
  try {
    let admin = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get('admin@posinnovate.com') as { id: string } | undefined;
    const now = new Date().toISOString();

    if (!admin) {
      const adminId = randomUUID();
      const hash = bcrypt.hashSync('admin123', 10);

      db.prepare(`
        INSERT OR IGNORE INTO users (id, name, email, password_hash, role, monthly_income, current_cash, payday_day, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        adminId,
        'Michael (Admin)',
        'admin@posinnovate.com',
        hash,
        'ADMIN',
        2200000,
        200000,
        30,
        1,
        now,
        now
      );

      admin = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get('admin@posinnovate.com') as { id: string };
    }

    if (!admin) return;
    const adminId = admin.id;

    // Check if categories already exist
    const existingCat = db.prepare('SELECT id FROM categories WHERE user_id = ?').get(adminId);
    if (!existingCat) {
      const categories = [
        { name: 'Hogar & Papás', icon: 'Home', color: '#06B6D4', budget: 350000, isFixed: 1 },
        { name: 'Alimentación & Domicilios', icon: 'Utensils', color: '#EF4444', budget: 350000, isFixed: 0 },
        { name: 'Gastos Hormiga & Antojos', icon: 'Coffee', color: '#F59E0B', budget: 150000, isFixed: 0 },
        { name: 'Transporte & Movilidad', icon: 'Car', color: '#3B82F6', budget: 150000, isFixed: 0 },
        { name: 'Ocio, Salidas & Amigos', icon: 'PartyPopper', color: '#8B5CF6', budget: 200000, isFixed: 0 },
        { name: 'Suscripciones & Celular', icon: 'Smartphone', color: '#10B981', budget: 80000, isFixed: 1 },
        { name: 'Cuidado Personal & Ropa', icon: 'ShoppingBag', color: '#EC4899', budget: 120000, isFixed: 0 },
        { name: 'Ahorro / Fondo Emergencia', icon: 'PiggyBank', color: '#00ADB5', budget: 750000, isFixed: 0 },
      ];

      const insertCategory = db.prepare(`
        INSERT INTO categories (id, user_id, name, icon, color, monthly_budget, is_fixed, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const cat of categories) {
        insertCategory.run(randomUUID(), adminId, cat.name, cat.icon, cat.color, cat.budget, cat.isFixed, now);
      }
    }

    // Check if goals already exist
    const existingGoal = db.prepare('SELECT id FROM goals WHERE user_id = ?').get(adminId);
    if (!existingGoal) {
      const insertGoal = db.prepare(`
        INSERT INTO goals (id, user_id, title, target_amount, current_amount, monthly_contribution, target_date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertGoal.run(
        randomUUID(),
        adminId,
        'Fondo de Emergencia (3 Meses)',
        3000000,
        200000,
        500000,
        '2026-12-31',
        now
      );

      insertGoal.run(
        randomUUID(),
        adminId,
        'Meta Moto / Carro o Viaje',
        5000000,
        0,
        250000,
        '2027-06-30',
        now
      );
    }

    // Check if demo expenses exist
    const existingExpense = db.prepare('SELECT id FROM expenses WHERE user_id = ?').get(adminId);
    if (!existingExpense) {
      const today = new Date().toISOString().split('T')[0];
      const catRows = db.prepare('SELECT id, name FROM categories WHERE user_id = ?').all(adminId) as { id: string; name: string }[];
      const catMap = new Map(catRows.map(c => [c.name, c.id]));

      const insertExpense = db.prepare(`
        INSERT INTO expenses (id, user_id, category_id, amount, payment_method, notes, date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      if (catMap.has('Hogar & Papás')) {
        insertExpense.run(randomUUID(), adminId, catMap.get('Hogar & Papás'), 350000, 'Bancolombia', 'Aporte mensual a mis papás', today, now);
      }
      if (catMap.has('Alimentación & Domicilios')) {
        insertExpense.run(randomUUID(), adminId, catMap.get('Alimentación & Domicilios'), 42000, 'Nequi', 'Domicilio hamburguesas', today, now);
        insertExpense.run(randomUUID(), adminId, catMap.get('Alimentación & Domicilios'), 35000, 'Daviplata', 'Almuerzo en la calle', today, now);
      }
      if (catMap.has('Gastos Hormiga & Antojos')) {
        insertExpense.run(randomUUID(), adminId, catMap.get('Gastos Hormiga & Antojos'), 12000, 'Efectivo', 'Café y panadería', today, now);
        insertExpense.run(randomUUID(), adminId, catMap.get('Gastos Hormiga & Antojos'), 18000, 'Nequi', 'Snacks tienda', today, now);
      }
      if (catMap.has('Transporte & Movilidad')) {
        insertExpense.run(randomUUID(), adminId, catMap.get('Transporte & Movilidad'), 25000, 'Nequi', 'Didi / Uber', today, now);
      }
    }
  } catch (e) {
    console.error('Seed error:', e);
  }
}

export const db = getDatabase();
