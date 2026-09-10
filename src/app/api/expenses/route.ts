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
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const pageSizeParam = searchParams.get('pageSize');
    const limit = searchParams.get('limit');
    const search = searchParams.get('search')?.trim();

    let whereClause = `WHERE e.user_id = ?`;
    const whereParams: (string | number)[] = [auth.userId];

    if (month && month !== 'ALL') {
      whereClause += ` AND strftime('%Y-%m', e.date) = ?`;
      whereParams.push(month);
    }

    if (type && type !== 'ALL') {
      whereClause += ` AND e.type = ?`;
      whereParams.push(type);
    }

    if (categoryId && categoryId !== 'ALL') {
      whereClause += ` AND e.category_id = ?`;
      whereParams.push(categoryId);
    }

    const paymentMethod = searchParams.get('paymentMethod');
    if (paymentMethod && paymentMethod !== 'ALL') {
      whereClause += ` AND LOWER(e.payment_method) = LOWER(?)`;
      whereParams.push(paymentMethod);
    }

    if (search) {
      whereClause += ` AND (LOWER(COALESCE(e.notes, '')) LIKE ? OR LOWER(COALESCE(c.name, '')) LIKE ? OR CAST(e.amount AS TEXT) LIKE ?)`;
      const searchPattern = `%${search.toLowerCase()}%`;
      whereParams.push(searchPattern, searchPattern, searchPattern);
    }

    // 1. Get total count and aggregate totals for the filtered query directly in SQL
    const countQuery = `
      SELECT 
        COUNT(e.id) as total_count,
        COALESCE(SUM(CASE WHEN e.type = 'INCOME' THEN e.amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN e.type = 'EXPENSE' OR e.type IS NULL THEN e.amount ELSE 0 END), 0) as total_expense
      FROM expenses e
      LEFT JOIN categories c ON c.id = e.category_id
      ${whereClause}
    `;
    const countRow = await db.prepare(countQuery).get(...whereParams) as any;
    const totalCount = Number(countRow?.total_count) || 0;
    const totalIncome = Number(countRow?.total_income) || 0;
    const totalExpense = Number(countRow?.total_expense) || 0;

    // 2. Determine pagination limit and offset
    let pageSize = 15;
    let isPaginated = true;

    if (limit && Number(limit) > 0) {
      pageSize = Number(limit);
      isPaginated = false;
    } else if (pageSizeParam && Number(pageSizeParam) > 0) {
      pageSize = Number(pageSizeParam);
    }

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const safePage = Math.min(page, totalPages);
    const offset = isPaginated ? (safePage - 1) * pageSize : 0;

    // 3. Query paginated results with SQL LIMIT and OFFSET
    let query = `
      SELECT 
        e.id,
        e.amount,
        e.type,
        e.payment_method,
        e.destination_method,
        e.notes,
        strftime('%Y-%m-%d', e.date) as date,
        e.created_at,
        c.id as category_id,
        COALESCE(c.name, CASE WHEN e.type = 'INCOME' THEN 'Ingreso General' WHEN e.type = 'TRANSFER' THEN 'Transferencia entre Cuentas' ELSE 'Gasto General' END) as category_name,
        COALESCE(c.icon, CASE WHEN e.type = 'TRANSFER' THEN 'ArrowRightLeft' ELSE 'Tag' END) as category_icon,
        COALESCE(c.color, CASE WHEN e.type = 'INCOME' THEN '#10B981' WHEN e.type = 'TRANSFER' THEN '#06B6D4' ELSE '#00ADB5' END) as category_color,
        COALESCE(c.is_fixed, 0) as is_fixed
      FROM expenses e
      LEFT JOIN categories c ON c.id = e.category_id
      ${whereClause}
      ORDER BY e.date DESC, e.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const expenses = await db.prepare(query).all(...whereParams, pageSize, offset) as any[];

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

    return NextResponse.json({
      expenses: mapped,
      pagination: {
        total: totalCount,
        page: safePage,
        pageSize,
        totalPages,
      },
      summary: {
        total_income: totalIncome,
        total_expense: totalExpense,
        net_balance: totalIncome - totalExpense,
      },
    });
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
    const { amount, category_id, payment_method, destination_method, notes, date, type } = await req.json();

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return NextResponse.json({ error: 'El monto debe ser un número positivo' }, { status: 400 });
    }

    const txType = type === 'INCOME' ? 'INCOME' : type === 'TRANSFER' ? 'TRANSFER' : 'EXPENSE';

    if (txType === 'EXPENSE' && !category_id) {
      return NextResponse.json({ error: 'La categoría del gasto es obligatoria' }, { status: 400 });
    }

    if (txType === 'TRANSFER') {
      if (!payment_method || !destination_method) {
        return NextResponse.json({ error: 'Debes seleccionar el medio de origen y el de destino' }, { status: 400 });
      }
      if (payment_method.trim().toLowerCase() === destination_method.trim().toLowerCase()) {
        return NextResponse.json({ error: 'El medio de origen y destino no pueden ser iguales' }, { status: 400 });
      }
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
      INSERT INTO expenses (id, user_id, category_id, type, amount, payment_method, destination_method, notes, date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      auth.userId,
      category_id || null,
      txType,
      parsedAmount,
      payment_method || (txType === 'INCOME' ? 'Transferencia' : 'Nequi'),
      txType === 'TRANSFER' ? destination_method : null,
      notes?.trim() || (txType === 'TRANSFER' ? `Transferencia de ${payment_method} a ${destination_method}` : (txType === 'INCOME' ? 'Ingreso registrado' : null)),
      expenseDate
    );

    // Update user's available cash fund:
    // If INCOME -> add to fund!
    // If EXPENSE -> subtract from fund!
    // If TRANSFER -> internal money movement, fund remains identical!
    if (txType === 'INCOME') {
      await db.prepare(`
        UPDATE users
        SET current_cash = current_cash + ?,
            updated_at = NOW()
        WHERE id = ?
      `).run(parsedAmount, auth.userId);
    } else if (txType === 'EXPENSE') {
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
