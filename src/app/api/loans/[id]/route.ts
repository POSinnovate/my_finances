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
        COALESCE(interest_type, 'PERCENT') as interest_type,
        COALESCE(has_installments, FALSE) as has_installments,
        COALESCE(installment_count, 1) as installment_count,
        COALESCE(installment_frequency, 'MONTHLY') as installment_frequency,
        COALESCE(installment_amount, 0) as installment_amount,
        installments_schedule,
        tag,
        pocket_id,
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
      extend_months,
      interest_type,
      has_installments,
      installment_count,
      installment_frequency,
      installment_amount,
      installments_schedule,
      start_date,
      due_date,
      payment_method,
      loan_type,
      tag,
      status,
      notes,
    } = body;

    const principal = initial_amount !== undefined ? Math.max(0, Number(initial_amount) || 0) : Number(existing.initial_amount);
    const rate = interest_rate !== undefined ? Number(interest_rate) || 0 : Number(existing.interest_rate) || 0;
    
    let durationMonths = duration_months !== undefined ? Math.max(1, Number(duration_months) || 1) : Number(existing.duration_months) || 1;
    if (extend_months && Number(extend_months) > 0) {
      durationMonths += Number(extend_months);
    }

    const cleanIntType = interest_type !== undefined ? (interest_type === 'FIXED' ? 'FIXED' : 'PERCENT') : (existing.interest_type || (rate > 0 ? 'PERCENT' : 'FIXED'));
    const isPercent = cleanIntType === 'PERCENT';
    const hasInst = has_installments !== undefined ? Boolean(has_installments) : Boolean(existing.has_installments);
    const instCount = installment_count !== undefined ? Math.max(1, Number(installment_count) || 1) : Math.max(1, Number(existing.installment_count) || 1);
    const instFreq = installment_frequency !== undefined ? installment_frequency : (existing.installment_frequency || 'MONTHLY');

    let monthlyInterest = expected_interest !== undefined ? Number(expected_interest) : Number(existing.expected_interest);
    if (isPercent && rate > 0) {
      monthlyInterest = Math.round(principal * (rate / 100));
    }

    const projectedInterest = isPercent
      ? (rate > 0 ? Math.round(principal * (rate / 100) * durationMonths) : monthlyInterest)
      : monthlyInterest;
      
    const totalExpected = principal + projectedInterest;
    const instAmt = installment_amount !== undefined && Number(installment_amount) > 0 
      ? Number(installment_amount) 
      : (hasInst ? Math.round(totalExpected / instCount) : 0);

    const paidCap = Number(existing.paid_capital) || 0;
    const currentBalance = Math.max(0, principal - paidCap);
    const calculatedStatus = status || (currentBalance <= 0 ? 'PAID' : 'ACTIVE');

    const startDate = start_date || existing.start_date;
    
    // If extending months, automatically advance due_date by extend_months
    let dueDate = due_date !== undefined ? due_date : existing.due_date;
    if (extend_months && Number(extend_months) > 0) {
      const baseDate = dueDate ? new Date(dueDate) : new Date();
      baseDate.setMonth(baseDate.getMonth() + Number(extend_months));
      dueDate = baseDate.toISOString().split('T')[0];
    } else if (isPercent && (!dueDate || duration_months !== undefined)) {
      // For percentage loan, recalculate due_date from start_date + durationMonths
      const s = startDate ? new Date(startDate) : new Date();
      s.setMonth(s.getMonth() + durationMonths);
      dueDate = s.toISOString().split('T')[0];
    }

    const method = payment_method || existing.payment_method || 'Efectivo';
    const cleanLoanType = (loan_type || existing.loan_type || 'LENT') === 'BORROWED' ? 'BORROWED' : 'LENT';
    const isBorrowed = cleanLoanType === 'BORROWED';
    const borrowerName = borrower_name ? borrower_name.trim() : existing.borrower_name;
    const cleanTag = tag !== undefined ? (tag ? tag.trim() : null) : existing.tag;
    const cleanNotes = notes !== undefined ? (notes?.trim() || null) : existing.notes;
    const scheduleStr = installments_schedule !== undefined
      ? (installments_schedule ? (typeof installments_schedule === 'string' ? installments_schedule : JSON.stringify(installments_schedule)) : null)
      : existing.installments_schedule;

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
        interest_type = ?,
        has_installments = ?,
        installment_count = ?,
        installment_frequency = ?,
        installment_amount = ?,
        installments_schedule = ?,
        payment_method = ?,
        loan_type = ?,
        tag = ?,
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
        cleanIntType,
        hasInst ? 1 : 0,
        instCount,
        instFreq,
        instAmt,
        scheduleStr,
        method,
        cleanLoanType,
        cleanTag,
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
      .prepare(`SELECT id, borrower_name, initial_amount, loan_type, pocket_id FROM loans WHERE id = ? AND user_id = ?`)
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

    // 2. If loan was disbursed from a pocket, refund the pocket balance
    if (existing.pocket_id && existing.loan_type !== 'BORROWED') {
      const initAmt = Number(existing.initial_amount) || 0;
      await db
        .prepare('UPDATE account_pockets SET current_balance = current_balance + ?, updated_at = NOW() WHERE id = ?')
        .run(initAmt, existing.pocket_id);
    }

    // 3. Delete disbursement movement in expenses (returns the capital to user's account)
    await db
      .prepare(`DELETE FROM expenses WHERE user_id = ? AND notes LIKE ?`)
      .run(auth.userId, `%[ID:${id}]%`);

    // 4. Delete loan payments
    await db
      .prepare(`DELETE FROM loan_payments WHERE loan_id = ? AND user_id = ?`)
      .run(id, auth.userId);

    // 5. Delete loan
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

