import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const { searchParams } = new URL(req.url);
    const filterType = searchParams.get('type'); // 'EXPENSE' | 'INCOME' | undefined
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentYear = new Date().getFullYear().toString();

    let query = `
      SELECT 
        c.id,
        c.name,
        c.icon,
        c.color,
        c.monthly_budget,
        c.is_fixed,
        COALESCE(c.type, 'EXPENSE') as type,
        COALESCE(SUM(CASE WHEN (e.type IS NULL OR e.type = 'EXPENSE') AND strftime('%Y-%m', e.date) = ? THEN e.amount ELSE 0 END), 0) as spent_this_month,
        COALESCE(SUM(CASE WHEN e.type = 'INCOME' AND strftime('%Y-%m', e.date) = ? THEN e.amount ELSE 0 END), 0) as earned_this_month,
        COALESCE(SUM(CASE WHEN e.type = 'INCOME' AND strftime('%Y', e.date) = ? THEN e.amount ELSE 0 END), 0) as earned_this_year,
        COUNT(e.id) as movement_count
      FROM categories c
      LEFT JOIN expenses e ON e.category_id = c.id AND e.user_id = c.user_id
      WHERE c.user_id = ?
    `;

    const params: any[] = [currentMonth, currentMonth, currentYear, auth.userId];

    if (filterType && (filterType === 'EXPENSE' || filterType === 'INCOME')) {
      query += ` AND c.type = ?`;
      params.push(filterType);
    }

    query += `
      GROUP BY c.id
      ORDER BY c.type DESC, c.is_fixed DESC, c.monthly_budget DESC, c.name ASC
    `;

    const categories = await db.prepare(query).all(...params) as any[];

    const categoriesWithStats = categories.map(cat => {
      const budget = Number(cat.monthly_budget) || 0;
      const spent = Number(cat.spent_this_month) || 0;
      const earnedMonth = Number(cat.earned_this_month) || 0;
      const earnedYear = Number(cat.earned_this_year) || 0;
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
        type: cat.type || 'EXPENSE',
        monthly_budget: budget,
        spent_this_month: spent,
        earned_this_month: earnedMonth,
        earned_this_year: earnedYear,
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
    const { name, icon, color, monthly_budget, is_fixed, type } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'El nombre del grupo es obligatorio' }, { status: 400 });
    }

    const id = randomUUID();
    const catType = type === 'INCOME' ? 'INCOME' : 'EXPENSE';

    await db.prepare(`
      INSERT INTO categories (id, user_id, name, icon, color, monthly_budget, is_fixed, type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      auth.userId,
      name.trim(),
      icon || (catType === 'INCOME' ? 'Briefcase' : 'Tag'),
      color || (catType === 'INCOME' ? '#10B981' : '#00ADB5'),
      Number(monthly_budget) || 0,
      is_fixed ? 1 : 0,
      catType
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
    const { id, name, icon, color, monthly_budget, is_fixed, type } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    await db.prepare(`
      UPDATE categories
      SET 
        name = COALESCE(?, name),
        icon = COALESCE(?, icon),
        color = COALESCE(?, color),
        monthly_budget = COALESCE(?, monthly_budget),
        is_fixed = COALESCE(?, is_fixed),
        type = COALESCE(?, type)
      WHERE id = ? AND user_id = ?
    `).run(
      name || null, 
      icon || null, 
      color || null, 
      monthly_budget !== undefined ? Number(monthly_budget) : null, 
      is_fixed !== undefined ? (is_fixed ? 1 : 0) : null, 
      type || null,
      id, 
      auth.userId
    );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error al actualizar categoría' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    // Unlink expenses from this category (set category_id = null)
    await db.prepare(`
      UPDATE expenses
      SET category_id = NULL
      WHERE category_id = ? AND user_id = ?
    `).run(id, auth.userId);

    // Delete category
    await db.prepare(`
      DELETE FROM categories
      WHERE id = ? AND user_id = ?
    `).run(id, auth.userId);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Categories DELETE error:', err);
    return NextResponse.json({ error: 'Error al eliminar categoría' }, { status: 500 });
  }
}
