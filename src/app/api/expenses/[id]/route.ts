import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db/client';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    const { id } = await params;

    const expense = await db.prepare(`
      SELECT amount, user_id FROM expenses WHERE id = ? AND user_id = ?
    `).get(id, auth.userId) as { amount: number; user_id: string } | undefined;

    if (!expense) {
      return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 });
    }

    await db.prepare(`DELETE FROM expenses WHERE id = ? AND user_id = ?`).run(id, auth.userId);
    
    await db.prepare(`
      UPDATE users
      SET current_cash = current_cash + ?,
          updated_at = NOW()
      WHERE id = ?
    `).run(Number(expense.amount), auth.userId);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error al eliminar gasto' }, { status: 500 });
  }
}
