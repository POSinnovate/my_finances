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
    const currentYear = new Date().toISOString().slice(0, 4);
    const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    let query = `
      SELECT 
        c.id,
        c.name,
        c.icon,
        c.color,
        c.monthly_budget,
        c.is_fixed,
        COALESCE(c.type, 'EXPENSE') as type,
        c.due_day,
        c.specific_date,
        COALESCE(c.frequency, 'MONTHLY') as frequency,
        COALESCE(SUM(CASE WHEN (e.type IS NULL OR e.type = 'EXPENSE') AND strftime('%Y-%m', e.date) = ? THEN e.amount ELSE 0 END), 0) as spent_this_month,
        COALESCE(SUM(CASE WHEN e.type = 'INCOME' AND strftime('%Y-%m', e.date) = ? THEN e.amount ELSE 0 END), 0) as earned_this_month,
        COALESCE(SUM(CASE WHEN e.type = 'INCOME' AND e.date >= ? THEN e.amount ELSE 0 END), 0) as earned_recent,
        COALESCE(SUM(CASE WHEN e.type = 'INCOME' AND strftime('%Y', e.date) = ? THEN e.amount ELSE 0 END), 0) as earned_this_year,
        COUNT(e.id) as movement_count
      FROM categories c
      LEFT JOIN expenses e ON e.category_id = c.id AND e.user_id = c.user_id
      WHERE c.user_id = ?
    `;

    const params: any[] = [currentMonth, currentMonth, thirtyFiveDaysAgo, currentYear, auth.userId];

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
      const earnedMonthRaw = Number(cat.earned_this_month) || 0;
      const earnedRecent = Number(cat.earned_recent) || 0;
      const earnedMonth = earnedMonthRaw > 0 ? earnedMonthRaw : earnedRecent;
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
        due_day: cat.due_day ? Number(cat.due_day) : null,
        specific_date: cat.specific_date || null,
        frequency: cat.frequency || 'MONTHLY',
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
    const { name, icon, color, monthly_budget, is_fixed, type, due_day, specific_date, frequency } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'El nombre del grupo es obligatorio' }, { status: 400 });
    }

    const id = randomUUID();
    const catType = type === 'INCOME' ? 'INCOME' : 'EXPENSE';
    const parsedDueDay = due_day ? Number(due_day) : null;
    const parsedDate = specific_date ? String(specific_date).slice(0, 10) : null;
    const parsedFreq = frequency || (parsedDate ? 'ONCE' : 'MONTHLY');

    await db.prepare(`
      INSERT INTO categories (id, user_id, name, icon, color, monthly_budget, is_fixed, type, due_day, specific_date, frequency)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      auth.userId,
      name.trim(),
      icon || (catType === 'INCOME' ? 'Briefcase' : 'Tag'),
      color || (catType === 'INCOME' ? '#10B981' : '#00ADB5'),
      Number(monthly_budget) || 0,
      is_fixed ? 1 : 0,
      catType,
      parsedDueDay,
      parsedDate,
      parsedFreq
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
    const { id, name, icon, color, monthly_budget, is_fixed, type, due_day, specific_date, frequency } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) { updates.push('name = ?'); values.push(name.trim()); }
    if (icon !== undefined) { updates.push('icon = ?'); values.push(icon); }
    if (color !== undefined) { updates.push('color = ?'); values.push(color); }
    if (monthly_budget !== undefined) { updates.push('monthly_budget = ?'); values.push(Number(monthly_budget) || 0); }
    if (is_fixed !== undefined) { updates.push('is_fixed = ?'); values.push(is_fixed ? 1 : 0); }
    if (type !== undefined) { updates.push('type = ?'); values.push(type); }
    if (due_day !== undefined) { updates.push('due_day = ?'); values.push(due_day ? Number(due_day) : null); }
    if (specific_date !== undefined) { updates.push('specific_date = ?'); values.push(specific_date ? String(specific_date).slice(0, 10) : null); }
    if (frequency !== undefined) { updates.push('frequency = ?'); values.push(frequency || 'MONTHLY'); }

    if (updates.length > 0) {
      values.push(id, auth.userId);
      await db.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);
    }

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
