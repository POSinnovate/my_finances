import { formatCOP } from './utils';

export interface ScheduledItem {
  id: string;
  category_id: string;
  name: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  frequency?: string; // 'MONTHLY' | 'ONCE' | 'ANNUAL'
  due_day?: number | null;
  specific_date?: string | null;
  is_active?: number | boolean;
  notes?: string | null;
  category_name?: string;
  color?: string;
  icon?: string;
}

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
  date: string | Date; // YYYY-MM-DD or Date
  type?: 'EXPENSE' | 'INCOME';
  notes?: string | null;
}

export interface UpcomingCommitment {
  id?: string;
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
  categoryName?: string;
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

export function safeFormatDate(d: any): string {
  if (!d) return '';
  if (typeof d === 'string') return d.slice(0, 10);
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
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
  categories = [],
  expenses = [],
  scheduledItems = [],
}: {
  currentCash: number;
  paydayDay?: number;
  userMonthlyIncome?: number;
  categories: ScheduledCategory[];
  expenses?: ExpenseRecord[];
  scheduledItems?: ScheduledItem[];
}): CashFlowResult {
  const today = getBogotaToday();
  const currentMonthPrefix = today.dateStr.slice(0, 7);

  // Map category details for easy lookup
  const categoryMap = new Map<string, ScheduledCategory>();
  for (const c of categories) {
    categoryMap.set(c.id, c);
  }

  // Find which categories have scheduled sub-items
  const activeItems = scheduledItems.filter(item => item.is_active === 1 || item.is_active === true || item.is_active === undefined);
  const categoriesWithItems = new Set<string>(activeItems.map(item => item.category_id));

  // 1. Dynamic Monthly Income: Sum of scheduled income items + income categories without sub-items
  let dynamicMonthlyIncome = 0;

  // From scheduled items
  for (const item of activeItems.filter(i => i.type === 'INCOME')) {
    const amt = Number(item.amount) || 0;
    const freq = item.frequency || 'MONTHLY';

    if (freq === 'MONTHLY') {
      dynamicMonthlyIncome += amt;
    } else if (freq === 'ONCE' && item.specific_date) {
      const itemDateStr = safeFormatDate(item.specific_date);
      if (itemDateStr.slice(0, 7) === currentMonthPrefix) {
        dynamicMonthlyIncome += amt;
      }
    } else if (freq === 'ANNUAL' && item.specific_date) {
      const itemDateStr = safeFormatDate(item.specific_date);
      const itemMonth = Number(itemDateStr.slice(5, 7));
      if (itemMonth === today.month) {
        dynamicMonthlyIncome += amt;
      }
    } else {
      dynamicMonthlyIncome += amt;
    }
  }

  // From categories that don't have scheduled sub-items
  for (const cat of categories.filter(c => c.type === 'INCOME')) {
    if (!categoriesWithItems.has(cat.id)) {
      const budget = Number(cat.monthly_budget) || 0;
      const freq = cat.frequency || 'MONTHLY';

      if (freq === 'MONTHLY') {
        dynamicMonthlyIncome += budget;
      } else if (freq === 'ONCE' && cat.specific_date) {
        const catDateStr = safeFormatDate(cat.specific_date);
        if (catDateStr.slice(0, 7) === currentMonthPrefix) {
          dynamicMonthlyIncome += budget;
        }
      } else if (freq === 'ANNUAL' && cat.specific_date) {
        const catDateStr = safeFormatDate(cat.specific_date);
        const catMonth = Number(catDateStr.slice(5, 7));
        if (catMonth === today.month) {
          dynamicMonthlyIncome += budget;
        }
      } else {
        dynamicMonthlyIncome += budget;
      }
    }
  }

  // Fallback if no income items configured
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
    categoryName?: string;
  }

  const incomeCandidates: IncomeCandidate[] = [];

  // A) Candidates from scheduled items
  for (const item of activeItems.filter(i => i.type === 'INCOME')) {
    const amt = Number(item.amount) || 0;
    const freq = item.frequency || (item.specific_date ? 'ONCE' : 'MONTHLY');
    const cat = categoryMap.get(item.category_id);
    const catName = cat?.name || 'Ingreso';

    if (freq === 'MONTHLY' && item.due_day) {
      const clampedThisMonth = clampDay(today.year, today.month, item.due_day);
      if (clampedThisMonth >= today.day) {
        const dateStr = formatDateISO(today.year, today.month, clampedThisMonth);
        const days = Math.max(1, clampedThisMonth - today.day);
        incomeCandidates.push({
          name: item.name,
          amount: amt,
          dateStr,
          daysRemaining: days,
          label: `${item.name} (Día ${clampedThisMonth})`,
          categoryName: catName,
        });
      } else {
        const nextMonth = today.month === 12 ? 1 : today.month + 1;
        const nextYear = today.month === 12 ? today.year + 1 : today.year;
        const clampedNext = clampDay(nextYear, nextMonth, item.due_day);
        const dateStr = formatDateISO(nextYear, nextMonth, clampedNext);
        const daysLeftThisMonth = getDaysInMonth(today.year, today.month) - today.day;
        const days = Math.max(1, daysLeftThisMonth + clampedNext);
        incomeCandidates.push({
          name: item.name,
          amount: amt,
          dateStr,
          daysRemaining: days,
          label: `${item.name} (Próx. Día ${clampedNext})`,
          categoryName: catName,
        });
      }
    } else if (freq === 'ONCE' && item.specific_date) {
      const targetStr = safeFormatDate(item.specific_date);
      if (targetStr >= today.dateStr) {
        const targetDateObj = new Date(targetStr + 'T00:00:00Z');
        const diffMs = targetDateObj.getTime() - today.dateObj.getTime();
        const days = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
        incomeCandidates.push({
          name: item.name,
          amount: amt,
          dateStr: targetStr,
          daysRemaining: days,
          label: `${item.name} (${targetStr})`,
          categoryName: catName,
        });
      }
    } else if (freq === 'ANNUAL' && item.specific_date) {
      const origDateStr = safeFormatDate(item.specific_date);
      const m = Number(origDateStr.slice(5, 7));
      const d = Number(origDateStr.slice(8, 10));
      let candidateYear = today.year;
      let candidateDateStr = formatDateISO(candidateYear, m, clampDay(candidateYear, m, d));
      if (candidateDateStr < today.dateStr) {
        candidateYear += 1;
        candidateDateStr = formatDateISO(candidateYear, m, clampDay(candidateYear, m, d));
      }
      const targetDateObj = new Date(candidateDateStr + 'T00:00:00Z');
      const diffMs = targetDateObj.getTime() - today.dateObj.getTime();
      const days = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      incomeCandidates.push({
        name: item.name,
        amount: amt,
        dateStr: candidateDateStr,
        daysRemaining: days,
        label: `${item.name} (Anual ${candidateDateStr})`,
        categoryName: catName,
      });
    }
  }

  // B) Candidates from categories without sub-items
  for (const cat of categories.filter(c => c.type === 'INCOME')) {
    if (!categoriesWithItems.has(cat.id)) {
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
            categoryName: cat.name,
          });
        } else {
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
            categoryName: cat.name,
          });
        }
      } else if (freq === 'ONCE' && cat.specific_date) {
        const targetStr = safeFormatDate(cat.specific_date);
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
            categoryName: cat.name,
          });
        }
      }
    }
  }

  // C) Default User Payday Fallback
  const safePayday = clampDay(today.year, today.month, paydayDay);
  if (safePayday >= today.day) {
    const days = Math.max(1, safePayday - today.day);
    incomeCandidates.push({
      name: 'Día de Pago Habitual',
      amount: userMonthlyIncome,
      dateStr: formatDateISO(today.year, today.month, safePayday),
      daysRemaining: days,
      label: `Día ${safePayday} de este mes`,
    });
  } else {
    const nextMonth = today.month === 12 ? 1 : today.month + 1;
    const nextYear = today.month === 12 ? today.year + 1 : today.year;
    const nextPayday = clampDay(nextYear, nextMonth, paydayDay);
    const daysLeftThisMonth = getDaysInMonth(today.year, today.month) - today.day;
    const days = Math.max(1, daysLeftThisMonth + nextPayday);
    incomeCandidates.push({
      name: 'Próximo Día de Pago',
      amount: userMonthlyIncome,
      dateStr: formatDateISO(nextYear, nextMonth, nextPayday),
      daysRemaining: days,
      label: `Día ${nextPayday} del próx. mes`,
    });
  }

  // Sort chronologically and take closest
  incomeCandidates.sort((a, b) => a.daysRemaining - b.daysRemaining);
  const nextIncome = incomeCandidates[0];

  // 3. Find Scheduled Commitments (Expenses) Falling Before nextIncome.dateStr
  const upcomingCommitments: UpcomingCommitment[] = [];
  const targetEndStr = nextIncome.dateStr;

  // Track paid amounts per category in the current month/cycle (safe date parsing)
  const paidByCategory = new Map<string, number>();

  for (const exp of expenses) {
    if (exp.category_id && (!exp.type || exp.type === 'EXPENSE')) {
      const expDateStr = safeFormatDate(exp.date);
      if (expDateStr.startsWith(currentMonthPrefix)) {
        const current = paidByCategory.get(exp.category_id) || 0;
        paidByCategory.set(exp.category_id, current + Number(exp.amount));
      }
    }
  }

  // A) Expenses from scheduled items
  for (const item of activeItems.filter(i => i.type === 'EXPENSE')) {
    const amt = Number(item.amount) || 0;
    const freq = item.frequency || (item.specific_date ? 'ONCE' : (item.due_day ? 'MONTHLY' : 'NONE'));
    const cat = categoryMap.get(item.category_id);

    if (freq === 'MONTHLY' && item.due_day) {
      const clampedThisMonth = clampDay(today.year, today.month, item.due_day);
      const dateStrThisMonth = formatDateISO(today.year, today.month, clampedThisMonth);

      if (dateStrThisMonth >= today.dateStr && dateStrThisMonth <= targetEndStr) {
        const days = Math.max(0, clampedThisMonth - today.day);
        const alreadyPaid = (paidByCategory.get(item.category_id) || 0) >= amt;

        upcomingCommitments.push({
          id: item.id,
          categoryId: item.category_id,
          name: item.name,
          amount: amt,
          dateStr: dateStrThisMonth,
          daysUntil: days,
          frequency: 'MONTHLY',
          isPaid: alreadyPaid,
          color: cat?.color || '#00ADB5',
          icon: cat?.icon || 'Tag',
        });
      } else if (targetEndStr > dateStrThisMonth) {
        const nextMonth = today.month === 12 ? 1 : today.month + 1;
        const nextYear = today.month === 12 ? today.year + 1 : today.year;
        const clampedNext = clampDay(nextYear, nextMonth, item.due_day);
        const dateStrNext = formatDateISO(nextYear, nextMonth, clampedNext);

        if (dateStrNext <= targetEndStr && dateStrNext >= today.dateStr) {
          const daysLeft = getDaysInMonth(today.year, today.month) - today.day;
          const days = daysLeft + clampedNext;

          upcomingCommitments.push({
            id: item.id,
            categoryId: item.category_id,
            name: item.name,
            amount: amt,
            dateStr: dateStrNext,
            daysUntil: days,
            frequency: 'MONTHLY',
            isPaid: false,
            color: cat?.color || '#00ADB5',
            icon: cat?.icon || 'Tag',
          });
        }
      }
    } else if (freq === 'ONCE' && item.specific_date) {
      const targetStr = safeFormatDate(item.specific_date);
      if (targetStr >= today.dateStr && targetStr <= targetEndStr) {
        const targetDateObj = new Date(targetStr + 'T00:00:00Z');
        const diffMs = targetDateObj.getTime() - today.dateObj.getTime();
        const days = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
        const alreadyPaid = (paidByCategory.get(item.category_id) || 0) >= amt;

        upcomingCommitments.push({
          id: item.id,
          categoryId: item.category_id,
          name: item.name,
          amount: amt,
          dateStr: targetStr,
          daysUntil: days,
          frequency: 'ONCE',
          isPaid: alreadyPaid,
          color: cat?.color || '#00ADB5',
          icon: cat?.icon || 'Tag',
        });
      }
    }
  }

  // B) Expenses from categories that don't have scheduled items
  for (const cat of categories.filter(c => c.type === 'EXPENSE')) {
    if (!categoriesWithItems.has(cat.id)) {
      const budget = Number(cat.monthly_budget) || 0;
      const freq = cat.frequency || (cat.specific_date ? 'ONCE' : (cat.due_day ? 'MONTHLY' : 'NONE'));

      if (freq === 'MONTHLY' && cat.due_day) {
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
        }
      } else if (freq === 'ONCE' && cat.specific_date) {
        const targetStr = safeFormatDate(cat.specific_date);
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
        id: `due-soon-${c.categoryId}-${c.name}-${c.dateStr}`,
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
