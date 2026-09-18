import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { randomUUID } from 'crypto';
import {
  calculatePaymentMethodsWithBalances,
  syncUserCurrentCash,
  rebalancePaymentMethod,
} from '@/lib/finance-balance';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const { paymentMethods, totalAvailableCash, totalNetCash, totalPocketsCash } =
      await calculatePaymentMethodsWithBalances(auth.userId);

    // Keep users.current_cash in sync with free available cash
    await db
      .prepare('UPDATE users SET current_cash = ?, updated_at = NOW() WHERE id = ?')
      .run(totalAvailableCash, auth.userId);

    return NextResponse.json({
      paymentMethods,
      totalAvailableCash,
      totalNetCash,
      totalPocketsCash,
    });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Payment methods GET error:', err);
    return NextResponse.json(
      { error: 'Error al consultar métodos de pago' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const { name, type, color, icon, initial_balance } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'El nombre del método es obligatorio' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    // Check duplicate
    const existing = (await db
      .prepare(
        `
      SELECT id FROM payment_methods
      WHERE user_id = ? AND LOWER(name) = LOWER(?)
    `
      )
      .get(auth.userId, trimmedName)) as any;

    if (existing) {
      return NextResponse.json(
        { error: 'Ya tienes un método con este nombre' },
        { status: 400 }
      );
    }

    const id = randomUUID();
    const parsedInitial = Number(initial_balance) || 0;

    await db
      .prepare(
        `
      INSERT INTO payment_methods (id, user_id, name, type, color, icon, initial_balance)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        id,
        auth.userId,
        trimmedName,
        type || 'BANK',
        color || '#00ADB5',
        icon || 'Wallet',
        parsedInitial
      );

    const totalAvailableCash = await syncUserCurrentCash(auth.userId);

    return NextResponse.json({ success: true, id, totalAvailableCash });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Payment methods POST error:', err);
    return NextResponse.json(
      { error: 'Error al crear método de pago' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const { id, name, type, color, icon, target_balance, initial_balance } =
      await req.json();

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const currentMethod = (await db
      .prepare(
        `
      SELECT name FROM payment_methods WHERE id = ? AND user_id = ?
    `
      )
      .get(id, auth.userId)) as any;

    if (!currentMethod) {
      return NextResponse.json(
        { error: 'Método no encontrado' },
        { status: 404 }
      );
    }

    // If target_balance is provided, rebalance this account directly
    if (target_balance !== undefined && target_balance !== null && target_balance !== '') {
      await rebalancePaymentMethod(auth.userId, id, Number(target_balance));
    } else if (initial_balance !== undefined && initial_balance !== null && initial_balance !== '') {
      await db
        .prepare(
          `
        UPDATE payment_methods
        SET initial_balance = ?
        WHERE id = ? AND user_id = ?
      `
        )
        .run(Number(initial_balance), id, auth.userId);
    }

    const newName = name?.trim() || currentMethod.name;

    await db
      .prepare(
        `
      UPDATE payment_methods
      SET 
        name = ?,
        type = COALESCE(?, type),
        color = COALESCE(?, color),
        icon = COALESCE(?, icon)
      WHERE id = ? AND user_id = ?
    `
      )
      .run(newName, type || null, color || null, icon || null, id, auth.userId);

    if (name && currentMethod.name !== newName) {
      await db
        .prepare(
          `
        UPDATE expenses
        SET payment_method = ?
        WHERE payment_method = ? AND user_id = ?
      `
        )
        .run(newName, currentMethod.name, auth.userId);

      await db
        .prepare(
          `
        UPDATE expenses
        SET destination_method = ?
        WHERE destination_method = ? AND user_id = ?
      `
        )
        .run(newName, currentMethod.name, auth.userId);
    }

    const totalAvailableCash = await syncUserCurrentCash(auth.userId);

    return NextResponse.json({ success: true, totalAvailableCash });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Payment methods PUT error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Error al actualizar método de pago' },
      { status: 400 }
    );
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

    const allMethods = (await db
      .prepare(
        `
      SELECT id, name, initial_balance FROM payment_methods WHERE user_id = ?
    `
      )
      .all(auth.userId)) as any[];

    if (allMethods.length <= 1) {
      return NextResponse.json(
        { error: 'Debes mantener al menos un método de pago activo' },
        { status: 400 }
      );
    }

    const methodToDelete = allMethods.find((m) => m.id === id);
    if (!methodToDelete) {
      return NextResponse.json(
        { error: 'Método no encontrado' },
        { status: 404 }
      );
    }

    const fallbackMethod = allMethods.find((m) => m.id !== id);
    const fallbackName = fallbackMethod?.name || 'Efectivo';

    // Transfer movements to fallback
    await db
      .prepare(
        `
      UPDATE expenses
      SET payment_method = ?
      WHERE payment_method = ? AND user_id = ?
    `
      )
      .run(fallbackName, methodToDelete.name, auth.userId);

    await db
      .prepare(
        `
      UPDATE expenses
      SET destination_method = ?
      WHERE destination_method = ? AND user_id = ?
    `
      )
      .run(fallbackName, methodToDelete.name, auth.userId);

    // If deleted method had initial_balance, transfer it to fallback method so user doesn't lose money
    if (fallbackMethod && Number(methodToDelete.initial_balance) > 0) {
      await db
        .prepare(
          `
        UPDATE payment_methods
        SET initial_balance = initial_balance + ?
        WHERE id = ? AND user_id = ?
      `
        )
        .run(Number(methodToDelete.initial_balance), fallbackMethod.id, auth.userId);
    }

    await db
      .prepare(
        `
      DELETE FROM payment_methods
      WHERE id = ? AND user_id = ?
    `
      )
      .run(id, auth.userId);

    const totalAvailableCash = await syncUserCurrentCash(auth.userId);

    return NextResponse.json({ success: true, totalAvailableCash });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Payment methods DELETE error:', err);
    return NextResponse.json(
      { error: 'Error al eliminar método de pago' },
      { status: 500 }
    );
  }
}
