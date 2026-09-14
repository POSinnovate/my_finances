import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { randomUUID } from 'crypto';
import { calculatePaymentMethodsWithBalances } from '@/lib/finance-balance';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();

    const pockets = (await db
      .prepare(
        `
      SELECT 
        p.id, 
        p.user_id, 
        p.payment_method_id, 
        pm.name as payment_method_name,
        pm.color as payment_method_color,
        p.name, 
        p.color, 
        p.icon, 
        COALESCE(p.current_balance, 0) as current_balance, 
        COALESCE(p.target_amount, 0) as target_amount, 
        p.created_at
      FROM account_pockets p
      JOIN payment_methods pm ON pm.id = p.payment_method_id
      WHERE p.user_id = ?
      ORDER BY p.created_at ASC
    `
      )
      .all(auth.userId)) as any[];

    return NextResponse.json({ pockets });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Pockets GET error:', err);
    return NextResponse.json(
      { error: 'Error al consultar bolsillos' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const body = await req.json();
    const { payment_method_id, name, color, icon, initial_balance, target_amount } = body;

    if (!payment_method_id) {
      return NextResponse.json(
        { error: 'Debes seleccionar una cuenta para el bolsillo' },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'El nombre del bolsillo es obligatorio' },
        { status: 400 }
      );
    }

    // Verify payment method belongs to user
    const method = (await db
      .prepare('SELECT id, name FROM payment_methods WHERE id = ? AND user_id = ?')
      .get(payment_method_id, auth.userId)) as any;

    if (!method) {
      return NextResponse.json(
        { error: 'La cuenta seleccionada no existe' },
        { status: 404 }
      );
    }

    const initAmt = Math.max(0, Number(initial_balance) || 0);

    // If initial_balance > 0, verify account has enough free_balance
    if (initAmt > 0) {
      const { paymentMethods } = await calculatePaymentMethodsWithBalances(auth.userId);
      const targetMethod = paymentMethods.find((m) => m.id === payment_method_id);
      const freeBalance = targetMethod ? targetMethod.free_balance : 0;

      if (initAmt > freeBalance) {
        return NextResponse.json(
          {
            error: `Saldo libre insuficiente en ${method.name}. Saldo libre: $${freeBalance.toLocaleString('es-CO')}`,
          },
          { status: 400 }
        );
      }
    }

    const id = randomUUID();
    const pocketColor = color || '#00ADB5';
    const pocketIcon = icon || 'Folder';
    const targetAmt = Math.max(0, Number(target_amount) || 0);

    await db
      .prepare(
        `
      INSERT INTO account_pockets (
        id, user_id, payment_method_id, name, color, icon, current_balance, target_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        id,
        auth.userId,
        payment_method_id,
        name.trim(),
        pocketColor,
        pocketIcon,
        initAmt,
        targetAmt
      );

    const createdPocket = (await db
      .prepare('SELECT * FROM account_pockets WHERE id = ?')
      .get(id)) as any;

    return NextResponse.json({
      success: true,
      pocket: createdPocket,
    });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Pockets POST error:', err);
    return NextResponse.json(
      { error: 'Error al crear bolsillo' },
      { status: 500 }
    );
  }
}
