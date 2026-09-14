import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { randomUUID } from 'crypto';
import { syncUserCurrentCash } from '@/lib/finance-balance';
import { getTodayColombiaDate } from '@/lib/dayjs';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();

    // Limpieza automática de movimientos huérfanos en expenses de préstamos o abonos ya borrados
    const orphanExpenses = (await db
      .prepare(
        `SELECT id, notes FROM expenses WHERE user_id = ? AND (notes LIKE '%[ID:%' OR notes LIKE '%[Abono #%')`
      )
      .all(auth.userId)) as any[];

    let hasOrphans = false;
    for (const exp of orphanExpenses) {
      const loanMatch = exp.notes?.match(/\[ID:([a-zA-Z0-9-]+)\]/);
      if (loanMatch && loanMatch[1]) {
        const loanId = loanMatch[1];
        const loanExists = await db
          .prepare(`SELECT id FROM loans WHERE id = ? AND user_id = ?`)
          .get(loanId, auth.userId);
        if (!loanExists) {
          await db.prepare(`DELETE FROM expenses WHERE id = ? AND user_id = ?`).run(exp.id, auth.userId);
          hasOrphans = true;
        }
      }
      const paymentMatch = exp.notes?.match(/\[Abono #([a-zA-Z0-9-]+)\]/);
      if (paymentMatch && paymentMatch[1]) {
        const paymentId = paymentMatch[1];
        const payExists = await db
          .prepare(`SELECT id FROM loan_payments WHERE id = ? AND user_id = ?`)
          .get(paymentId, auth.userId);
        if (!payExists) {
          await db.prepare(`DELETE FROM expenses WHERE id = ? AND user_id = ?`).run(exp.id, auth.userId);
          hasOrphans = true;
        }
      }
    }
    if (hasOrphans) {
      await syncUserCurrentCash(auth.userId);
    }

    const searchParams = req.nextUrl.searchParams;
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const status = searchParams.get('status') || 'ACTIVE'; // 'ACTIVE' | 'PAID' | 'ALL'
    const type = searchParams.get('type') || 'LENT'; // 'LENT' | 'BORROWED' | 'ALL'

    let whereClause = 'WHERE user_id = ?';
    const params: any[] = [auth.userId];

    if (type && type !== 'ALL') {
      whereClause += ' AND COALESCE(loan_type, \'LENT\') = ?';
      params.push(type);
    }

    if (status && status !== 'ALL') {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      whereClause += ' AND (LOWER(borrower_name) LIKE ? OR LOWER(COALESCE(notes, \'\')) LIKE ?)';
      const pattern = `%${search}%`;
      params.push(pattern, pattern);
    }

    const query = `
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
        tag,
        pocket_id,
        notes,
        created_at
      FROM loans
      ${whereClause}
      ORDER BY 
        CASE WHEN status = 'ACTIVE' THEN 0 ELSE 1 END,
        due_date ASC NULLS LAST,
        created_at DESC
    `;

    const rows = (await db.prepare(query).all(...params)) as any[];

    // Fetch payments for each loan to show summary and recent payments
    const loansWithDetails = await Promise.all(
      rows.map(async (l) => {
        const initAmt = Number(l.initial_amount) || 0;
        const rate = Number(l.interest_rate) || 0;
        const expInt = Number(l.expected_interest) || 0;
        const paidCap = Number(l.paid_capital) || 0;
        const paidInt = Number(l.paid_interest) || 0;

        // Debt is the remaining principal
        const remainingCapital = Math.max(0, initAmt - paidCap);
        // Monthly interest charged per period/cobro based on current remaining capital
        const monthlyInterest = rate > 0 ? Math.round(remainingCapital * (rate / 100)) : expInt;
        const curBal = remainingCapital;

        // Duration in months (stored or calculated from start_date to due_date)
        let durationMonths = Number(l.duration_months) || 1;
        if (durationMonths <= 1 && l.start_date && l.due_date) {
          const s = new Date(l.start_date);
          const d = new Date(l.due_date);
          const diffDays = Math.max(0, (d.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
          const m = Math.round(diffDays / 30);
          if (m > 1) durationMonths = m;
        }

        // Projected interest for the entire duration of the loan
        const projectedInterest =
          rate > 0 ? Math.round(initAmt * (rate / 100) * durationMonths) : expInt;
        // Total money to collect (Principal + Projected Interest)
        const totalToCollect = initAmt + projectedInterest;
        // Money collected so far (Capital returned + Interest collected)
        const totalCollected = paidCap + paidInt;
        // Remaining to collect in total
        const remainingToCollect = Math.max(0, totalToCollect - totalCollected);

        // Progress reflects total collection
        const progressPercentage =
          totalToCollect > 0 ? Math.min(100, Math.round((totalCollected / totalToCollect) * 100)) : 100;
        // Capital amortization progress
        const capitalProgress =
          initAmt > 0 ? Math.min(100, Math.round((paidCap / initAmt) * 100)) : 100;

        // Fetch recent payments for audit preview
        const recentPayments = (await db
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
          WHERE loan_id = ?
          ORDER BY payment_date DESC, created_at DESC
        `
          )
          .all(l.id)) as any[];

        return {
          ...l,
          initial_amount: initAmt,
          interest_rate: rate,
          duration_months: durationMonths,
          expected_interest: expInt,
          monthly_interest: monthlyInterest,
          projected_interest: projectedInterest,
          total_expected: totalToCollect,
          total_to_collect: totalToCollect,
          paid_capital: paidCap,
          paid_interest: paidInt,
          total_collected: totalCollected,
          remaining_to_collect: remainingToCollect,
          current_balance: curBal,
          total_paid: totalCollected,
          progress_percentage: progressPercentage,
          capital_progress: capitalProgress,
          remaining_capital: remainingCapital,
          remaining_interest: monthlyInterest,
          payment_count: recentPayments.length,
          payments: recentPayments.map((p) => ({
            ...p,
            capital_amount: Number(p.capital_amount) || 0,
            interest_amount: Number(p.interest_amount) || 0,
            total_amount: Number(p.total_amount) || 0,
          })),
        };
      })
    );

    // Global summary metrics across active loans
    const activeLoans = loansWithDetails.filter((l) => l.status === 'ACTIVE');

    // Count totals by type across user's entire portfolio (for tab counters)
    const counts = (await db
      .prepare(
        `
      SELECT 
        COALESCE(loan_type, 'LENT') as l_type,
        COUNT(*) as cnt
      FROM loans
      WHERE user_id = ? AND status = 'ACTIVE'
      GROUP BY COALESCE(loan_type, 'LENT')
    `
      )
      .all(auth.userId)) as any[];

    let activeLentCount = 0;
    let activeBorrowedCount = 0;
    for (const c of counts) {
      if (c.l_type === 'BORROWED') activeBorrowedCount = Number(c.cnt) || 0;
      else activeLentCount += Number(c.cnt) || 0;
    }

    const summary = {
      active_loans_count: activeLoans.length,
      total_active_capital_lent: activeLoans.reduce((acc, l) => acc + l.remaining_capital, 0),
      total_initial_capital_lent: activeLoans.reduce((acc, l) => acc + l.initial_amount, 0),
      total_interest_collected: loansWithDetails.reduce((acc, l) => acc + l.paid_interest, 0),
      total_projected_interest: activeLoans.reduce((acc, l) => acc + (l.projected_interest || 0), 0),
      total_expected_return: activeLoans.reduce((acc, l) => acc + (l.total_to_collect || 0), 0),
      total_collected_overall: loansWithDetails.reduce((acc, l) => acc + l.total_collected, 0),
      monthly_projected_interest: activeLoans.reduce((acc, l) => acc + (l.monthly_interest || 0), 0),
      total_balance_due: activeLoans.reduce((acc, l) => acc + l.remaining_capital, 0),
      // Counts for UI tabs
      active_lent_count: activeLentCount,
      active_borrowed_count: activeBorrowedCount,
    };

    return NextResponse.json({
      loans: loansWithDetails,
      summary,
    });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Loans GET error:', err);
    return NextResponse.json({ error: 'Error al consultar préstamos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const body = await req.json();

    const {
      borrower_name,
      borrower_phone,
      initial_amount,
      interest_rate,
      expected_interest,
      duration_months,
      start_date,
      due_date,
      payment_method,
      loan_type,
      tag,
      pocket_id,
      notes,
    } = body;

    if (!borrower_name || !borrower_name.trim()) {
      return NextResponse.json(
        { error: 'El nombre de la persona o entidad es obligatorio' },
        { status: 400 }
      );
    }

    const principal = Number(initial_amount);
    if (isNaN(principal) || principal <= 0) {
      return NextResponse.json(
        { error: 'El capital debe ser mayor a 0' },
        { status: 400 }
      );
    }

    const isBorrowed = loan_type === 'BORROWED';
    const cleanLoanType = isBorrowed ? 'BORROWED' : 'LENT';

    // If loan is lent from a pocket, verify pocket balance and deduct
    if (pocket_id && !isBorrowed) {
      const pocket = (await db
        .prepare('SELECT id, current_balance, name FROM account_pockets WHERE id = ? AND user_id = ?')
        .get(pocket_id, auth.userId)) as any;

      if (!pocket) {
        return NextResponse.json({ error: 'El bolsillo seleccionado no existe' }, { status: 404 });
      }

      const pBal = Number(pocket.current_balance) || 0;
      if (principal > pBal) {
        return NextResponse.json({
          error: `Saldo insuficiente en el bolsillo "${pocket.name}". Saldo disponible: $${pBal.toLocaleString('es-CO')}`,
        }, { status: 400 });
      }

      await db
        .prepare('UPDATE account_pockets SET current_balance = current_balance - ?, updated_at = NOW() WHERE id = ?')
        .run(principal, pocket_id);
    }

    const rate = Number(interest_rate) || 0;
    let monthlyInterest = Number(expected_interest);
    if (isNaN(monthlyInterest) || monthlyInterest <= 0) {
      monthlyInterest = rate > 0 ? Math.round(principal * (rate / 100)) : 0;
    }

    const durationMonths = Math.max(1, Number(duration_months) || 1);
    const projectedInterest = rate > 0 ? Math.round(principal * (rate / 100) * durationMonths) : monthlyInterest;
    const totalExpected = principal + projectedInterest;
    const currentBalance = principal;
    const startDate = start_date || getTodayColombiaDate();
    const dueDate = due_date || null;
    const method = payment_method || 'Efectivo';
    const cleanNotes = notes?.trim() || null;

    const loanId = randomUUID();

    // 1. Insert loan
    await db
      .prepare(
        `
      INSERT INTO loans (
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
        start_date,
        due_date,
        duration_months,
        payment_method,
        status,
        loan_type,
        tag,
        pocket_id,
        notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?)
    `
      )
      .run(
        loanId,
        auth.userId,
        borrower_name.trim(),
        borrower_phone?.trim() || null,
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
        tag?.trim() || null,
        pocket_id || null,
        cleanNotes
      );

    // 2. Cash balance synchronization via expenses
    if (!isBorrowed) {
      // LENT: You lent money -> Cash leaves your account (EXPENSE)
      let loanCategory = (await db
        .prepare(
          `
        SELECT id FROM categories
        WHERE user_id = ? AND LOWER(name) LIKE '%préstamo%' AND type = 'EXPENSE'
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

      const expenseId = randomUUID();
      await db
        .prepare(
          `
        INSERT INTO expenses (id, user_id, category_id, type, amount, payment_method, pocket_id, notes, date)
        VALUES (?, ?, ?, 'LOAN', ?, ?, ?, ?, ?)
      `
        )
        .run(
          expenseId,
          auth.userId,
          loanCategory.id,
          principal,
          method,
          pocket_id || null,
          `Desembolso de préstamo a ${borrower_name.trim()} [ID:${loanId}]${cleanNotes ? ` - ${cleanNotes}` : ''}`,
          startDate
        );
    } else {
      // BORROWED: You received borrowed money -> Cash enters your account (Liability / LOAN_BORROW)
      let debtCategory = (await db
        .prepare(
          `
        SELECT id FROM categories
        WHERE user_id = ? AND (LOWER(name) LIKE '%deuda%' OR LOWER(name) LIKE '%préstamo recibido%') AND type = 'INCOME'
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
          VALUES (?, ?, 'Deudas & Préstamos Recibidos', 'Landmark', '#00ADB5', 0, 0, 'INCOME')
        `
          )
          .run(newCatId, auth.userId);
        debtCategory = { id: newCatId };
      }

      const expenseId = randomUUID();
      await db
        .prepare(
          `
        INSERT INTO expenses (id, user_id, category_id, type, amount, payment_method, notes, date)
        VALUES (?, ?, ?, 'LOAN_BORROW', ?, ?, ?, ?)
      `
        )
        .run(
          expenseId,
          auth.userId,
          debtCategory.id,
          principal,
          method,
          `Ingreso por préstamo recibido de ${borrower_name.trim()} (Deuda adquirida) [ID:${loanId}]${cleanNotes ? ` - ${cleanNotes}` : ''}`,
          startDate
        );
    }

    // 3. Synchronize user's accounts and current cash
    await syncUserCurrentCash(auth.userId);

    return NextResponse.json({
      success: true,
      id: loanId,
      message: isBorrowed
        ? `Deuda registrada con ${borrower_name.trim()} por ${principal}`
        : `Préstamo registrado a ${borrower_name.trim()} por ${principal}`,
    });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Loans POST error:', err);
    return NextResponse.json({ error: 'Error al registrar préstamo' }, { status: 500 });
  }
}
