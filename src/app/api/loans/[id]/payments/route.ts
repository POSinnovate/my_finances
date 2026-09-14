import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { randomUUID } from 'crypto';
import { syncUserCurrentCash } from '@/lib/finance-balance';
import { getTodayColombiaDate } from '@/lib/dayjs';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    const { id } = await params;
    const body = await req.json();

    const {
      capital_amount,
      interest_amount,
      payment_date,
      payment_method,
      notes,
    } = body;

    const capAmt = Math.max(0, Number(capital_amount) || 0);
    const intAmt = Math.max(0, Number(interest_amount) || 0);
    const totAmt = capAmt + intAmt;

    if (totAmt <= 0) {
      return NextResponse.json(
        { error: 'El monto total del abono (capital o interés) debe ser mayor a 0' },
        { status: 400 }
      );
    }

    // 1. Fetch loan
    const loan = (await db
      .prepare(
        `
      SELECT 
        id, 
        borrower_name, 
        initial_amount, 
        expected_interest, 
        total_expected, 
        paid_capital, 
        paid_interest, 
        current_balance, 
        status,
        COALESCE(loan_type, 'LENT') as loan_type
      FROM loans
      WHERE id = ? AND user_id = ?
    `
      )
      .get(id, auth.userId)) as any;

    if (!loan) {
      return NextResponse.json({ error: 'Préstamo no encontrado' }, { status: 404 });
    }

    const isBorrowed = loan.loan_type === 'BORROWED';
    const initialAmt = Number(loan.initial_amount) || 0;
    const newPaidCapital = Number(loan.paid_capital || 0) + capAmt;
    const newPaidInterest = Number(loan.paid_interest || 0) + intAmt;
    // Debt balance is the remaining principal
    const remainingCapital = Math.max(0, initialAmt - newPaidCapital);
    const newBalance = remainingCapital;
    // Loan is paid off only when all principal is returned
    const newStatus = remainingCapital <= 0 ? 'PAID' : 'ACTIVE';
    const payDate = payment_date || getTodayColombiaDate();
    const method = payment_method || 'Nequi';
    const cleanNotes = notes?.trim() || null;

    const paymentId = randomUUID();

    // 2. Insert audit payment record
    await db
      .prepare(
        `
      INSERT INTO loan_payments (
        id,
        loan_id,
        user_id,
        payment_date,
        capital_amount,
        interest_amount,
        total_amount,
        payment_method,
        notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        paymentId,
        id,
        auth.userId,
        payDate,
        capAmt,
        intAmt,
        totAmt,
        method,
        cleanNotes
      );

    // 3. Update loan record
    await db
      .prepare(
        `
      UPDATE loans
      SET 
        paid_capital = ?,
        paid_interest = ?,
        current_balance = ?,
        status = ?
      WHERE id = ? AND user_id = ?
    `
      )
      .run(newPaidCapital, newPaidInterest, newBalance, newStatus, id, auth.userId);

    // 4. Synchronize cash movements in expenses
    const expenseId = randomUUID();

    if (!isBorrowed) {
      // LENT: Money received from debtor -> INCOME to user's account
      let incomeCategory = (await db
        .prepare(
          `
        SELECT id FROM categories
        WHERE user_id = ? AND (LOWER(name) LIKE '%cobro%' OR LOWER(name) LIKE '%préstamo%') AND type = 'INCOME'
        LIMIT 1
      `
        )
        .get(auth.userId)) as any;

      if (!incomeCategory) {
        const newCatId = randomUUID();
        await db
          .prepare(
            `
          INSERT INTO categories (id, user_id, name, icon, color, monthly_budget, is_fixed, type)
          VALUES (?, ?, 'Cobros de Préstamos & Rendimientos', 'CircleDollarSign', '#10B981', 0, 0, 'INCOME')
        `
          )
          .run(newCatId, auth.userId);
        incomeCategory = { id: newCatId };
      }

      const movementNote = `Abono de ${loan.borrower_name} [Abono #${paymentId}]: Capital $${capAmt} + Interés $${intAmt}${cleanNotes ? ` (${cleanNotes})` : ''}`;

      await db
        .prepare(
          `
        INSERT INTO expenses (id, user_id, category_id, type, amount, payment_method, notes, date)
        VALUES (?, ?, ?, 'INCOME', ?, ?, ?, ?)
      `
        )
        .run(expenseId, auth.userId, incomeCategory.id, totAmt, method, movementNote, payDate);
    } else {
      // BORROWED: Money paid by user to lender -> EXPENSE from user's account
      let payDebtCategory = (await db
        .prepare(
          `
        SELECT id FROM categories
        WHERE user_id = ? AND (LOWER(name) LIKE '%pago deuda%' OR LOWER(name) LIKE '%amortización%') AND type = 'EXPENSE'
        LIMIT 1
      `
        )
        .get(auth.userId)) as any;

      if (!payDebtCategory) {
        const newCatId = randomUUID();
        await db
          .prepare(
            `
          INSERT INTO categories (id, user_id, name, icon, color, monthly_budget, is_fixed, type)
          VALUES (?, ?, 'Pago de Deudas & Amortización', 'Landmark', '#EF4444', 0, 0, 'EXPENSE')
        `
          )
          .run(newCatId, auth.userId);
        payDebtCategory = { id: newCatId };
      }

      const movementNote = `Pago de deuda a ${loan.borrower_name} [Abono #${paymentId}]: Capital $${capAmt} + Interés $${intAmt}${cleanNotes ? ` (${cleanNotes})` : ''}`;

      await db
        .prepare(
          `
        INSERT INTO expenses (id, user_id, category_id, type, amount, payment_method, notes, date)
        VALUES (?, ?, ?, 'EXPENSE', ?, ?, ?, ?)
      `
        )
        .run(expenseId, auth.userId, payDebtCategory.id, totAmt, method, movementNote, payDate);
    }

    // 5. Synchronize user's accounts and current cash
    await syncUserCurrentCash(auth.userId);

    return NextResponse.json({
      success: true,
      paymentId,
      newBalance,
      status: newStatus,
      message: isBorrowed
        ? `Pago de $${totAmt} registrado correctamente a ${loan.borrower_name}`
        : `Abono de $${totAmt} recibido correctamente de ${loan.borrower_name}`,
    });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Loan Payment POST error:', err);
    return NextResponse.json({ error: 'Error al registrar abono' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    const { id: loanId } = await params;
    const { searchParams } = new URL(req.url);
    const paymentId = searchParams.get('paymentId');

    if (!paymentId) {
      return NextResponse.json({ error: 'ID de abono no proporcionado' }, { status: 400 });
    }

    // 1. Fetch payment
    const payment = (await db
      .prepare(`SELECT * FROM loan_payments WHERE id = ? AND loan_id = ? AND user_id = ?`)
      .get(paymentId, loanId, auth.userId)) as any;

    if (!payment) {
      return NextResponse.json({ error: 'Abono no encontrado' }, { status: 404 });
    }

    // 2. Fetch loan
    const loan = (await db
      .prepare(`SELECT * FROM loans WHERE id = ? AND user_id = ?`)
      .get(loanId, auth.userId)) as any;

    if (!loan) {
      return NextResponse.json({ error: 'Préstamo no encontrado' }, { status: 404 });
    }

    const capToRevert = Number(payment.capital_amount) || 0;
    const intToRevert = Number(payment.interest_amount) || 0;
    const initialAmt = Number(loan.initial_amount) || 0;

    const newPaidCapital = Math.max(0, (Number(loan.paid_capital) || 0) - capToRevert);
    const newPaidInterest = Math.max(0, (Number(loan.paid_interest) || 0) - intToRevert);
    const newBalance = Math.max(0, initialAmt - newPaidCapital);
    const newStatus = newBalance <= 0 ? 'PAID' : 'ACTIVE';

    // 3. Delete payment record
    await db
      .prepare(`DELETE FROM loan_payments WHERE id = ? AND user_id = ?`)
      .run(paymentId, auth.userId);

    // 4. Delete corresponding movement in expenses if tagged
    await db
      .prepare(
        `DELETE FROM expenses WHERE user_id = ? AND notes LIKE ?`
      )
      .run(auth.userId, `%[Abono #${paymentId}]%`);

    // 5. Update loan balances
    await db
      .prepare(
        `
      UPDATE loans 
      SET 
        paid_capital = ?,
        paid_interest = ?,
        current_balance = ?,
        status = ?
      WHERE id = ? AND user_id = ?
    `
      )
      .run(newPaidCapital, newPaidInterest, newBalance, newStatus, loanId, auth.userId);

    // 6. Sync cash balances
    await syncUserCurrentCash(auth.userId);

    return NextResponse.json({
      success: true,
      message: 'Abono revertido exitosamente',
      newBalance,
      status: newStatus,
    });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Loan Payment DELETE error:', err);
    return NextResponse.json({ error: 'Error al revertir abono' }, { status: 500 });
  }
}
