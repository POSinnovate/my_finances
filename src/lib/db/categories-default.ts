import { randomUUID } from 'crypto';
import { db } from './client';

export async function createDefaultCategoriesForUser(userId: string) {
  const defaultExpenseCategories = [
    { name: 'Hogar & Aporte Familiar', icon: 'Home', color: '#06B6D4', budget: 350000, isFixed: 1 },
    { name: 'Alimentación & Domicilios', icon: 'Utensils', color: '#EF4444', budget: 350000, isFixed: 0 },
    { name: 'Gastos Hormiga & Antojos', icon: 'Coffee', color: '#F59E0B', budget: 150000, isFixed: 0 },
    { name: 'Transporte & Movilidad', icon: 'Car', color: '#3B82F6', budget: 150000, isFixed: 0 },
    { name: 'Ocio, Salidas & Amigos', icon: 'PartyPopper', color: '#8B5CF6', budget: 200000, isFixed: 0 },
    { name: 'Suscripciones & Servicios', icon: 'Smartphone', color: '#10B981', budget: 80000, isFixed: 1 },
    { name: 'Cuidado Personal & Ropa', icon: 'ShoppingBag', color: '#EC4899', budget: 100000, isFixed: 0 },
    { name: 'Ahorro / Fondo Emergencia', icon: 'PiggyBank', color: '#00ADB5', budget: 500000, isFixed: 0 },
  ];

  const defaultIncomeCategories = [
    { name: 'Quincenas / Salario', icon: 'Briefcase', color: '#10B981' },
    { name: 'Suscripciones Sistemas / SaaS', icon: 'Server', color: '#00ADB5' },
    { name: 'Servicios TI & Mantenimiento', icon: 'Wrench', color: '#3B82F6' },
    { name: 'Proyectos Freelance', icon: 'Code', color: '#8B5CF6' },
    { name: 'Otros Ingresos', icon: 'PlusCircle', color: '#F59E0B' },
  ];

  for (const cat of defaultExpenseCategories) {
    await db.prepare(`
      INSERT INTO categories (id, user_id, name, icon, color, monthly_budget, is_fixed, type)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'EXPENSE')
    `).run(randomUUID(), userId, cat.name, cat.icon, cat.color, cat.budget, cat.isFixed);
  }

  for (const cat of defaultIncomeCategories) {
    await db.prepare(`
      INSERT INTO categories (id, user_id, name, icon, color, monthly_budget, is_fixed, type)
      VALUES (?, ?, ?, ?, ?, 0, 0, 'INCOME')
    `).run(randomUUID(), userId, cat.name, cat.icon, cat.color);
  }
}
