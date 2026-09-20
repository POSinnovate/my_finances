import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { calculatePaymentMethodsWithBalances, syncUserCurrentCash } from '@/lib/finance-balance';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    const { id } = await params;
    const body = await req.json();

    const pocket = (await db
      .prepare(
        `
      SELECT p.*, pm.name as payment_method_name 
      FROM account_pockets p
      JOIN payment_methods pm ON pm.id = p.payment_method_id
      WHERE p.id = ? AND p.user_id = ?
    `
      )
      .get(id, auth.userId)) as any;

    if (!pocket) {
      return NextResponse.json(
        { error: 'El bolsillo no existe' },
        { status: 404 }
      );
    }

    // 1. Transfer between Saldo Libre and Pocket
    if (body.action === 'transfer') {
      const transferType = (body.type || body.transfer_type || '').toString().trim().toUpperCase();
      const amt = Number(body.amount);

      if (isNaN(amt) || amt <= 0) {
        return NextResponse.json(
          { error: 'El monto debe ser mayor a 0' },
          { status: 400 }
        );
      }

      if (transferType === 'DEPOSIT') {
        // Meter dinero: Saldo Libre -> Bolsillo
        const { paymentMethods } = await calculatePaymentMethodsWithBalances(auth.userId);
        const method = paymentMethods.find((m) => m.id === pocket.payment_method_id);
        const freeBalance = method ? Number(method.free_balance) || 0 : 0;

        if (amt > freeBalance) {
          return NextResponse.json(
            {
              error: `Saldo libre insuficiente en ${pocket.payment_method_name}. Saldo libre: $${freeBalance.toLocaleString('es-CO')}`,
            },
            { status: 400 }
          );
        }

        await db
          .prepare(
            `
          UPDATE account_pockets 
          SET current_balance = current_balance + ?, updated_at = NOW() 
          WHERE id = ? AND user_id = ?
        `
          )
          .run(amt, id, auth.userId);

        await syncUserCurrentCash(auth.userId);

        return NextResponse.json({
          success: true,
          message: `$${amt.toLocaleString('es-CO')} ingresados al bolsillo "${pocket.name}"`,
        });
      } else if (transferType === 'WITHDRAW') {
        // Sacar dinero: Bolsillo -> Saldo Libre
        const currentBal = Number(pocket.current_balance) || 0;
        if (amt > currentBal) {
          return NextResponse.json(
            {
              error: `Saldo insuficiente en el bolsillo "${pocket.name}". Saldo disponible: $${currentBal.toLocaleString('es-CO')}`,
            },
            { status: 400 }
          );
        }

        await db
          .prepare(
            `
          UPDATE account_pockets 
          SET current_balance = current_balance - ?, updated_at = NOW() 
          WHERE id = ? AND user_id = ?
        `
          )
          .run(amt, id, auth.userId);

        await syncUserCurrentCash(auth.userId);

        return NextResponse.json({
          success: true,
          message: `$${amt.toLocaleString('es-CO')} liberados del bolsillo "${pocket.name}" al saldo libre`,
        });
      } else {
        return NextResponse.json(
          { error: 'Tipo de transferencia no válido' },
          { status: 400 }
        );
      }
    }

    // 2. Metadata Update (name, color, icon, target_amount)
    const { name, color, icon, target_amount } = body;
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'El nombre del bolsillo es obligatorio' },
        { status: 400 }
      );
    }

    await db
      .prepare(
        `
      UPDATE account_pockets 
      SET 
        name = ?, 
        color = ?, 
        icon = ?, 
        target_amount = ?,
        updated_at = NOW()
      WHERE id = ? AND user_id = ?
    `
      )
      .run(
        name.trim(),
        color || pocket.color,
        icon || pocket.icon,
        Math.max(0, Number(target_amount) || 0),
        id,
        auth.userId
      );

    const updated = (await db
      .prepare('SELECT * FROM account_pockets WHERE id = ?')
      .get(id)) as any;

    return NextResponse.json({
      success: true,
      pocket: updated,
    });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Pocket PUT error:', err);
    return NextResponse.json(
      { error: 'Error al actualizar bolsillo' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    const { id } = await params;

    const pocket = (await db
      .prepare('SELECT * FROM account_pockets WHERE id = ? AND user_id = ?')
      .get(id, auth.userId)) as any;

    if (!pocket) {
      return NextResponse.json(
        { error: 'El bolsillo no existe' },
        { status: 404 }
      );
    }

    await db
      .prepare('DELETE FROM account_pockets WHERE id = ? AND user_id = ?')
      .run(id, auth.userId);

    await syncUserCurrentCash(auth.userId);

    return NextResponse.json({
      success: true,
      message: `Bolsillo "${pocket.name}" eliminado. Sus fondos quedan disponibles en el saldo libre.`,
    });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Pocket DELETE error:', err);
    return NextResponse.json(
      { error: 'Error al eliminar bolsillo' },
      { status: 500 }
    );
  }
}
