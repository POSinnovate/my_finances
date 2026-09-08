import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { calculateFinancialHealth, formatCOP } from '@/lib/utils';

export async function GET() {
  try {
    const auth = await requireAuth();
    const currentMonth = new Date().toISOString().slice(0, 7);

    // 1. User financial setup
    const user = db.prepare(`
      SELECT monthly_income, current_cash, payday_day
      FROM users
      WHERE id = ?
    `).get(auth.userId) as {
      monthly_income: number;
      current_cash: number;
      payday_day: number;
    };

    // 2. Spent this month
    const totalSpentRow = db.prepare(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_spent,
        COALESCE(SUM(CASE WHEN c.is_fixed = 1 THEN e.amount ELSE 0 END), 0) as fixed_spent,
        COALESCE(SUM(CASE WHEN c.is_fixed = 0 THEN e.amount ELSE 0 END), 0) as variable_spent,
        COUNT(e.id) as expense_count
      FROM expenses e
      JOIN categories c ON c.id = e.category_id
      WHERE e.user_id = ? AND strftime('%Y-%m', e.date) = ?
    `).get(auth.userId, currentMonth) as {
      total_spent: number;
      fixed_spent: number;
      variable_spent: number;
      expense_count: number;
    };

    // 3. Category Breakdown
    const categoryStats = db.prepare(`
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
    `).all(currentMonth, auth.userId) as {
      id: string;
      name: string;
      icon: string;
      color: string;
      monthly_budget: number;
      is_fixed: number;
      total_spent: number;
      count: number;
    }[];

    const totalSpent = totalSpentRow.total_spent || 0;

    const breakdown = categoryStats.map(c => ({
      ...c,
      percentage_of_expenses: totalSpent > 0 ? Math.round((c.total_spent / totalSpent) * 100) : 0,
      budget_usage_percentage: c.monthly_budget > 0 ? Math.round((c.total_spent / c.monthly_budget) * 100) : 0,
    }));

    // Top 3 money leaks
    const topLeaks = breakdown.filter(c => c.total_spent > 0).slice(0, 3);

    // 4. Financial Health Metrics
    const health = calculateFinancialHealth({
      monthlyIncome: user.monthly_income,
      currentCash: user.current_cash,
      totalSpentThisMonth: totalSpent,
      paydayDay: user.payday_day,
    });

    // 5. Intelligent Alerts
    const alerts: { id: string; type: 'CRITICAL' | 'WARNING' | 'INFO'; title: string; message: string }[] = [];

    // Cash runway alert
    if (user.current_cash <= 250000) {
      alerts.push({
        id: 'cash-low',
        type: 'CRITICAL',
        title: '¡Liquidez Crítica!',
        message: `Solo tienes ${formatCOP(user.current_cash)} disponibles. Tu límite de gasto diario es de ${formatCOP(health.safeDailySpend)}/día para llegar al siguiente pago sin endeudarte.`,
      });
    }

    // Category budget overflow alerts
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

    // Burn rate warning
    if (health.daysOfCashRemaining < health.daysRemaining) {
      alerts.push({
        id: 'burn-pace',
        type: 'WARNING',
        title: 'Ritmo de Gasto Acelerado',
        message: `A tu ritmo de gasto actual (${formatCOP(health.dailyBurnAverage)}/día), tu efectivo se agotará en ${health.daysOfCashRemaining} días, antes de tu día de pago (faltan ${health.daysRemaining} días).`,
      });
    }

    // Goals progress
    const goalsCount = db.prepare('SELECT COUNT(id) as count FROM goals WHERE user_id = ?').get(auth.userId) as { count: number };

    return NextResponse.json({
      summary: {
        monthly_income: user.monthly_income,
        current_cash: user.current_cash,
        payday_day: user.payday_day,
        total_spent: totalSpent,
        fixed_spent: totalSpentRow.fixed_spent,
        variable_spent: totalSpentRow.variable_spent,
        expense_count: totalSpentRow.expense_count,
        free_cash_flow: user.monthly_income - totalSpent,
      },
      health,
      breakdown,
      topLeaks,
      alerts,
      goalsCount: goalsCount.count,
    });
  } catch (err: unknown) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Stats error:', err);
    return NextResponse.json({ error: 'Error calculando estadísticas' }, { status: 500 });
  }
}
