import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { calculateFinancialHealth, formatCOP } from '@/lib/utils';

export async function GET() {
  try {
    const auth = await requireAuth();
    const currentMonth = new Date().toISOString().slice(0, 7);

    // 1. User financial setup
    const user = await db.prepare(`
      SELECT monthly_income, current_cash, payday_day
      FROM users
      WHERE id = ?
    `).get(auth.userId) as any;

    const monthlyIncome = Number(user.monthly_income) || 2000000;
    const currentCash = Number(user.current_cash) || 200000;
    const paydayDay = Number(user.payday_day) || 30;

    // 2. Spent this month
    const totalSpentRow = await db.prepare(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_spent,
        COALESCE(SUM(CASE WHEN c.is_fixed = 1 THEN e.amount ELSE 0 END), 0) as fixed_spent,
        COALESCE(SUM(CASE WHEN c.is_fixed = 0 THEN e.amount ELSE 0 END), 0) as variable_spent,
        COUNT(e.id) as expense_count
      FROM expenses e
      JOIN categories c ON c.id = e.category_id
      WHERE e.user_id = ? AND strftime('%Y-%m', e.date) = ?
    `).get(auth.userId, currentMonth) as any;

    const totalSpent = Number(totalSpentRow?.total_spent) || 0;
    const fixedSpent = Number(totalSpentRow?.fixed_spent) || 0;
    const variableSpent = Number(totalSpentRow?.variable_spent) || 0;
    const expenseCount = Number(totalSpentRow?.expense_count) || 0;

    // 3. Category Breakdown
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

    // 4. Financial Health Metrics
    const health = calculateFinancialHealth({
      monthlyIncome,
      currentCash,
      totalSpentThisMonth: totalSpent,
      paydayDay,
    });

    // 5. Intelligent Alerts
    const alerts: { id: string; type: 'CRITICAL' | 'WARNING' | 'INFO'; title: string; message: string }[] = [];

    if (currentCash <= 250000) {
      alerts.push({
        id: 'cash-low',
        type: 'CRITICAL',
        title: '¡Liquidez Crítica!',
        message: `Solo tienes ${formatCOP(currentCash)} disponibles. Tu límite de gasto diario es de ${formatCOP(health.safeDailySpend)}/día para llegar al siguiente pago sin endeudarte.`,
      });
    }

    breakdown.forEach(cat => {
      if (cat.monthly_budget > 0 && cat.total_spent > cat.monthly_budget) {
        alerts.push({
          id: `overflow-${cat.id}`,
          type: 'CRITICAL',
          title: `Presupuesto Superado: ${cat.name}`,
          message: `Has gastado ${formatCOP(cat.total_spent)} de los ${formatCOP(cat.monthly_budget)} estimados (${cat.budget_usage_percentage}%). Te pasaste por ${formatCOP(cat.total_spent - cat.monthly_budget)}.`,
        });
      } else if (cat.monthly_budget > 0 && cat.budget_usage_percentage >= 80) {
        alerts.push({
          id: `warning-${cat.id}`,
          type: 'WARNING',
          title: `Cuidado con ${cat.name}`,
          message: `Llevas el ${cat.budget_usage_percentage}% del presupuesto consumido (${formatCOP(cat.total_spent)} de ${formatCOP(cat.monthly_budget)}). Frena el gasto en este rubro.`,
        });
      }
    });

    if (health.daysOfCashRemaining < health.daysRemaining) {
      alerts.push({
        id: 'burn-pace',
        type: 'WARNING',
        title: 'Ritmo de Gasto Acelerado',
        message: `A tu ritmo de gasto actual (${formatCOP(health.dailyBurnAverage)}/día), tu efectivo se agotará en ${health.daysOfCashRemaining} días, antes de tu día de pago (faltan ${health.daysRemaining} días).`,
      });
    }

    const goalsCountRow = await db.prepare('SELECT COUNT(id) as count FROM goals WHERE user_id = ?').get(auth.userId) as any;

    return NextResponse.json({
      summary: {
        monthly_income: monthlyIncome,
        current_cash: currentCash,
        payday_day: paydayDay,
        total_spent: totalSpent,
        fixed_spent: fixedSpent,
        variable_spent: variableSpent,
        expense_count: expenseCount,
        free_cash_flow: monthlyIncome - totalSpent,
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
