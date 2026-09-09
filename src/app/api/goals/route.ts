import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { randomUUID } from 'crypto';

export async function GET() {
  try {
    const auth = await requireAuth();

    const goals = await db.prepare(`
      SELECT id, title, target_amount, current_amount, monthly_contribution, target_date, created_at
      FROM goals
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(auth.userId) as any[];

    const goalsWithStats = goals.map(g => {
      const target = Number(g.target_amount) || 0;
      const current = Number(g.current_amount) || 0;
      const contribution = Number(g.monthly_contribution) || 0;
      const remaining = Math.max(0, target - current);
      const progress = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
      
      let monthsToAchieve = 0;
      if (remaining > 0 && contribution > 0) {
        monthsToAchieve = Math.ceil(remaining / contribution);
      }

      let daysRemaining = 0;
      let dailySavingNeeded = 0;
      let quincenaSavingNeeded = 0;

      if (g.target_date && remaining > 0) {
        const targetTime = new Date(g.target_date).getTime();
        const nowTime = new Date().setHours(0, 0, 0, 0);
        daysRemaining = Math.max(1, Math.ceil((targetTime - nowTime) / (1000 * 60 * 60 * 24)));
        dailySavingNeeded = Math.ceil(remaining / daysRemaining);
        quincenaSavingNeeded = Math.ceil(dailySavingNeeded * 15);
      } else if (contribution > 0 && remaining > 0) {
        dailySavingNeeded = Math.ceil(contribution / 30);
        quincenaSavingNeeded = Math.ceil(contribution / 2);
        daysRemaining = monthsToAchieve * 30;
      }

      return {
        ...g,
        target_amount: target,
        current_amount: current,
        monthly_contribution: contribution,
        remaining_amount: remaining,
        progress_percentage: progress,
        months_to_achieve: monthsToAchieve,
        days_remaining: daysRemaining,
        daily_saving_needed: dailySavingNeeded,
        quincena_saving_needed: quincenaSavingNeeded,
      };
    });

    return NextResponse.json({ goals: goalsWithStats });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error al consultar metas' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const { title, target_amount, current_amount, monthly_contribution, target_date } = await req.json();

    if (!title || !target_amount) {
      return NextResponse.json({ error: 'Título y monto objetivo requeridos' }, { status: 400 });
    }

    const id = randomUUID();

    await db.prepare(`
      INSERT INTO goals (id, user_id, title, target_amount, current_amount, monthly_contribution, target_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      auth.userId,
      title.trim(),
      Number(target_amount),
      Number(current_amount) || 0,
      Number(monthly_contribution) || 0,
      target_date || null
    );

    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error al crear meta' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const { 
      id, 
      title, 
      target_amount, 
      current_amount, 
      monthly_contribution, 
      target_date, 
      add_funds, 
      withdraw_funds,
      payment_method 
    } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    // Retrieve goal
    const goal = await db.prepare(`SELECT id, title, current_amount FROM goals WHERE id = ? AND user_id = ?`).get(id, auth.userId) as any;
    if (!goal) {
      return NextResponse.json({ error: 'Meta no encontrada' }, { status: 404 });
    }

    // Find saving category if exists
    const savingCat = await db.prepare(`
      SELECT id FROM categories 
      WHERE user_id = ? AND (LOWER(name) LIKE '%ahorro%' OR LOWER(name) LIKE '%fondo%') 
      LIMIT 1
    `).get(auth.userId) as any;

    // Case 1: Deposit funds into goal
    if (add_funds !== undefined) {
      const fundAmount = Number(add_funds);
      if (fundAmount <= 0) {
        return NextResponse.json({ error: 'El monto a abonar debe ser mayor a 0' }, { status: 400 });
      }

      const method = payment_method || 'Nequi';

      // 1. Increment goal savings
      await db.prepare(`
        UPDATE goals
        SET current_amount = current_amount + ?
        WHERE id = ? AND user_id = ?
      `).run(fundAmount, id, auth.userId);

      // 2. Deduct from user's global cash available
      await db.prepare(`
        UPDATE users
        SET current_cash = current_cash - ?, updated_at = NOW()
        WHERE id = ?
      `).run(fundAmount, auth.userId);

      // 3. Record expense movement in history
      await db.prepare(`
        INSERT INTO expenses (id, user_id, category_id, type, amount, payment_method, notes, date)
        VALUES (?, ?, ?, 'EXPENSE', ?, ?, ?, CURRENT_DATE)
      `).run(
        randomUUID(),
        auth.userId,
        savingCat?.id || null,
        fundAmount,
        method,
        `Aporte a meta: ${goal.title}`
      );

      return NextResponse.json({ 
        success: true, 
        message: `Se abonaron $${fundAmount} a la meta y se descontaron de tu fondo disponible` 
      });
    }

    // Case 2: Withdraw funds from goal back to available cash
    if (withdraw_funds !== undefined) {
      const withdrawAmount = Number(withdraw_funds);
      if (withdrawAmount <= 0) {
        return NextResponse.json({ error: 'El monto a retirar debe ser mayor a 0' }, { status: 400 });
      }

      if (withdrawAmount > Number(goal.current_amount)) {
        return NextResponse.json({ error: 'El monto supera el saldo ahorrado en la meta' }, { status: 400 });
      }

      const method = payment_method || 'Nequi';

      // 1. Decrement goal savings
      await db.prepare(`
        UPDATE goals
        SET current_amount = current_amount - ?
        WHERE id = ? AND user_id = ?
      `).run(withdrawAmount, id, auth.userId);

      // 2. Return funds to user's global cash available
      await db.prepare(`
        UPDATE users
        SET current_cash = current_cash + ?, updated_at = NOW()
        WHERE id = ?
      `).run(withdrawAmount, auth.userId);

      // 3. Record income movement in history
      await db.prepare(`
        INSERT INTO expenses (id, user_id, category_id, type, amount, payment_method, notes, date)
        VALUES (?, ?, ?, 'INCOME', ?, ?, ?, CURRENT_DATE)
      `).run(
        randomUUID(),
        auth.userId,
        savingCat?.id || null,
        withdrawAmount,
        method,
        `Retiro de meta: ${goal.title}`
      );

      return NextResponse.json({ 
        success: true, 
        message: `Se regresaron $${withdrawAmount} de la meta a tu fondo disponible` 
      });
    }

    // Case 3: Edit goal fields
    await db.prepare(`
      UPDATE goals
      SET
        title = COALESCE(?, title),
        target_amount = COALESCE(?, target_amount),
        current_amount = COALESCE(?, current_amount),
        monthly_contribution = COALESCE(?, monthly_contribution),
        target_date = COALESCE(?, target_date)
      WHERE id = ? AND user_id = ?
    `).run(
      title || null,
      target_amount !== undefined ? Number(target_amount) : null,
      current_amount !== undefined ? Number(current_amount) : null,
      monthly_contribution !== undefined ? Number(monthly_contribution) : null,
      target_date || null,
      id,
      auth.userId
    );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Goals PUT error:', err);
    return NextResponse.json({ error: 'Error al actualizar meta' }, { status: 500 });
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

    // Check if goal had savings and return them to available cash
    const goal = await db.prepare(`SELECT id, title, current_amount FROM goals WHERE id = ? AND user_id = ?`).get(id, auth.userId) as any;
    if (goal && Number(goal.current_amount) > 0) {
      const refund = Number(goal.current_amount);
      await db.prepare(`
        UPDATE users
        SET current_cash = current_cash + ?, updated_at = NOW()
        WHERE id = ?
      `).run(refund, auth.userId);

      await db.prepare(`
        INSERT INTO expenses (id, user_id, type, amount, payment_method, notes, date)
        VALUES (?, ?, 'INCOME', ?, 'Transferencia / Ahorro', ?, CURRENT_DATE)
      `).run(
        randomUUID(),
        auth.userId,
        refund,
        `Saldo devuelto al fondo por eliminación de meta: ${goal.title}`
      );
    }

    await db.prepare(`DELETE FROM goals WHERE id = ? AND user_id = ?`).run(id, auth.userId);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Goals DELETE error:', err);
    return NextResponse.json({ error: 'Error al eliminar meta' }, { status: 500 });
  }
}
