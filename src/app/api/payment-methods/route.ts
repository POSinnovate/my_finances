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

    // Get statistics per payment method for active period / month
    const stats = await db.prepare(`
      SELECT 
        payment_method,
        COUNT(id) as movement_count,
        COALESCE(SUM(CASE WHEN type = 'INCOME' AND (strftime('%Y-%m', date) = ? OR date >= ?) THEN amount ELSE 0 END), 0) as income_this_month,
        COALESCE(SUM(CASE WHEN (type = 'EXPENSE' OR type IS NULL) AND (strftime('%Y-%m', date) = ? OR date >= ?) THEN amount ELSE 0 END), 0) as expense_this_month
      FROM expenses
      WHERE user_id = ?
      GROUP BY payment_method
    `).all(currentMonth, thirtyFiveDaysAgo, currentMonth, thirtyFiveDaysAgo, auth.userId) as any[];

    const statsMap = new Map<string, any>();
    for (const s of stats) {
      statsMap.set(s.payment_method?.toLowerCase(), s);
    }

    const result = methods.map((m) => {
      const s = statsMap.get(m.name?.toLowerCase()) || {};
      return {
        ...m,
        movement_count: Number(s.movement_count) || 0,
        income_this_month: Number(s.income_this_month) || 0,
        expense_this_month: Number(s.expense_this_month) || 0,
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
