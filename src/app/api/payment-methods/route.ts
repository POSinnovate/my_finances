import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { randomUUID } from 'crypto';
import { createDefaultPaymentMethodsForUser } from '@/lib/db/categories-default';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const currentMonth = new Date().toISOString().slice(0, 7);
    const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Check if user has payment methods, if not seed defaults
    let methods = await db.prepare(`
      SELECT id, name, type, color, icon, created_at
      FROM payment_methods
      WHERE user_id = ?
      ORDER BY created_at ASC
    `).all(auth.userId) as any[];

    if (!methods || methods.length === 0) {
      await createDefaultPaymentMethodsForUser(auth.userId);
      methods = await db.prepare(`
        SELECT id, name, type, color, icon, created_at
        FROM payment_methods
        WHERE user_id = ?
        ORDER BY created_at ASC
      `).all(auth.userId) as any[];
    }

    // Query all expenses for this user to compute precise inflows, outflows and balances
    const userExpenses = await db.prepare(`
      SELECT 
        id,
        type, 
        amount, 
        payment_method, 
        destination_method, 
        date
      FROM expenses
      WHERE user_id = ?
    `).all(auth.userId) as any[];

    const result = methods.map((m) => {
      const methodName = (m.name || '').trim().toLowerCase();

      let movement_count = 0;
      let income_this_month = 0;
      let expense_this_month = 0;
      let total_income = 0;
      let total_expense = 0;
      let transfers_in = 0;
      let transfers_out = 0;

      for (const e of userExpenses) {
        const amt = Number(e.amount) || 0;
        const src = (e.payment_method || '').trim().toLowerCase();
        const dst = (e.destination_method || '').trim().toLowerCase();

        let dateStr = '';
        if (typeof e.date === 'string') {
          dateStr = e.date.split('T')[0];
        } else if (e.date instanceof Date) {
          dateStr = e.date.toISOString().split('T')[0];
        }

        const isThisMonth = dateStr.startsWith(currentMonth) || (dateStr !== '' && dateStr >= thirtyFiveDaysAgo);

        const isSource = src === methodName;
        const isDest = dst === methodName;

        if (isSource || isDest) {
          movement_count++;
        }

        // Direct Income into this account
        if (e.type === 'INCOME' && isSource) {
          total_income += amt;
          if (isThisMonth) income_this_month += amt;
        }

        // Direct Expense from this account
        if ((e.type === 'EXPENSE' || !e.type) && isSource) {
          total_expense += amt;
          if (isThisMonth) expense_this_month += amt;
        }

        // Transfer into this account (Destination: Money entered)
        if (e.type === 'TRANSFER' && isDest) {
          total_income += amt;
          transfers_in += amt;
          if (isThisMonth) income_this_month += amt;
        }

        // Transfer out of this account (Source: Money left)
        if (e.type === 'TRANSFER' && isSource) {
          total_expense += amt;
          transfers_out += amt;
          if (isThisMonth) expense_this_month += amt;
        }
      }

      const net_balance = total_income - total_expense;
      const net_this_month = income_this_month - expense_this_month;

      return {
        ...m,
        movement_count,
        income_this_month,
        expense_this_month,
        transfers_in,
        transfers_out,
        total_income,
        total_expense,
        net_balance,
        net_this_month,
      };
    });

    return NextResponse.json({ paymentMethods: result });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Payment methods GET error:', err);
    return NextResponse.json({ error: 'Error al consultar métodos de pago' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const { name, type, color, icon } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'El nombre del método es obligatorio' }, { status: 400 });
    }

    const trimmedName = name.trim();

    // Check duplicate
    const existing = await db.prepare(`
      SELECT id FROM payment_methods
      WHERE user_id = ? AND LOWER(name) = LOWER(?)
    `).get(auth.userId, trimmedName) as any;

    if (existing) {
      return NextResponse.json({ error: 'Ya tienes un método con este nombre' }, { status: 400 });
    }

    const id = randomUUID();
    await db.prepare(`
      INSERT INTO payment_methods (id, user_id, name, type, color, icon)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      auth.userId,
      trimmedName,
      type || 'BANK',
      color || '#00ADB5',
      icon || 'Wallet'
    );

    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Payment methods POST error:', err);
    return NextResponse.json({ error: 'Error al crear método de pago' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const { id, name, type, color, icon } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const currentMethod = await db.prepare(`
      SELECT name FROM payment_methods WHERE id = ? AND user_id = ?
    `).get(id, auth.userId) as any;

    if (!currentMethod) {
      return NextResponse.json({ error: 'Método no encontrado' }, { status: 404 });
    }

    const newName = name?.trim() || currentMethod.name;

    await db.prepare(`
      UPDATE payment_methods
      SET 
        name = ?,
        type = COALESCE(?, type),
        color = COALESCE(?, color),
        icon = COALESCE(?, icon)
      WHERE id = ? AND user_id = ?
    `).run(newName, type || null, color || null, icon || null, id, auth.userId);

    if (name && currentMethod.name !== newName) {
      await db.prepare(`
        UPDATE expenses
        SET payment_method = ?
        WHERE payment_method = ? AND user_id = ?
      `).run(newName, currentMethod.name, auth.userId);

      await db.prepare(`
        UPDATE expenses
        SET destination_method = ?
        WHERE destination_method = ? AND user_id = ?
      `).run(newName, currentMethod.name, auth.userId);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Payment methods PUT error:', err);
    return NextResponse.json({ error: 'Error al actualizar método de pago' }, { status: 500 });
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

    const allMethods = await db.prepare(`
      SELECT id, name FROM payment_methods WHERE user_id = ?
    `).all(auth.userId) as any[];

    if (allMethods.length <= 1) {
      return NextResponse.json({ error: 'Debes mantener al menos un método de pago activo' }, { status: 400 });
    }

    const methodToDelete = allMethods.find(m => m.id === id);
    if (!methodToDelete) {
      return NextResponse.json({ error: 'Método no encontrado' }, { status: 404 });
    }

    const fallbackMethod = allMethods.find(m => m.id !== id)?.name || 'Efectivo';

    await db.prepare(`
      UPDATE expenses
      SET payment_method = ?
      WHERE payment_method = ? AND user_id = ?
    `).run(fallbackMethod, methodToDelete.name, auth.userId);

    await db.prepare(`
      DELETE FROM payment_methods
      WHERE id = ? AND user_id = ?
    `).run(id, auth.userId);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Payment methods DELETE error:', err);
    return NextResponse.json({ error: 'Error al eliminar método de pago' }, { status: 500 });
  }
}
