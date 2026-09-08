import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set in environment or .env');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

export async function initDatabaseSchema() {
  console.log('🔄 Conectando a Neon PostgreSQL y creando tablas...');

  // 1. Users table
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'USER',
      monthly_income NUMERIC NOT NULL DEFAULT 2000000,
      current_cash NUMERIC NOT NULL DEFAULT 200000,
      payday_day INTEGER NOT NULL DEFAULT 30,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // 2. Categories table
  await sql`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT 'Tag',
      color TEXT NOT NULL DEFAULT '#00ADB5',
      monthly_budget NUMERIC NOT NULL DEFAULT 0,
      is_fixed INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // 3. Expenses table
  await sql`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
      type VARCHAR(10) NOT NULL DEFAULT 'EXPENSE', -- 'EXPENSE' | 'INCOME'
      amount NUMERIC NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'Nequi',
      notes TEXT,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // 4. Goals table
  await sql`
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      target_amount NUMERIC NOT NULL,
      current_amount NUMERIC NOT NULL DEFAULT 0,
      monthly_contribution NUMERIC NOT NULL DEFAULT 0,
      target_date DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // Indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);`;

  console.log('✅ Tablas creadas exitosamente.');

  // Check if Admin exists
  const existingAdmin = await sql`SELECT id FROM users WHERE LOWER(email) = LOWER('admin@posinnovate.com')`;

  if (existingAdmin.length === 0) {
    const adminId = randomUUID();
    const hash = bcrypt.hashSync('admin123', 10);

    await sql`
      INSERT INTO users (id, name, email, password_hash, role, monthly_income, current_cash, payday_day, is_active)
      VALUES (${adminId}, 'Michael (Admin)', 'admin@posinnovate.com', ${hash}, 'ADMIN', 2200000, 200000, 30, 1)
      ON CONFLICT (email) DO NOTHING;
    `;

    console.log('✅ Usuario Administrador (admin@posinnovate.com) creado.');

    // Seed default categories
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

    for (const cat of categories) {
      await sql`
        INSERT INTO categories (id, user_id, name, icon, color, monthly_budget, is_fixed)
        VALUES (${randomUUID()}, ${adminId}, ${cat.name}, ${cat.icon}, ${cat.color}, ${cat.budget}, ${cat.isFixed});
      `;
    }

    // Seed goals
    await sql`
      INSERT INTO goals (id, user_id, title, target_amount, current_amount, monthly_contribution, target_date)
      VALUES 
        (${randomUUID()}, ${adminId}, 'Fondo de Emergencia (3 Meses)', 3000000, 200000, 500000, '2026-12-31'),
        (${randomUUID()}, ${adminId}, 'Meta Moto / Carro o Viaje', 5000000, 0, 250000, '2027-06-30');
    `;

    console.log('✅ Categorías iniciales y Metas creadas en Neon.');
  } else {
    console.log('ℹ️ El usuario administrador ya existe en Neon.');
  }

  console.log('🎉 Base de datos en Neon lista al 100%.');
}

// If run directly: node --env-file=.env scripts/init-db.js
if (process.argv[1]?.endsWith('init-db.js')) {
  initDatabaseSchema()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Error inicializando esquema:', err);
      process.exit(1);
    });
}
