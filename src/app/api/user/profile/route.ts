import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db/client';

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const { monthly_income, current_cash, payday_day } = await req.json();

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE users 
      SET 
        monthly_income = COALESCE(?, monthly_income),
        current_cash = COALESCE(?, current_cash),
        payday_day = COALESCE(?, payday_day),
        updated_at = ?
      WHERE id = ?
    `).run(monthly_income, current_cash, payday_day, now, auth.userId);

    const updated = db.prepare(`
      SELECT id, name, email, role, monthly_income, current_cash, payday_day
      FROM users
      WHERE id = ?
    `).get(auth.userId);

    return NextResponse.json({ success: true, user: updated });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error actualizando perfil' }, { status: 500 });
  }
}
