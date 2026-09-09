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
    const { id, title, target_amount, current_amount, monthly_contribution, target_date, add_funds } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    if (add_funds !== undefined) {
      const fundAmount = Number(add_funds);
      await db.prepare(`
        UPDATE goals
        SET current_amount = current_amount + ?
        WHERE id = ? AND user_id = ?
      `).run(fundAmount, id, auth.userId);
    } else {
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
        title,
        target_amount !== undefined ? Number(target_amount) : null,
        current_amount !== undefined ? Number(current_amount) : null,
        monthly_contribution !== undefined ? Number(monthly_contribution) : null,
        target_date,
        id,
        auth.userId
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
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

    await db.prepare(`DELETE FROM goals WHERE id = ? AND user_id = ?`).run(id, auth.userId);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error al eliminar meta' }, { status: 500 });
  }
}
