import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db/client';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    const { id } = await params;

    const loan = (await db
      .prepare(
        `
      SELECT 
        id,
        user_id,
        borrower_name,
        borrower_phone,
        initial_amount,
        interest_rate,
        expected_interest,
        total_expected,
        paid_capital,
        paid_interest,
        current_balance,
        strftime('%Y-%m-%d', start_date) as start_date,
        strftime('%Y-%m-%d', due_date) as due_date,
        payment_method,
        status,
        COALESCE(loan_type, 'LENT') as loan_type,
        COALESCE(duration_months, 1) as duration_months,
        notes,
        created_at
      FROM loans
      WHERE id = ? AND user_id = ?
    `
      )
      .get(id, auth.userId)) as any;

    if (!loan) {
      return NextResponse.json({ error: 'Préstamo no encontrado' }, { status: 404 });
    }

    const payments = (await db
      .prepare(
        `
      SELECT 
        id,
        capital_amount,
        interest_amount,
        total_amount,
        payment_method,
        notes,
        strftime('%Y-%m-%d', payment_date) as payment_date,
        created_at
      FROM loan_payments
      WHERE loan_id = ? AND user_id = ?
      ORDER BY payment_date DESC, created_at DESC
    `
      )
      .all(id, auth.userId)) as any[];

    return NextResponse.json({
      loan: {
        ...loan,
        initial_amount: Number(loan.initial_amount) || 0,
        expected_interest: Number(loan.expected_interest) || 0,
        total_expected: Number(loan.total_expected) || 0,
        paid_capital: Number(loan.paid_capital) || 0,
        paid_interest: Number(loan.paid_interest) || 0,
        current_balance: Number(loan.current_balance) || 0,
        payments: payments.map((p) => ({
          ...p,
          capital_amount: Number(p.capital_amount) || 0,
          interest_amount: Number(p.interest_amount) || 0,
          total_amount: Number(p.total_amount) || 0,
        })),
      },
    });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Loan GET single error:', err);
    return NextResponse.json({ error: 'Error al consultar préstamo' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    const { id } = await params;
    const body = await req.json();

    const { borrower_name, borrower_phone, due_date, duration_months, status, notes } = body;

    const existing = (await db
      .prepare(`SELECT id FROM loans WHERE id = ? AND user_id = ?`)
      .get(id, auth.userId)) as any;

    if (!existing) {
      return NextResponse.json({ error: 'Préstamo no encontrado' }, { status: 404 });
    }

    await db
      .prepare(
        `
      UPDATE loans
      SET 
        borrower_name = COALESCE(?, borrower_name),
        borrower_phone = COALESCE(?, borrower_phone),
        due_date = COALESCE(?, due_date),
        duration_months = COALESCE(?, duration_months),
        status = COALESCE(?, status),
        notes = COALESCE(?, notes)
      WHERE id = ? AND user_id = ?
    `
      )
      .run(
        borrower_name?.trim() || null,
        borrower_phone?.trim() || null,
        due_date || null,
        duration_months ? Number(duration_months) : null,
        status || null,
        notes?.trim() || null,
        id,
        auth.userId
      );

    return NextResponse.json({ success: true, message: 'Préstamo actualizado' });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Loan PUT error:', err);
    return NextResponse.json({ error: 'Error al actualizar préstamo' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    const { id } = await params;

    const existing = (await db
      .prepare(`SELECT id, borrower_name FROM loans WHERE id = ? AND user_id = ?`)
      .get(id, auth.userId)) as any;

    if (!existing) {
      return NextResponse.json({ error: 'Préstamo no encontrado' }, { status: 404 });
    }

    // Delete loan payments first (or cascade)
    await db
      .prepare(`DELETE FROM loan_payments WHERE loan_id = ? AND user_id = ?`)
      .run(id, auth.userId);

    // Delete loan
    await db
      .prepare(`DELETE FROM loans WHERE id = ? AND user_id = ?`)
      .run(id, auth.userId);

    return NextResponse.json({ success: true, message: 'Préstamo eliminado' });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Loan DELETE error:', err);
    return NextResponse.json({ error: 'Error al eliminar préstamo' }, { status: 500 });
  }
}
