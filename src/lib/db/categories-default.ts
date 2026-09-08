import { randomUUID } from 'crypto';
import { db } from './client';

export function createDefaultCategoriesForUser(userId: string) {
  const now = new Date().toISOString();
  const defaultCategories = [
    { name: 'Hogar & Aporte Familiar', icon: 'Home', color: '#06B6D4', budget: 350000, isFixed: 1 },
    { name: 'Alimentación & Domicilios', icon: 'Utensils', color: '#EF4444', budget: 350000, isFixed: 0 },
    { name: 'Gastos Hormiga & Antojos', icon: 'Coffee', color: '#F59E0B', budget: 150000, isFixed: 0 },
    { name: 'Transporte & Movilidad', icon: 'Car', color: '#3B82F6', budget: 150000, isFixed: 0 },
    { name: 'Ocio, Salidas & Amigos', icon: 'PartyPopper', color: '#8B5CF6', budget: 200000, isFixed: 0 },
    { name: 'Suscripciones & Servicios', icon: 'Smartphone', color: '#10B981', budget: 80000, isFixed: 1 },
    { name: 'Cuidado Personal & Ropa', icon: 'ShoppingBag', color: '#EC4899', budget: 100000, isFixed: 0 },
    { name: 'Ahorro / Fondo Emergencia', icon: 'PiggyBank', color: '#00ADB5', budget: 500000, isFixed: 0 },
  ];

  const stmt = db.prepare(`
    INSERT INTO categories (id, user_id, name, icon, color, monthly_budget, is_fixed, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const cat of defaultCategories) {
    stmt.run(randomUUID(), userId, cat.name, cat.icon, cat.color, cat.budget, cat.isFixed, now);
  }
}
