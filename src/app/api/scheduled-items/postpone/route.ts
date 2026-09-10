import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db/client';

export async function POST(req: Request) {
  try {
    const auth = await requireAuth();
    const body = await req.json();
    const { itemId, action, days = 3 } = body;

    if (!itemId) {
      return NextResponse.json({ error: 'itemId es requerido' }, { status: 400 });
    }

    let item = await db.prepare(`
      SELECT id, user_id, category_id, name, amount, due_day, specific_date, notes
      FROM scheduled_items
      WHERE id = ? AND user_id = ?
    `).get(itemId, auth.userId) as any;

    let isCategory = false;
    if (!item) {
      const cat = await db.prepare(`
        SELECT id, user_id, name, monthly_budget as amount, due_day, specific_date
        FROM categories
        WHERE id = ? AND user_id = ?
      `).get(itemId, auth.userId) as any;
      if (cat) {
        item = cat;
        isCategory = true;
      }
    }

    if (!item) {
      return NextResponse.json({ error: 'Compromiso no encontrado' }, { status: 404 });
    }

    // Get Bogota today
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.format(new Date()); // "YYYY-MM-DD"
    const [year, month, day] = parts.split('-').map(Number);
    const currentMonthPrefix = `${year}-${String(month).padStart(2, '0')}`;

    if (action === 'ADD_DAYS') {
      const waitDays = Number(days) || 3;
      const newDueDay = Math.min(31, day + waitDays);
      const newNotes = `Prorrogado (+${waitDays} días de espera hasta el Día ${newDueDay})`;

      if (isCategory) {
        await db.prepare(`
          UPDATE categories
          SET due_day = ?
          WHERE id = ? AND user_id = ?
        `).run(newDueDay, itemId, auth.userId);
      } else {
        await db.prepare(`
          UPDATE scheduled_items
          SET due_day = ?, notes = ?
          WHERE id = ? AND user_id = ?
        `).run(newDueDay, newNotes, itemId, auth.userId);
      }

      return NextResponse.json({
        success: true,
        message: `Se añadieron ${waitDays} días de espera a "${item.name}". Nueva fecha: Día ${newDueDay}.`,
        newDueDay,
      });
    } else if (action === 'NEXT_MONTH' || action === 'SKIP_MONTH') {
      const deferTag = `[Pospuesto al sig. mes - ${currentMonthPrefix}]`;
      const updatedNotes = item.notes ? `${item.notes} ${deferTag}` : deferTag;

      if (isCategory) {
        // For a category without sub-items, we can create an empty deferred scheduled item or adjust due_day
        // or if categories has notes column or postpone due_day
        await db.prepare(`
          UPDATE categories
          SET due_day = 31
          WHERE id = ? AND user_id = ?
        `).run(itemId, auth.userId);
      } else {
        await db.prepare(`
          UPDATE scheduled_items
          SET notes = ?
          WHERE id = ? AND user_id = ?
        `).run(updatedNotes, itemId, auth.userId);
      }

      return NextResponse.json({
        success: true,
        message: `El registro "${item.name}" se pospuso para el siguiente mes.`,
      });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Postpone error:', err);
    return NextResponse.json({ error: 'Error al actualizar compromiso' }, { status: 500 });
  }
}
