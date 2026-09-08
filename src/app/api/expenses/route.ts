import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const searchParams = req.nextUrl.searchParams;
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);
    const categoryId = searchParams.get('categoryId');

    let query = `
      SELECT 
        e.id,
        e.amount,
        e.payment_method,
        e.notes,
        e.date,
        e.created_at,
        c.id as category_id,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color,
        c.is_fixed
      FROM expenses e
      JOIN categories c ON c.id = e.category_id
      WHERE e.user_id = ? AND strftime('%Y-%m', e.date) = ?
    `;

    const params: (string | number)[] = [auth.userId, month];

    if (categoryId) {
      query += ` AND e.category_id = ?`;
      params.push(categoryId);
    }

    query += ` ORDER BY e.date DESC, e.created_at DESC`;

    const expenses = db.prepare(query).all(...params);

    return NextResponse.json({ expenses });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Expenses GET error:', err);
    return NextResponse.json({ error: 'Error consultando gastos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const { amount, category_id, payment_method, notes, date } = await req.json();

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return NextResponse.json({ error: 'El monto debe ser un número positivo' }, { status: 400 });
    }

    if (!category_id) {
      return NextResponse.json({ error: 'La categoría es obligatoria' }, { status: 400 });
    }

    const expenseDate = date || new Date().toISOString().split('T')[0];
    const id = randomUUID();
    const now = new Date().toISOString();

    // Transaction to insert expense and deduct from current_cash
    const insertTransaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO expenses (id, user_id, category_id, amount, payment_method, notes, date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        auth.userId,
        category_id,
        parsedAmount,
        payment_method || 'Nequi',
        notes?.trim() || null,
        expenseDate,
        now
      );

      db.prepare(`
        UPDATE users
        SET current_cash = MAX(0, current_cash - ?),
            updated_at = ?
        WHERE id = ?
      `).run(parsedAmount, now, auth.userId);
    });

    insertTransaction();

    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Expenses POST error:', err);
    return NextResponse.json({ error: 'Error al registrar gasto' }, { status: 500 });
  }
}
