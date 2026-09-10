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
        COALESCE(c.has_multiple_items, 0) as has_multiple_items,
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

    // Also fetch scheduled items for this user to attach to categories
    const allScheduledItems = await db.prepare(`
      SELECT id, category_id, name, amount, type, frequency, due_day, specific_date, notes
      FROM scheduled_items
      WHERE user_id = ? AND is_active = 1
      ORDER BY due_day ASC NULLS LAST, specific_date ASC NULLS LAST
    `).all(auth.userId) as any[];

    const itemsByCat = new Map<string, any[]>();
    for (const item of allScheduledItems) {
      const list = itemsByCat.get(item.category_id) || [];
      list.push({
        id: item.id,
        name: item.name,
        amount: Number(item.amount) || 0,
        type: item.type,
        frequency: item.frequency || 'MONTHLY',
        due_day: item.due_day ? Number(item.due_day) : null,
        specific_date: item.specific_date ? String(item.specific_date).slice(0, 10) : null,
        notes: item.notes || null,
      });
      itemsByCat.set(item.category_id, list);
    }

    const categoriesWithStats = categories.map(cat => {
      const catItems = itemsByCat.get(cat.id) || [];
      const hasMultiple = Number(cat.has_multiple_items) === 1 || catItems.length > 1;
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
        specific_date: cat.specific_date ? String(cat.specific_date).slice(0, 10) : null,
        frequency: cat.frequency || 'MONTHLY',
        has_multiple_items: hasMultiple ? 1 : 0,
        items: catItems,
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
    const body = await req.json();
    const { 
      name, 
      icon, 
      color, 
      monthly_budget, 
      is_fixed, 
      type, 
      due_day, 
      specific_date, 
      frequency,
      has_multiple_items,
      items,
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'El nombre del grupo es obligatorio' }, { status: 400 });
    }

    const id = randomUUID();
    const catType = type === 'INCOME' ? 'INCOME' : 'EXPENSE';
    const hasMultiple = has_multiple_items ? 1 : (Array.isArray(items) && items.length > 0 ? 1 : 0);

    let finalBudget = Number(monthly_budget) || 0;
    let finalDueDay: number | null = due_day ? Number(due_day) : null;
    let finalSpecificDate: string | null = specific_date ? String(specific_date).slice(0, 10) : null;
    let finalFreq = frequency || (finalSpecificDate ? 'ONCE' : 'MONTHLY');

    if (hasMultiple && Array.isArray(items) && items.length > 0) {
      finalBudget = items.reduce((sum: number, it: any) => sum + (Number(it.amount) || 0), 0);
      finalDueDay = null;
      finalSpecificDate = null;
      finalFreq = 'MONTHLY';
    }

    await db.prepare(`
      INSERT INTO categories (
        id, user_id, name, icon, color, monthly_budget, is_fixed, type, due_day, specific_date, frequency, has_multiple_items
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      auth.userId,
      name.trim(),
      icon || (catType === 'INCOME' ? 'Briefcase' : 'Tag'),
      color || (catType === 'INCOME' ? '#10B981' : '#00ADB5'),
      finalBudget,
      is_fixed ? 1 : 0,
      catType,
      finalDueDay,
      finalSpecificDate,
      finalFreq,
      hasMultiple
    );

    // If multiple items, insert into scheduled_items
    if (hasMultiple && Array.isArray(items) && items.length > 0) {
      for (const it of items) {
        const itemId = randomUUID();
        const itemAmount = Number(it.amount) || 0;
        const itemDueDay = it.due_day ? Math.min(31, Math.max(1, parseInt(it.due_day, 10))) : null;
        const itemDate = it.specific_date ? String(it.specific_date).slice(0, 10) : null;
        const itemFreq = it.frequency || (itemDate ? 'ONCE' : 'MONTHLY');
        const itemName = it.name?.trim() || `${name.trim()} (${itemDueDay ? `Día ${itemDueDay}` : 'Puntual'})`;

        await db.prepare(`
          INSERT INTO scheduled_items (
            id, user_id, category_id, name, amount, type, frequency, due_day, specific_date, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `).run(
          itemId,
          auth.userId,
          id,
          itemName,
          itemAmount,
          catType,
          itemFreq,
          itemDueDay,
          itemDate
        );
      }
    }

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
    const body = await req.json();
    const { 
      id, 
      name, 
      icon, 
      color, 
      monthly_budget, 
      is_fixed, 
      type, 
      due_day, 
      specific_date, 
      frequency,
      has_multiple_items,
      items,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const hasMultiple = has_multiple_items !== undefined 
      ? (has_multiple_items ? 1 : 0)
      : (Array.isArray(items) && items.length > 0 ? 1 : 0);

    let finalBudget = monthly_budget !== undefined ? Number(monthly_budget) : undefined;
    let finalDueDay = due_day !== undefined ? (due_day ? Number(due_day) : null) : undefined;
    let finalSpecificDate = specific_date !== undefined ? (specific_date ? String(specific_date).slice(0, 10) : null) : undefined;

    // If items array is sent, sync scheduled_items
    if (Array.isArray(items)) {
      // 1. Delete previous scheduled items for this category
      await db.prepare('DELETE FROM scheduled_items WHERE category_id = ? AND user_id = ?').run(id, auth.userId);

      if (hasMultiple && items.length > 0) {
        finalBudget = items.reduce((sum: number, it: any) => sum + (Number(it.amount) || 0), 0);
        finalDueDay = null;
        finalSpecificDate = null;

        const existingCat = await db.prepare('SELECT type, name FROM categories WHERE id = ? AND user_id = ?').get(id, auth.userId) as any;
        const catType = (type || existingCat?.type) === 'INCOME' ? 'INCOME' : 'EXPENSE';
        const catName = name?.trim() || existingCat?.name || 'Ítem';

        for (const it of items) {
          const itemId = randomUUID();
          const itemAmount = Number(it.amount) || 0;
          const itemDueDay = it.due_day ? Math.min(31, Math.max(1, parseInt(it.due_day, 10))) : null;
          const itemDate = it.specific_date ? String(it.specific_date).slice(0, 10) : null;
          const itemFreq = it.frequency || (itemDate ? 'ONCE' : 'MONTHLY');
          const itemName = it.name?.trim() || `${catName} (${itemDueDay ? `Día ${itemDueDay}` : 'Puntual'})`;

          await db.prepare(`
            INSERT INTO scheduled_items (
              id, user_id, category_id, name, amount, type, frequency, due_day, specific_date, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
          `).run(
            itemId,
            auth.userId,
            id,
            itemName,
            itemAmount,
            catType,
            itemFreq,
            itemDueDay,
            itemDate
          );
        }
      }
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) { updates.push('name = ?'); values.push(name.trim()); }
    if (icon !== undefined) { updates.push('icon = ?'); values.push(icon); }
    if (color !== undefined) { updates.push('color = ?'); values.push(color); }
    if (finalBudget !== undefined) { updates.push('monthly_budget = ?'); values.push(finalBudget); }
    if (is_fixed !== undefined) { updates.push('is_fixed = ?'); values.push(is_fixed ? 1 : 0); }
    if (type !== undefined) { updates.push('type = ?'); values.push(type); }
    if (finalDueDay !== undefined) { updates.push('due_day = ?'); values.push(finalDueDay); }
    if (finalSpecificDate !== undefined) { updates.push('specific_date = ?'); values.push(finalSpecificDate); }
    if (frequency !== undefined) { updates.push('frequency = ?'); values.push(frequency || 'MONTHLY'); }
    updates.push('has_multiple_items = ?'); values.push(hasMultiple);

    values.push(id, auth.userId);
    await db.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Categories PUT error:', err);
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

    // Delete scheduled items for this category
    await db.prepare(`
      DELETE FROM scheduled_items
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
