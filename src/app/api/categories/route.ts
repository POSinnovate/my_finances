import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    
    // Current month filter: YYYY-MM
    const currentMonth = new Date().toISOString().slice(0, 7);

    const categories = db.prepare(`
      SELECT 
        c.id,
        c.name,
        c.icon,
        c.color,
        c.monthly_budget,
        c.is_fixed,
        COALESCE(SUM(e.amount), 0) as spent_this_month,
        COUNT(e.id) as expense_count
      FROM categories c
      LEFT JOIN expenses e ON e.category_id = c.id 
        AND e.user_id = c.user_id 
        AND strftime('%Y-%m', e.date) = ?
      WHERE c.user_id = ?
      GROUP BY c.id
      ORDER BY c.is_fixed DESC, c.monthly_budget DESC
    `).all(currentMonth, auth.userId) as {
      id: string;
      name: string;
      icon: string;
      color: string;
      monthly_budget: number;
      is_fixed: number;
      spent_this_month: number;
      expense_count: number;
    }[];

    const categoriesWithStats = categories.map(cat => {
      const budget = cat.monthly_budget || 0;
      const spent = cat.spent_this_month || 0;
      const remaining = budget - spent;
      const percent = budget > 0 ? Math.round((spent / budget) * 100) : (spent > 0 ? 100 : 0);

      let status: 'GREEN' | 'YELLOW' | 'RED' = 'GREEN';
      if (percent >= 90) {
        status = 'RED';
      } else if (percent >= 70) {
        status = 'YELLOW';
      }

      return {
        ...cat,
        remaining_budget: remaining,
        percentage_used: percent,
        status,
      };
    });

    return NextResponse.json({ categories: categoriesWithStats });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Categories GET error:', err);
    return NextResponse.json({ error: 'Error al consultar categorías' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const { name, icon, color, monthly_budget, is_fixed } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'El nombre de la categoría es obligatorio' }, { status: 400 });
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO categories (id, user_id, name, icon, color, monthly_budget, is_fixed, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      auth.userId,
      name.trim(),
      icon || 'Tag',
      color || '#00ADB5',
      Number(monthly_budget) || 0,
      is_fixed ? 1 : 0,
      now
    );

    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Categories POST error:', err);
    return NextResponse.json({ error: 'Error al crear categoría' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const { id, name, icon, color, monthly_budget, is_fixed } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    db.prepare(`
      UPDATE categories
      SET 
        name = COALESCE(?, name),
        icon = COALESCE(?, icon),
        color = COALESCE(?, color),
        monthly_budget = COALESCE(?, monthly_budget),
        is_fixed = COALESCE(?, is_fixed)
      WHERE id = ? AND user_id = ?
    `).run(name, icon, color, monthly_budget !== undefined ? Number(monthly_budget) : null, is_fixed !== undefined ? (is_fixed ? 1 : 0) : null, id, auth.userId);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error al actualizar categoría' }, { status: 500 });
  }
}
