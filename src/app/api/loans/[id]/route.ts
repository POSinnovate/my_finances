import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { syncUserCurrentCash } from '@/lib/finance-balance';

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

    const existing = (await db
      .prepare(`SELECT * FROM loans WHERE id = ? AND user_id = ?`)
      .get(id, auth.userId)) as any;

    if (!existing) {
      return NextResponse.json({ error: 'Préstamo no encontrado' }, { status: 404 });
    }

    const {
      borrower_name,
      initial_amount,
      interest_rate,
      expected_interest,
      duration_months,
      start_date,
      due_date,
      payment_method,
      loan_type,
      status,
      notes,
    } = body;

    const principal = initial_amount !== undefined ? Math.max(0, Number(initial_amount) || 0) : Number(existing.initial_amount);
    const rate = interest_rate !== undefined ? Number(interest_rate) || 0 : Number(existing.interest_rate) || 0;
    const durationMonths = duration_months !== undefined ? Math.max(1, Number(duration_months) || 1) : Number(existing.duration_months) || 1;

    let monthlyInterest = expected_interest !== undefined ? Number(expected_interest) : Number(existing.expected_interest);
    if (rate > 0) {
      monthlyInterest = Math.round(principal * (rate / 100));
    }

    const projectedInterest = rate > 0 ? Math.round(principal * (rate / 100) * durationMonths) : monthlyInterest;
    const totalExpected = principal + projectedInterest;
    const paidCap = Number(existing.paid_capital) || 0;
    const currentBalance = Math.max(0, principal - paidCap);
    const calculatedStatus = status || (currentBalance <= 0 ? 'PAID' : 'ACTIVE');

    const startDate = start_date || existing.start_date;
    const dueDate = due_date !== undefined ? due_date : existing.due_date;
    const method = payment_method || existing.payment_method || 'Efectivo';
    const cleanLoanType = (loan_type || existing.loan_type || 'LENT') === 'BORROWED' ? 'BORROWED' : 'LENT';
    const isBorrowed = cleanLoanType === 'BORROWED';
    const borrowerName = borrower_name ? borrower_name.trim() : existing.borrower_name;
    const cleanNotes = notes !== undefined ? (notes?.trim() || null) : existing.notes;

    // 1. Update loan record
    await db
      .prepare(
        `
      UPDATE loans
      SET 
        borrower_name = ?,
        initial_amount = ?,
        interest_rate = ?,
        expected_interest = ?,
        total_expected = ?,
        current_balance = ?,
        start_date = ?,
        due_date = ?,
        duration_months = ?,
        payment_method = ?,
        loan_type = ?,
        notes = ?,
        status = ?
      WHERE id = ? AND user_id = ?
    `
      )
      .run(
        borrowerName,
        principal,
        rate,
        monthlyInterest,
        totalExpected,
        currentBalance,
        startDate,
        dueDate,
        durationMonths,
        method,
        cleanLoanType,
        cleanNotes,
        calculatedStatus,
        id,
        auth.userId
      );

    // 2. Synchronize associated disbursement expense/income
    const movementNote = isBorrowed
      ? `Ingreso por préstamo recibido de ${borrowerName} (Deuda adquirida) [ID:${id}]${cleanNotes ? ` - ${cleanNotes}` : ''}`
      : `Desembolso de préstamo a ${borrowerName} [ID:${id}]${cleanNotes ? ` - ${cleanNotes}` : ''}`;

    const existingExpense = (await db
      .prepare(
        `SELECT id FROM expenses WHERE user_id = ? AND notes LIKE ? LIMIT 1`
      )
      .get(auth.userId, `%[ID:${id}]%`)) as any;

    if (existingExpense) {
      await db
        .prepare(
          `
        UPDATE expenses
        SET 
          amount = ?,
          payment_method = ?,
          date = ?,
          type = ?,
          notes = ?
        WHERE id = ? AND user_id = ?
      `
        )
        .run(
          principal,
          method,
          startDate,
          isBorrowed ? 'INCOME' : 'EXPENSE',
          movementNote,
          existingExpense.id,
          auth.userId
        );
    }

    // 3. Sincronizar saldos de cuenta
    await syncUserCurrentCash(auth.userId);

    return NextResponse.json({ success: true, message: 'Préstamo actualizado exitosamente' });
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

    // 1. Fetch any payment IDs to clean up expenses
    const payments = (await db
      .prepare(`SELECT id FROM loan_payments WHERE loan_id = ? AND user_id = ?`)
      .all(id, auth.userId)) as any[];

    for (const p of payments) {
      await db
        .prepare(`DELETE FROM expenses WHERE user_id = ? AND notes LIKE ?`)
        .run(auth.userId, `%[Abono #${p.id}]%`);
    }

    // 2. Delete disbursement movement in expenses (returns the capital to user's account)
    await db
      .prepare(`DELETE FROM expenses WHERE user_id = ? AND notes LIKE ?`)
      .run(auth.userId, `%[ID:${id}]%`);

    // 3. Delete loan payments
    await db
      .prepare(`DELETE FROM loan_payments WHERE loan_id = ? AND user_id = ?`)
      .run(id, auth.userId);

    // 4. Delete loan
    await db
      .prepare(`DELETE FROM loans WHERE id = ? AND user_id = ?`)
      .run(id, auth.userId);

    // 5. Restore/recalculate user's accounts and current cash immediately
    await syncUserCurrentCash(auth.userId);

    return NextResponse.json({
      success: true,
      message: `Préstamo eliminado y capital devuelto a tu cuenta`,
    });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Loan DELETE error:', err);
    return NextResponse.json({ error: 'Error al eliminar préstamo' }, { status: 500 });
  }
}

