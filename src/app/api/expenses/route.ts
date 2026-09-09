import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const searchParams = req.nextUrl.searchParams;
    const month = searchParams.get('month'); // Only filter if explicitly specified
    const categoryId = searchParams.get('categoryId');
    const type = searchParams.get('type'); // 'ALL' | 'EXPENSE' | 'INCOME'
    const limit = searchParams.get('limit');

    let query = `
      SELECT 
        e.id,
        e.amount,
        e.type,
        e.payment_method,
        e.notes,
        strftime('%Y-%m-%d', e.date) as date,
        e.created_at,
        c.id as category_id,
        COALESCE(c.name, CASE WHEN e.type = 'INCOME' THEN 'Ingreso General' ELSE 'Gasto General' END) as category_name,
        c.icon as category_icon,
        COALESCE(c.color, CASE WHEN e.type = 'INCOME' THEN '#10B981' ELSE '#00ADB5' END) as category_color,
        COALESCE(c.is_fixed, 0) as is_fixed
      FROM expenses e
      LEFT JOIN categories c ON c.id = e.category_id
      WHERE e.user_id = ?
    `;

    const params: (string | number)[] = [auth.userId];

    if (month && month !== 'ALL') {
      query += ` AND strftime('%Y-%m', e.date) = ?`;
      params.push(month);
    }

    if (type && type !== 'ALL') {
      query += ` AND e.type = ?`;
      params.push(type);
    }

    if (categoryId && categoryId !== 'ALL') {
      query += ` AND e.category_id = ?`;
      params.push(categoryId);
    }

    const paymentMethod = searchParams.get('paymentMethod');
    if (paymentMethod && paymentMethod !== 'ALL') {
      query += ` AND LOWER(e.payment_method) = LOWER(?)`;
      params.push(paymentMethod);
    }

    query += ` ORDER BY e.date DESC, e.created_at DESC`;

    if (limit && Number(limit) > 0) {
      query += ` LIMIT ${Number(limit)}`;
    }

    const expenses = await db.prepare(query).all(...params) as any[];

    const mapped = expenses.map(e => {
      let cleanDate = e.date;
      if (e.date instanceof Date) {
        cleanDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(e.date);
      } else if (typeof e.date === 'string') {
        cleanDate = e.date.split('T')[0];
      }

      return {
        ...e,
        date: cleanDate,
        amount: Number(e.amount),
        type: e.type || 'EXPENSE',
      };
    });

    return NextResponse.json({ expenses: mapped });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Expenses GET error:', err);
    return NextResponse.json({ error: 'Error consultando movimientos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const { amount, category_id, payment_method, notes, date, type } = await req.json();

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return NextResponse.json({ error: 'El monto debe ser un número positivo' }, { status: 400 });
    }

    const txType = type === 'INCOME' ? 'INCOME' : 'EXPENSE';

    if (txType === 'EXPENSE' && !category_id) {
      return NextResponse.json({ error: 'La categoría del gasto es obligatoria' }, { status: 400 });
    }

    const getTodayColombiaDate = () => {
      try {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
      } catch {
        return new Date().toISOString().split('T')[0];
      }
    };

    const expenseDate = date
      ? (typeof date === 'string' ? date.split('T')[0] : date)
      : getTodayColombiaDate();
    const id = randomUUID();

    await db.prepare(`
      INSERT INTO expenses (id, user_id, category_id, type, amount, payment_method, notes, date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      auth.userId,
      category_id || null,
      txType,
      parsedAmount,
      payment_method || (txType === 'INCOME' ? 'Transferencia' : 'Nequi'),
      notes?.trim() || (txType === 'INCOME' ? 'Ingreso registrado' : null),
      expenseDate
    );

    // Update user's available cash fund:
    // If INCOME -> add to fund!
    // If EXPENSE -> subtract from fund!
    if (txType === 'INCOME') {
      await db.prepare(`
        UPDATE users
        SET current_cash = current_cash + ?,
            updated_at = NOW()
        WHERE id = ?
      `).run(parsedAmount, auth.userId);
    } else {
      await db.prepare(`
        UPDATE users
        SET current_cash = GREATEST(0, current_cash - ?),
            updated_at = NOW()
        WHERE id = ?
      `).run(parsedAmount, auth.userId);
    }

    return NextResponse.json({ success: true, id, type: txType });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Expenses POST error:', err);
    return NextResponse.json({ error: 'Error al registrar movimiento' }, { status: 500 });
  }
}
