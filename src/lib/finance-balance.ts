import { db } from '@/lib/db/client';
import { createDefaultPaymentMethodsForUser } from '@/lib/db/categories-default';

export interface Pocket {
  id: string;
  user_id: string;
  payment_method_id: string;
  name: string;
  color: string;
  icon: string;
  current_balance: number;
  target_amount?: number;
  created_at: string;
}

export interface PaymentMethodBalance {
  id: string;
  user_id: string;
  name: string;
  type: string;
  color: string;
  icon: string;
  initial_balance: number;
  created_at: string;
  movement_count: number;
  income_this_month: number;
  expense_this_month: number;
  total_income: number;
  total_expense: number;
  transfers_in: number;
  transfers_out: number;
  net_balance: number;
  net_this_month: number;
  pockets_balance: number;
  free_balance: number;
  pockets: Pocket[];
}

export interface UserBalanceOverview {
  paymentMethods: PaymentMethodBalance[];
  totalAvailableCash: number;
}

/**
 * Calculates real-time balances for all payment methods of a user
 * and ensures payment methods exist.
 */
export async function calculatePaymentMethodsWithBalances(
  userId: string
): Promise<UserBalanceOverview> {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  // 1. Get payment methods
  let methods = (await db
    .prepare(
      `
    SELECT id, user_id, name, type, color, icon, COALESCE(initial_balance, 0) as initial_balance, created_at
    FROM payment_methods
    WHERE user_id = ?
    ORDER BY created_at ASC
  `
    )
    .all(userId)) as any[];

  if (!methods || methods.length === 0) {
    await createDefaultPaymentMethodsForUser(userId);
    methods = (await db
      .prepare(
        `
      SELECT id, user_id, name, type, color, icon, COALESCE(initial_balance, 0) as initial_balance, created_at
      FROM payment_methods
      WHERE user_id = ?
      ORDER BY created_at ASC
    `
      )
      .all(userId)) as any[];
  }

  // 2. Query all expenses/incomes/transfers for this user
  const userExpenses = (await db
    .prepare(
      `
    SELECT 
      id,
      type, 
      amount, 
      payment_method, 
      destination_method, 
      pocket_id,
      date
    FROM expenses
    WHERE user_id = ?
  `
    )
    .all(userId)) as any[];

  // 3. Query all pockets for this user
  const userPockets = (await db
    .prepare(
      `
    SELECT 
      id, 
      user_id, 
      payment_method_id, 
      name, 
      color, 
      icon, 
      COALESCE(current_balance, 0) as current_balance, 
      COALESCE(target_amount, 0) as target_amount, 
      created_at
    FROM account_pockets
    WHERE user_id = ?
    ORDER BY created_at ASC
  `
    )
    .all(userId)) as any[];

  // 4. Check if user already had legacy current_cash but all methods have initial_balance = 0 and no income
  const totalInitial = methods.reduce((acc, m) => acc + (Number(m.initial_balance) || 0), 0);
  if (totalInitial === 0 && userExpenses.length === 0) {
    const userRow = (await db
      .prepare('SELECT current_cash FROM users WHERE id = ?')
      .get(userId)) as any;
    const legacyCash = Number(userRow?.current_cash) || 0;
    if (legacyCash > 0 && methods.length > 0) {
      // Allocate legacy cash to first account
      const firstMethod = methods[0];
      await db
        .prepare('UPDATE payment_methods SET initial_balance = ? WHERE id = ?')
        .run(legacyCash, firstMethod.id);
      firstMethod.initial_balance = legacyCash;
    }
  }

  let totalAvailableCash = 0;

  const paymentMethods: PaymentMethodBalance[] = methods.map((m) => {
    const methodName = (m.name || '').trim().toLowerCase();
    const initialBalance = Number(m.initial_balance) || 0;

    let movement_count = 0;
    let income_this_month = 0;
    let expense_this_month = 0;
    let total_income = 0;
    let total_expense = 0;
    let transfers_in = 0;
    let transfers_out = 0;

    for (const e of userExpenses) {
      const amt = Number(e.amount) || 0;
      const src = (e.payment_method || '').trim().toLowerCase();
      const dst = (e.destination_method || '').trim().toLowerCase();

      let dateStr = '';
      if (typeof e.date === 'string') {
        dateStr = e.date.split('T')[0];
      } else if (e.date instanceof Date) {
        dateStr = e.date.toISOString().split('T')[0];
      }

      const isThisMonth =
        dateStr.startsWith(currentMonth) ||
        (dateStr !== '' && dateStr >= thirtyFiveDaysAgo);

      const isSource = src === methodName;
      const isDest = dst === methodName;

      if (isSource || isDest) {
        movement_count++;
      }

      // Direct Income or Capital Inflow into this account
      if ((e.type === 'INCOME' || e.type === 'LOAN_REPAY' || e.type === 'LOAN_BORROW') && isSource) {
        total_income += amt;
        if (isThisMonth) income_this_month += amt;
      }

      // Direct Expense or Capital Outflow from this account
      if ((e.type === 'EXPENSE' || !e.type || e.type === 'LOAN' || e.type === 'LOAN_DISBURSEMENT' || e.type === 'LOAN_PAYMENT') && isSource) {
        total_expense += amt;
        if (isThisMonth) expense_this_month += amt;
      }

      // Transfer into this account (Destination: Money entered)
      if (e.type === 'TRANSFER' && isDest) {
        total_income += amt;
        transfers_in += amt;
        if (isThisMonth) income_this_month += amt;
      }

      // Transfer out of this account (Source: Money left)
      if (e.type === 'TRANSFER' && isSource) {
        total_expense += amt;
        transfers_out += amt;
        if (isThisMonth) expense_this_month += amt;
      }
    }

    const net_movements = total_income - total_expense;
    const net_balance = initialBalance + net_movements;
    const net_this_month = income_this_month - expense_this_month;

    // Filter pockets for this account
    const pockets: Pocket[] = userPockets
      .filter((p) => p.payment_method_id === m.id)
      .map((p) => ({
        ...p,
        current_balance: Number(p.current_balance) || 0,
        target_amount: Number(p.target_amount) || 0,
      }));

    const pockets_balance = pockets.reduce((acc, p) => acc + p.current_balance, 0);
    const free_balance = Math.max(0, net_balance - pockets_balance);

    totalAvailableCash += net_balance;

    return {
      ...m,
      initial_balance: initialBalance,
      movement_count,
      income_this_month,
      expense_this_month,
      transfers_in,
      transfers_out,
      total_income,
      total_expense,
      net_balance,
      net_this_month,
      pockets_balance,
      free_balance,
      pockets,
    };
  });

  return {
    paymentMethods,
    totalAvailableCash,
  };
}

/**
 * Synchronizes users.current_cash with the real sum of all payment methods
 */
export async function syncUserCurrentCash(userId: string): Promise<number> {
  const { totalAvailableCash } = await calculatePaymentMethodsWithBalances(userId);

  await db
    .prepare(
      `
    UPDATE users
    SET current_cash = ?, updated_at = NOW()
    WHERE id = ?
  `
    )
    .run(totalAvailableCash, userId);

  return totalAvailableCash;
}

/**
 * Rebalances/equilibrates a payment method to match a desired target balance.
 * Automatically recalculates initial_balance so that:
 * net_balance = targetBalance
 */
export async function rebalancePaymentMethod(
  userId: string,
  methodId: string,
  targetBalance: number
): Promise<{ success: boolean; newBalance: number; totalAvailableCash: number }> {
  const method = (await db
    .prepare(
      `
    SELECT id, name FROM payment_methods WHERE id = ? AND user_id = ?
  `
    )
    .get(methodId, userId)) as any;

  if (!method) {
    throw new Error('Método no encontrado');
  }

  const methodName = (method.name || '').trim().toLowerCase();

  // Query all expenses for this method
  const userExpenses = (await db
    .prepare(
      `
    SELECT type, amount, payment_method, destination_method
    FROM expenses
    WHERE user_id = ?
  `
    )
    .all(userId)) as any[];

  let total_income = 0;
  let total_expense = 0;

  for (const e of userExpenses) {
    const amt = Number(e.amount) || 0;
    const src = (e.payment_method || '').trim().toLowerCase();
    const dst = (e.destination_method || '').trim().toLowerCase();

    if ((e.type === 'INCOME' || e.type === 'LOAN_REPAY' || e.type === 'LOAN_BORROW') && src === methodName) {
      total_income += amt;
    }
    if ((e.type === 'EXPENSE' || !e.type || e.type === 'LOAN' || e.type === 'LOAN_DISBURSEMENT' || e.type === 'LOAN_PAYMENT') && src === methodName) {
      total_expense += amt;
    }
    if (e.type === 'TRANSFER' && dst === methodName) {
      total_income += amt;
    }
    if (e.type === 'TRANSFER' && src === methodName) {
      total_expense += amt;
    }
  }

  const net_movements = total_income - total_expense;
  // targetBalance = initial_balance + net_movements
  // => initial_balance = targetBalance - net_movements
  const newInitialBalance = targetBalance - net_movements;

  await db
    .prepare(
      `
    UPDATE payment_methods
    SET initial_balance = ?
    WHERE id = ? AND user_id = ?
  `
    )
    .run(newInitialBalance, methodId, userId);

  const totalAvailableCash = await syncUserCurrentCash(userId);

  return {
    success: true,
    newBalance: targetBalance,
    totalAvailableCash,
  };
}
