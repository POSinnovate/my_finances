import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { syncUserCurrentCash } from '@/lib/finance-balance';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    const { id } = await params;

    const expense = await db.prepare(`
      SELECT amount, type, user_id FROM expenses WHERE id = ? AND user_id = ?
    `).get(id, auth.userId) as { amount: number; type: string; user_id: string } | undefined;

    if (!expense) {
      return NextResponse.json({ error: 'Movimiento no encontrado' }, { status: 404 });
    }

    await db.prepare(`DELETE FROM expenses WHERE id = ? AND user_id = ?`).run(id, auth.userId);
    
    // Recalculate and synchronize user's current cash with payment accounts
    await syncUserCurrentCash(auth.userId);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error al eliminar movimiento' }, { status: 500 });
  }
}
