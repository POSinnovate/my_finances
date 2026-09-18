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

    const capAmt = Number(capital_amount) || 0;
    const intAmt = Number(interest_amount) || 0;

    if (capAmt < 0 || intAmt < 0) {
      return NextResponse.json(
        { error: 'No se permiten montos negativos para abonos' },
        { status: 400 }
      );
    }

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
        interest_type,
        interest_rate,
        duration_months,
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

    const rate = Number(loan.interest_rate) || 0;
    const isPercent = (loan.interest_type || (rate > 0 ? 'PERCENT' : 'FIXED')) === 'PERCENT';
    
    // When capital is paid, recalculate monthly interest on remaining capital
    const newMonthlyInterest = isPercent && rate > 0
      ? (remainingCapital > 0 ? Math.round(remainingCapital * (rate / 100)) : 0)
      : Number(loan.expected_interest || 0);

    // 3. Update loan record
    await db
      .prepare(
        `
      UPDATE loans
      SET 
        paid_capital = ?,
        paid_interest = ?,
        current_balance = ?,
        expected_interest = ?,
        status = ?
      WHERE id = ? AND user_id = ?
    `
      )
      .run(newPaidCapital, newPaidInterest, newBalance, newMonthlyInterest, newStatus, id, auth.userId);

    // 4. Synchronize cash movements in expenses with professional accounting standards
    if (!isBorrowed) {
      // LENT: Money received from debtor
      // A. Capital returned: Asset recovery -> LOAN_REPAY (increases account, does NOT inflate monthly salary/income)
      if (capAmt > 0) {
        let loanCategory = (await db
          .prepare(
            `
          SELECT id FROM categories
          WHERE user_id = ? AND (LOWER(name) LIKE '%préstamo%' OR LOWER(name) LIKE '%cartera%')
          LIMIT 1
        `
          )
          .get(auth.userId)) as any;

        if (!loanCategory) {
          const newCatId = randomUUID();
          await db
            .prepare(
              `
            INSERT INTO categories (id, user_id, name, icon, color, monthly_budget, is_fixed, type)
            VALUES (?, ?, 'Préstamos & Cartera', 'HandCoins', '#8B5CF6', 0, 0, 'EXPENSE')
          `
            )
            .run(newCatId, auth.userId);
          loanCategory = { id: newCatId };
        }

        const capMovementNote = `Abono a Capital de ${loan.borrower_name} [Abono #${paymentId}]: Capital $${capAmt}${cleanNotes ? ` (${cleanNotes})` : ''}`;

        await db
          .prepare(
            `
          INSERT INTO expenses (id, user_id, category_id, type, amount, payment_method, notes, date)
          VALUES (?, ?, ?, 'LOAN_REPAY', ?, ?, ?, ?)
        `
          )
          .run(randomUUID(), auth.userId, loanCategory.id, capAmt, method, capMovementNote, payDate);
      }

      // B. Interest earned: Real financial gain -> INCOME (increases account AND counts as real profit in monthly income)
      if (intAmt > 0) {
        let yieldCategory = (await db
          .prepare(
            `
          SELECT id FROM categories
          WHERE user_id = ? AND (LOWER(name) LIKE '%rendimiento%' OR LOWER(name) LIKE '%interés%') AND type = 'INCOME'
          LIMIT 1
        `
          )
          .get(auth.userId)) as any;

        if (!yieldCategory) {
          const newCatId = randomUUID();
          await db
            .prepare(
              `
            INSERT INTO categories (id, user_id, name, icon, color, monthly_budget, is_fixed, type)
            VALUES (?, ?, 'Rendimientos & Intereses Ganados', 'TrendingUp', '#10B981', 0, 0, 'INCOME')
          `
            )
            .run(newCatId, auth.userId);
          yieldCategory = { id: newCatId };
        }

        const intMovementNote = `Rendimiento Interés de ${loan.borrower_name} [Abono #${paymentId}]: Interés $${intAmt}${cleanNotes ? ` (${cleanNotes})` : ''}`;

        await db
          .prepare(
            `
          INSERT INTO expenses (id, user_id, category_id, type, amount, payment_method, notes, date)
          VALUES (?, ?, ?, 'INCOME', ?, ?, ?, ?)
        `
          )
          .run(randomUUID(), auth.userId, yieldCategory.id, intAmt, method, intMovementNote, payDate);
      }
    } else {
      // BORROWED: Money paid by user to lender
      // A. Capital amortized: Liability reduction -> LOAN_PAYMENT (decreases account, does NOT inflate living expenses)
      if (capAmt > 0) {
        let debtCategory = (await db
          .prepare(
            `
          SELECT id FROM categories
          WHERE user_id = ? AND (LOWER(name) LIKE '%deuda%' OR LOWER(name) LIKE '%amortización%')
          LIMIT 1
        `
          )
          .get(auth.userId)) as any;

        if (!debtCategory) {
          const newCatId = randomUUID();
          await db
            .prepare(
              `
            INSERT INTO categories (id, user_id, name, icon, color, monthly_budget, is_fixed, type)
            VALUES (?, ?, 'Pago de Deudas & Amortización', 'Landmark', '#EF4444', 0, 0, 'EXPENSE')
          `
            )
            .run(newCatId, auth.userId);
          debtCategory = { id: newCatId };
        }

        const capMovementNote = `Amortización Capital deuda a ${loan.borrower_name} [Abono #${paymentId}]: Capital $${capAmt}${cleanNotes ? ` (${cleanNotes})` : ''}`;

        await db
          .prepare(
            `
          INSERT INTO expenses (id, user_id, category_id, type, amount, payment_method, notes, date)
          VALUES (?, ?, ?, 'LOAN_PAYMENT', ?, ?, ?, ?)
        `
          )
          .run(randomUUID(), auth.userId, debtCategory.id, capAmt, method, capMovementNote, payDate);
      }

      // B. Interest paid: Real financial cost -> EXPENSE (decreases account AND counts as financial cost)
      if (intAmt > 0) {
        let costCategory = (await db
          .prepare(
            `
          SELECT id FROM categories
          WHERE user_id = ? AND (LOWER(name) LIKE '%interés pagado%' OR LOWER(name) LIKE '%costo financiero%') AND type = 'EXPENSE'
          LIMIT 1
        `
          )
          .get(auth.userId)) as any;

        if (!costCategory) {
          const newCatId = randomUUID();
          await db
            .prepare(
              `
            INSERT INTO categories (id, user_id, name, icon, color, monthly_budget, is_fixed, type)
            VALUES (?, ?, 'Intereses & Costo Financiero', 'Percent', '#EF4444', 0, 0, 'EXPENSE')
          `
            )
            .run(newCatId, auth.userId);
          costCategory = { id: newCatId };
        }

        const intMovementNote = `Interés pagado por deuda a ${loan.borrower_name} [Abono #${paymentId}]: Interés $${intAmt}${cleanNotes ? ` (${cleanNotes})` : ''}`;

        await db
          .prepare(
            `
          INSERT INTO expenses (id, user_id, category_id, type, amount, payment_method, notes, date)
          VALUES (?, ?, ?, 'EXPENSE', ?, ?, ?, ?)
        `
          )
          .run(randomUUID(), auth.userId, costCategory.id, intAmt, method, intMovementNote, payDate);
      }
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
