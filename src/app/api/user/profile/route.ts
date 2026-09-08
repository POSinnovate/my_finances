import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db/client';

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const { monthly_income, current_cash, payday_day } = await req.json();

    await db.prepare(`
      UPDATE users 
      SET 
        monthly_income = COALESCE(?, monthly_income),
        current_cash = COALESCE(?, current_cash),
        payday_day = COALESCE(?, payday_day),
        updated_at = NOW()
      WHERE id = ?
    `).run(monthly_income, current_cash, payday_day, auth.userId);

    const updated = await db.prepare(`
      SELECT id, name, email, role, monthly_income, current_cash, payday_day
      FROM users
      WHERE id = ?
    `).get(auth.userId) as any;

    return NextResponse.json({
      success: true,
      user: {
        ...updated,
        monthly_income: Number(updated.monthly_income),
        current_cash: Number(updated.current_cash),
      }
    });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error actualizando perfil' }, { status: 500 });
  }
}
