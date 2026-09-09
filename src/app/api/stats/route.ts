import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { calculateFinancialHealth, formatCOP } from '@/lib/utils';

export async function GET() {
  try {
    const auth = await requireAuth();
    const currentMonth = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date()).slice(0, 7);

    // 1. User available fund and payday
    const user = await db.prepare(`
      SELECT current_cash, payday_day
      FROM users
      WHERE id = ?
    `).get(auth.userId) as any;

    const currentCash = Number(user?.current_cash) || 0;
    const paydayDay = Number(user?.payday_day) || 30;

    // 2. Real Income of the current month (Sum of all registered INCOME transactions)
    const incomeRow = await db.prepare(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_income,
        COUNT(id) as count
      FROM expenses
      WHERE user_id = ? AND type = 'INCOME' AND strftime('%Y-%m', date) = ?
    `).get(auth.userId, currentMonth) as any;

    let totalIncomeThisMonth = Number(incomeRow?.total_income) || 0;
    let incomeCount = Number(incomeRow?.count) || 0;

    // If current calendar month has no registered income yet (e.g., paid on 30/31st of previous month for current quincena),
    // use income from the last 35 days as active period income so stats and health are accurate.
    if (totalIncomeThisMonth === 0) {
      const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const recentIncomeRow = await db.prepare(`
        SELECT 
          COALESCE(SUM(amount), 0) as total_income,
          COUNT(id) as count
        FROM expenses
        WHERE user_id = ? AND type = 'INCOME' AND date >= ?
      `).get(auth.userId, thirtyFiveDaysAgo) as any;

      if (recentIncomeRow && Number(recentIncomeRow.total_income) > 0) {
        totalIncomeThisMonth = Number(recentIncomeRow.total_income);
        incomeCount = Number(recentIncomeRow.count);
      }
    }

    // 3. Real Expenses of the current month (Sum of all registered EXPENSE transactions)
    const expensesRow = await db.prepare(`
      SELECT 
        COALESCE(SUM(e.amount), 0) as total_spent,
        COALESCE(SUM(CASE WHEN c.is_fixed = 1 THEN e.amount ELSE 0 END), 0) as fixed_spent,
        COALESCE(SUM(CASE WHEN COALESCE(c.is_fixed, 0) = 0 THEN e.amount ELSE 0 END), 0) as variable_spent,
        COUNT(e.id) as expense_count
      FROM expenses e
      LEFT JOIN categories c ON c.id = e.category_id
      WHERE e.user_id = ? AND (e.type = 'EXPENSE' OR e.type IS NULL) AND strftime('%Y-%m', e.date) = ?
    `).get(auth.userId, currentMonth) as any;

    const totalSpent = Number(expensesRow?.total_spent) || 0;
    const fixedSpent = Number(expensesRow?.fixed_spent) || 0;
    const variableSpent = Number(expensesRow?.variable_spent) || 0;
    const expenseCount = Number(expensesRow?.expense_count) || 0;

    // 4. Committed Monthly Fixed Expenses (From categories defined as is_fixed = 1)
    const fixedCommitmentsRow = await db.prepare(`
      SELECT COALESCE(SUM(monthly_budget), 0) as total_fixed_budget
      FROM categories
      WHERE user_id = ? AND is_fixed = 1
    `).get(auth.userId) as any;

    const totalFixedBudget = Number(fixedCommitmentsRow?.total_fixed_budget) || 0;

    // Net Difference / Savings of this month
    const netDifference = totalIncomeThisMonth - totalSpent;

    // 5. Category Breakdown for Expenses
    const categoryStats = await db.prepare(`
      SELECT 
        c.id,
        c.name,
        c.icon,
        c.color,
        c.monthly_budget,
        c.is_fixed,
        COALESCE(SUM(e.amount), 0) as total_spent,
        COUNT(e.id) as count
      FROM categories c
      LEFT JOIN expenses e ON e.category_id = c.id 
        AND e.user_id = c.user_id 
        AND (e.type = 'EXPENSE' OR e.type IS NULL)
        AND strftime('%Y-%m', e.date) = ?
      WHERE c.user_id = ?
      GROUP BY c.id
      ORDER BY total_spent DESC
    `).all(currentMonth, auth.userId) as any[];

    const breakdown = categoryStats.map(c => {
      const budget = Number(c.monthly_budget) || 0;
      const spent = Number(c.total_spent) || 0;
      return {
        ...c,
        monthly_budget: budget,
        total_spent: spent,
        percentage_of_expenses: totalSpent > 0 ? Math.round((spent / totalSpent) * 100) : 0,
        budget_usage_percentage: budget > 0 ? Math.round((spent / budget) * 100) : 0,
      };
    });

    const topLeaks = breakdown.filter(c => c.total_spent > 0).slice(0, 3);

    // 6. Financial Health Metrics
    const health = calculateFinancialHealth({
      monthlyIncome: totalIncomeThisMonth,
      currentCash,
      totalSpentThisMonth: totalSpent,
      paydayDay,
    });

    // 7. Intelligent Alerts
    const alerts: { id: string; type: 'CRITICAL' | 'WARNING' | 'INFO'; title: string; message: string }[] = [];

    if (currentCash <= 250000) {
      alerts.push({
        id: 'cash-low',
        type: 'CRITICAL',
        title: '¡Fondo Disponible Crítico!',
        message: `Te quedan ${formatCOP(currentCash)} disponibles en tu fondo. Tu límite diario seguro es de ${formatCOP(health.safeDailySpend)}/día.`,
      });
    }

    if (totalIncomeThisMonth > 0 && totalSpent > totalIncomeThisMonth) {
      alerts.push({
        id: 'deficit-month',
        type: 'CRITICAL',
        title: 'Déficit en el Mes',
        message: `Has gastado ${formatCOP(totalSpent)} y tus ingresos de este mes han sido ${formatCOP(totalIncomeThisMonth)}. Llevas un déficit de ${formatCOP(totalSpent - totalIncomeThisMonth)}.`,
      });
    }

    breakdown.forEach(cat => {
      if (cat.monthly_budget > 0 && cat.total_spent > cat.monthly_budget) {
        alerts.push({
          id: `overflow-${cat.id}`,
          type: 'CRITICAL',
          title: `Límite Superado: ${cat.name}`,
          message: `Has gastado ${formatCOP(cat.total_spent)} de los ${formatCOP(cat.monthly_budget)} presupuestados (${cat.budget_usage_percentage}%).`,
        });
      } else if (cat.monthly_budget > 0 && cat.budget_usage_percentage >= 80) {
        alerts.push({
          id: `warning-${cat.id}`,
          type: 'WARNING',
          title: `Atención con ${cat.name}`,
          message: `Llevas el ${cat.budget_usage_percentage}% del presupuesto consumido (${formatCOP(cat.total_spent)} de ${formatCOP(cat.monthly_budget)}).`,
        });
      }
    });

    const goalsCountRow = await db.prepare('SELECT COUNT(id) as count FROM goals WHERE user_id = ?').get(auth.userId) as any;

    return NextResponse.json({
      summary: {
        total_income: totalIncomeThisMonth,
        income_count: incomeCount,
        total_spent: totalSpent,
        fixed_spent: fixedSpent,
        variable_spent: variableSpent,
        fixed_budget: totalFixedBudget,
        expense_count: expenseCount,
        net_difference: netDifference,
        current_cash: currentCash,
        payday_day: paydayDay,
      },
      health,
      breakdown,
      topLeaks,
      alerts,
      goalsCount: Number(goalsCountRow?.count) || 0,
    });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Stats error:', err);
    return NextResponse.json({ error: 'Error calculando estadísticas' }, { status: 500 });
  }
}
