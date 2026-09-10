import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { randomUUID } from 'crypto';

async function syncCategoryBudget(categoryId: string, userId: string) {
  try {
    const sumRow = await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM scheduled_items
      WHERE category_id = ? AND user_id = ? AND is_active = 1
    `).get(categoryId, userId) as any;

    const total = Number(sumRow?.total) || 0;
    if (total > 0) {
      await db.prepare(`
        UPDATE categories
        SET monthly_budget = ?
        WHERE id = ? AND user_id = ?
      `).run(total, categoryId, userId);
    }
  } catch (err) {
    console.error('Error syncing category budget:', err);
  }
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const type = searchParams.get('type');

    let query = `
      SELECT 
        si.id,
        si.user_id,
        si.category_id,
        si.name,
        si.amount,
        si.type,
        si.frequency,
        si.due_day,
        si.specific_date,
        si.is_active,
        si.notes,
        si.created_at,
        c.name as category_name,
        c.color,
        c.icon
      FROM scheduled_items si
      LEFT JOIN categories c ON c.id = si.category_id
      WHERE si.user_id = ?
    `;

    const params: any[] = [auth.userId];

    if (categoryId && categoryId !== 'ALL') {
      query += ` AND si.category_id = ?`;
      params.push(categoryId);
    }

    if (type && type !== 'ALL') {
      query += ` AND si.type = ?`;
      params.push(type);
    }

    query += ` ORDER BY si.due_day ASC NULLS LAST, si.specific_date ASC NULLS LAST, si.created_at DESC`;

    const items = await db.prepare(query).all(...params);

    return NextResponse.json({ items });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Scheduled items GET error:', err);
    return NextResponse.json({ error: 'Error al consultar fechas programadas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    const body = await request.json();

    const {
      category_id,
      name,
      amount,
      type = 'EXPENSE',
      frequency = 'MONTHLY',
      due_day,
      specific_date,
      notes,
    } = body;

    if (!category_id || !name || amount === undefined) {
      return NextResponse.json(
        { error: 'category_id, name y amount son requeridos' },
        { status: 400 }
      );
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });
    }

    // Verify category belongs to user
    const cat = await db.prepare('SELECT id, type FROM categories WHERE id = ? AND user_id = ?').get(category_id, auth.userId) as any;
    if (!cat) {
      return NextResponse.json({ error: 'Grupo o categoría no encontrada' }, { status: 404 });
    }

    const itemType = type || cat.type || 'EXPENSE';
    const parsedDueDay = due_day ? Math.min(31, Math.max(1, parseInt(due_day, 10))) : null;
    const parsedDate = specific_date ? String(specific_date).slice(0, 10) : null;
    const id = randomUUID();

    await db.prepare(`
      INSERT INTO scheduled_items (
        id, user_id, category_id, name, amount, type, frequency, due_day, specific_date, notes, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      id,
      auth.userId,
      category_id,
      name.trim(),
      numAmount,
      itemType,
      frequency,
      parsedDueDay,
      parsedDate,
      notes?.trim() || null
    );

    // Sync category budget
    await syncCategoryBudget(category_id, auth.userId);

    const created = await db.prepare(`
      SELECT 
        si.*,
        c.name as category_name,
        c.color,
        c.icon
      FROM scheduled_items si
      LEFT JOIN categories c ON c.id = si.category_id
      WHERE si.id = ?
    `).get(id);

    return NextResponse.json({ item: created }, { status: 201 });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Scheduled items POST error:', err);
    return NextResponse.json({ error: 'Error al programar ítem' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireAuth();
    const body = await request.json();
    const { id, name, amount, type, frequency, due_day, specific_date, notes, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }

    const existing = await db.prepare('SELECT id, category_id FROM scheduled_items WHERE id = ? AND user_id = ?').get(id, auth.userId) as any;
    if (!existing) {
      return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 });
    }

    const parsedDueDay = due_day ? Math.min(31, Math.max(1, parseInt(due_day, 10))) : null;
    const parsedDate = specific_date ? String(specific_date).slice(0, 10) : null;

    await db.prepare(`
      UPDATE scheduled_items
      SET 
        name = COALESCE(?, name),
        amount = COALESCE(?, amount),
        type = COALESCE(?, type),
        frequency = COALESCE(?, frequency),
        due_day = ?,
        specific_date = ?,
        notes = ?,
        is_active = COALESCE(?, is_active)
      WHERE id = ? AND user_id = ?
    `).run(
      name?.trim(),
      amount !== undefined ? Number(amount) : null,
      type,
      frequency,
      parsedDueDay,
      parsedDate,
      notes !== undefined ? (notes?.trim() || null) : null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      id,
      auth.userId
    );

    // Sync category budget
    await syncCategoryBudget(existing.category_id, auth.userId);

    const updated = await db.prepare(`
      SELECT 
        si.*,
        c.name as category_name,
        c.color,
        c.icon
      FROM scheduled_items si
      LEFT JOIN categories c ON c.id = si.category_id
      WHERE si.id = ?
    `).get(id);

    return NextResponse.json({ item: updated });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Scheduled items PUT error:', err);
    return NextResponse.json({ error: 'Error al actualizar ítem programado' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }

    const existing = await db.prepare('SELECT id, category_id FROM scheduled_items WHERE id = ? AND user_id = ?').get(id, auth.userId) as any;
    if (!existing) {
      return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 });
    }

    await db.prepare('DELETE FROM scheduled_items WHERE id = ? AND user_id = ?').run(id, auth.userId);

    // Sync category budget
    await syncCategoryBudget(existing.category_id, auth.userId);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Scheduled items DELETE error:', err);
    return NextResponse.json({ error: 'Error al eliminar ítem programado' }, { status: 500 });
  }
}
