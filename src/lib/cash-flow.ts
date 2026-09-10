import { formatCOP } from './utils';

export interface ScheduledCategory {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  monthly_budget: number;
  is_fixed?: number | boolean;
  due_day?: number | null;
  specific_date?: string | null;
  frequency?: string | null; // 'MONTHLY' | 'ONCE' | 'ANNUAL' | 'NONE'
  color?: string;
  icon?: string;
}

export interface ExpenseRecord {
  id: string;
  category_id: string | null;
  amount: number;
  date: string; // YYYY-MM-DD
  type?: 'EXPENSE' | 'INCOME';
}

export interface UpcomingCommitment {
  categoryId: string;
  name: string;
  amount: number;
  dateStr: string;
  daysUntil: number;
  frequency: string;
  isPaid: boolean;
  color?: string;
  icon?: string;
}

export interface NextIncomeInfo {
  name: string;
  amount: number;
  dateStr: string;
  daysRemaining: number;
  label: string;
}

export interface CashFlowResult {
  dynamicMonthlyIncome: number;
  nextIncome: NextIncomeInfo;
  upcomingCommitments: UpcomingCommitment[];
  totalPendingCommitments: number;
  freeCashForPeriod: number;
  currentCash: number;
  safeDailySpend: number;
  rawDailySpend: number;
  daysRemaining: number;
  alerts: {
    id: string;
    type: 'CRITICAL' | 'WARNING' | 'INFO';
    title: string;
    message: string;
    date?: string;
  }[];
}

function getBogotaToday(): { year: number; month: number; day: number; dateStr: string; dateObj: Date } {
  // Use Colombia timezone (UTC-5)
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.format(new Date()); // "YYYY-MM-DD"
  const [year, month, day] = parts.split('-').map(Number);
  const dateObj = new Date(Date.UTC(year, month - 1, day));
  return { year, month, day, dateStr: parts, dateObj };
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function clampDay(year: number, month: number, day: number): number {
  const max = getDaysInMonth(year, month);
  return Math.min(Math.max(1, day), max);
}

function formatDateISO(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function computeCashFlow({
  currentCash,
  paydayDay = 30,
  userMonthlyIncome = 0,
  categories,
  expenses = [],
}: {
  currentCash: number;
  paydayDay?: number;
  userMonthlyIncome?: number;
  categories: ScheduledCategory[];
  expenses?: ExpenseRecord[];
}): CashFlowResult {
  const today = getBogotaToday();

  // 1. Dynamic Monthly Income: Sum of budgeted income sources
  let dynamicMonthlyIncome = 0;
  const incomeCategories = categories.filter(c => c.type === 'INCOME');

  for (const cat of incomeCategories) {
    const budget = Number(cat.monthly_budget) || 0;
    const freq = cat.frequency || 'MONTHLY';

    if (freq === 'MONTHLY') {
      dynamicMonthlyIncome += budget;
    } else if (freq === 'ONCE' && cat.specific_date) {
      if (cat.specific_date.slice(0, 7) === today.dateStr.slice(0, 7)) {
        dynamicMonthlyIncome += budget;
      }
    } else if (freq === 'ANNUAL' && cat.specific_date) {
      const catMonth = Number(cat.specific_date.slice(5, 7));
      if (catMonth === today.month) {
        dynamicMonthlyIncome += budget;
      }
    } else {
      dynamicMonthlyIncome += budget;
    }
  }

  // Fallback if no income categories configured
  if (dynamicMonthlyIncome === 0 && userMonthlyIncome > 0) {
    dynamicMonthlyIncome = userMonthlyIncome;
  }

  // 2. Determine Next Income Date
  interface IncomeCandidate {
    name: string;
    amount: number;
    dateStr: string;
    daysRemaining: number;
    label: string;
  }

  const incomeCandidates: IncomeCandidate[] = [];

  for (const cat of incomeCategories) {
    const budget = Number(cat.monthly_budget) || 0;
    const freq = cat.frequency || (cat.specific_date ? 'ONCE' : 'MONTHLY');

    if (freq === 'MONTHLY' && cat.due_day) {
      const clampedThisMonth = clampDay(today.year, today.month, cat.due_day);
      if (clampedThisMonth >= today.day) {
        const dateStr = formatDateISO(today.year, today.month, clampedThisMonth);
        const days = Math.max(1, clampedThisMonth - today.day);
        incomeCandidates.push({
          name: cat.name,
          amount: budget,
          dateStr,
          daysRemaining: days,
          label: `${cat.name} (Día ${clampedThisMonth})`,
        });
      } else {
        // Next month occurrence
        const nextMonth = today.month === 12 ? 1 : today.month + 1;
        const nextYear = today.month === 12 ? today.year + 1 : today.year;
        const clampedNext = clampDay(nextYear, nextMonth, cat.due_day);
        const dateStr = formatDateISO(nextYear, nextMonth, clampedNext);
        const daysLeftThisMonth = getDaysInMonth(today.year, today.month) - today.day;
        const days = Math.max(1, daysLeftThisMonth + clampedNext);
        incomeCandidates.push({
          name: cat.name,
          amount: budget,
          dateStr,
          daysRemaining: days,
          label: `${cat.name} (Próx. Día ${clampedNext})`,
        });
      }
    } else if (freq === 'ONCE' && cat.specific_date) {
      const targetStr = cat.specific_date.slice(0, 10);
      if (targetStr >= today.dateStr) {
        const targetDateObj = new Date(targetStr + 'T00:00:00Z');
        const diffMs = targetDateObj.getTime() - today.dateObj.getTime();
        const days = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
        incomeCandidates.push({
          name: cat.name,
          amount: budget,
          dateStr: targetStr,
          daysRemaining: days,
          label: `${cat.name} (${targetStr})`,
        });
      }
    }
  }

  // Sort candidates by dateStr ascending
  incomeCandidates.sort((a, b) => a.dateStr.localeCompare(b.dateStr));

  let nextIncome: NextIncomeInfo;

  if (incomeCandidates.length > 0) {
    nextIncome = incomeCandidates[0];
  } else {
    // Default fallback to quincena / payday logic
    const currentDay = today.day;
    const daysInCurrentMonth = getDaysInMonth(today.year, today.month);

    if (currentDay < 15) {
      const days = 15 - currentDay;
      const dateStr = formatDateISO(today.year, today.month, 15);
      nextIncome = {
        name: 'Próxima Quincena',
        amount: Math.round(dynamicMonthlyIncome / 2),
        dateStr,
        daysRemaining: Math.max(1, days),
        label: `Quincena (Día 15)`,
      };
    } else if (currentDay === 15) {
      nextIncome = {
        name: 'Quincena de Hoy',
        amount: Math.round(dynamicMonthlyIncome / 2),
        dateStr: today.dateStr,
        daysRemaining: 1,
        label: `¡Hoy es Quincena!`,
      };
    } else {
      const targetDay = clampDay(today.year, today.month, paydayDay || 30);
      if (currentDay < targetDay) {
        const days = targetDay - currentDay;
        const dateStr = formatDateISO(today.year, today.month, targetDay);
        nextIncome = {
          name: 'Fin de Mes / Pago',
          amount: Math.round(dynamicMonthlyIncome / 2),
          dateStr,
          daysRemaining: Math.max(1, days),
          label: `Fin de Mes (Día ${targetDay})`,
        };
      } else if (currentDay === targetDay) {
        nextIncome = {
          name: 'Día de Pago de Hoy',
          amount: Math.round(dynamicMonthlyIncome / 2),
          dateStr: today.dateStr,
          daysRemaining: 1,
          label: `¡Hoy es Día de Pago!`,
        };
      } else {
        const daysLeftThisMonth = daysInCurrentMonth - currentDay;
        const nextMonth = today.month === 12 ? 1 : today.month + 1;
        const nextYear = today.month === 12 ? today.year + 1 : today.year;
        const dateStr = formatDateISO(nextYear, nextMonth, 15);
        nextIncome = {
          name: 'Próxima Quincena',
          amount: Math.round(dynamicMonthlyIncome / 2),
          dateStr,
          daysRemaining: Math.max(1, daysLeftThisMonth + 15),
          label: `Próxima Quincena (Día 15)`,
        };
      }
    }
  }

  // 3. Find Scheduled Commitments (Expenses) Falling Before nextIncome.dateStr
  const upcomingCommitments: UpcomingCommitment[] = [];
  const expenseCategories = categories.filter(c => c.type === 'EXPENSE');
  const targetEndStr = nextIncome.dateStr;

  // Track paid amounts per category in the current month/cycle
  const paidByCategory = new Map<string, number>();
  const currentMonthPrefix = today.dateStr.slice(0, 7);

  for (const exp of expenses) {
    if (exp.category_id && (!exp.type || exp.type === 'EXPENSE')) {
      if (exp.date.startsWith(currentMonthPrefix)) {
        const current = paidByCategory.get(exp.category_id) || 0;
        paidByCategory.set(exp.category_id, current + Number(exp.amount));
      }
    }
  }

  for (const cat of expenseCategories) {
    const budget = Number(cat.monthly_budget) || 0;
    const freq = cat.frequency || (cat.specific_date ? 'ONCE' : (cat.due_day ? 'MONTHLY' : 'NONE'));

    if (freq === 'MONTHLY' && cat.due_day) {
      // Check current month date
      const clampedThisMonth = clampDay(today.year, today.month, cat.due_day);
      const dateStrThisMonth = formatDateISO(today.year, today.month, clampedThisMonth);

      if (dateStrThisMonth >= today.dateStr && dateStrThisMonth <= targetEndStr) {
        const days = Math.max(0, clampedThisMonth - today.day);
        const alreadyPaid = (paidByCategory.get(cat.id) || 0) >= budget;

        upcomingCommitments.push({
          categoryId: cat.id,
          name: cat.name,
          amount: budget,
          dateStr: dateStrThisMonth,
          daysUntil: days,
          frequency: 'MONTHLY',
          isPaid: alreadyPaid,
          color: cat.color,
          icon: cat.icon,
        });
      } else if (targetEndStr > dateStrThisMonth) {
        // Maybe next month before targetEndStr?
        const nextMonth = today.month === 12 ? 1 : today.month + 1;
        const nextYear = today.month === 12 ? today.year + 1 : today.year;
        const clampedNext = clampDay(nextYear, nextMonth, cat.due_day);
        const dateStrNext = formatDateISO(nextYear, nextMonth, clampedNext);

        if (dateStrNext <= targetEndStr && dateStrNext >= today.dateStr) {
          const daysLeft = getDaysInMonth(today.year, today.month) - today.day;
          const days = daysLeft + clampedNext;
          const alreadyPaid = false;

          upcomingCommitments.push({
            categoryId: cat.id,
            name: cat.name,
            amount: budget,
            dateStr: dateStrNext,
            daysUntil: days,
            frequency: 'MONTHLY',
            isPaid: alreadyPaid,
            color: cat.color,
            icon: cat.icon,
          });
        }
      }
    } else if (freq === 'ONCE' && cat.specific_date) {
      const targetStr = cat.specific_date.slice(0, 10);
      if (targetStr >= today.dateStr && targetStr <= targetEndStr) {
        const targetDateObj = new Date(targetStr + 'T00:00:00Z');
        const diffMs = targetDateObj.getTime() - today.dateObj.getTime();
        const days = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
        const alreadyPaid = (paidByCategory.get(cat.id) || 0) >= budget;

        upcomingCommitments.push({
          categoryId: cat.id,
          name: cat.name,
          amount: budget,
          dateStr: targetStr,
          daysUntil: days,
          frequency: 'ONCE',
          isPaid: alreadyPaid,
          color: cat.color,
          icon: cat.icon,
        });
      }
    }
  }

  // Sort upcoming commitments chronologically
  upcomingCommitments.sort((a, b) => a.dateStr.localeCompare(b.dateStr));

  // 4. Calculate Pending Commitments & Burn Rate
  const pendingCommitmentsList = upcomingCommitments.filter(c => !c.isPaid);
  const totalPendingCommitments = pendingCommitmentsList.reduce((sum, c) => sum + c.amount, 0);

  const daysRemaining = Math.max(1, nextIncome.daysRemaining);
  const freeCashForPeriod = Math.max(0, currentCash - totalPendingCommitments);
  const safeDailySpend = Math.max(0, Math.floor(freeCashForPeriod / daysRemaining));
  const rawDailySpend = Math.max(0, Math.floor(currentCash / daysRemaining));

  // 5. Intelligent Notifications & Alerts
  const alerts: CashFlowResult['alerts'] = [];

  // Liquidity alert
  if (currentCash < totalPendingCommitments) {
    const deficit = totalPendingCommitments - currentCash;
    alerts.push({
      id: 'liquidity-shortage',
      type: 'CRITICAL',
      title: '¡Riesgo de Liquidez!',
      message: `Tus pagos fijos antes de tu próximo ingreso (${nextIncome.label}) suman ${formatCOP(totalPendingCommitments)}, pero tu fondo actual es de ${formatCOP(currentCash)}. Te faltan ${formatCOP(deficit)} para cubrirlos.`,
      date: today.dateStr,
    });
  } else if (safeDailySpend < 25000 && safeDailySpend > 0) {
    alerts.push({
      id: 'tight-daily-spend',
      type: 'WARNING',
      title: 'Gasto Diario Ajustado',
      message: `Apartando tus compromisos fijos (${formatCOP(totalPendingCommitments)}), tu margen seguro es de ${formatCOP(safeDailySpend)}/día hasta el ${nextIncome.dateStr}.`,
      date: today.dateStr,
    });
  }

  // Imminent commitments (due in <= 3 days)
  for (const c of pendingCommitmentsList) {
    if (c.daysUntil <= 3) {
      const timeLabel = c.daysUntil === 0 ? 'hoy' : (c.daysUntil === 1 ? 'mañana' : `en ${c.daysUntil} días`);
      alerts.push({
        id: `due-soon-${c.categoryId}-${c.dateStr}`,
        type: c.daysUntil <= 1 ? 'CRITICAL' : 'WARNING',
        title: `Compromiso Próximo: ${c.name}`,
        message: `Vence ${timeLabel} (${c.dateStr}) por un valor de ${formatCOP(c.amount)}. Recuerda apartar o registrar el pago.`,
        date: c.dateStr,
      });
    }
  }

  // Imminent income (in <= 3 days)
  if (nextIncome.daysRemaining <= 3 && nextIncome.amount > 0) {
    const timeLabel = nextIncome.daysRemaining === 1 ? 'mañana o muy pronto' : `en ${nextIncome.daysRemaining} días`;
    alerts.push({
      id: `income-soon-${nextIncome.dateStr}`,
      type: 'INFO',
      title: `Próximo Ingreso: ${nextIncome.name}`,
      message: `Se estiman ${formatCOP(nextIncome.amount)} ${timeLabel} (${nextIncome.dateStr}).`,
      date: nextIncome.dateStr,
    });
  }

  return {
    dynamicMonthlyIncome,
    nextIncome,
    upcomingCommitments,
    totalPendingCommitments,
    freeCashForPeriod,
    currentCash,
    safeDailySpend,
    rawDailySpend,
    daysRemaining,
    alerts,
  };
}
