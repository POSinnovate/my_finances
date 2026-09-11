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
  type?: 'INCOME' | 'EXPENSE';
  dateStr: string;
  daysUntil: number;
  frequency: string;
  isPaid: boolean;
  color?: string;
  icon?: string;
}

export interface NextPaymentInfo {
  id?: string;
  name: string;
  amount: number;
  dateStr: string;
  daysRemaining: number;
  isOverdue: boolean;
  daysOverdue: number;
  label: string;
  categoryName?: string;
  categoryId?: string;
  type: 'INCOME' | 'EXPENSE';
}

export type NextIncomeInfo = NextPaymentInfo;

export interface OverdueCommitment {
  id: string;
  categoryId: string;
  name: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  dueDay?: number | null;
  dateStr: string;
  daysOverdue: number;
  frequency: string;
  color?: string;
  icon?: string;
}

export interface CashFlowResult {
  dynamicMonthlyIncome: number;
  nextIncome: NextPaymentInfo | null;
  nextExpense: NextPaymentInfo | null;
  upcomingCommitments: UpcomingCommitment[];
  overdueCommitments: OverdueCommitment[];
  totalPendingCommitments: number;
  totalPendingFixedExpensesMonth: number;
  projectedNetBalance: number;
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
    action?: {
      scheduledItemId?: string;
      categoryId?: string;
      name: string;
      amount: number;
      dueDay?: number | null;
    };
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

  // 1. Dynamic Monthly Income: Sum of scheduled income items + income categories with dates
  let dynamicMonthlyIncome = 0;

  // From scheduled items (they all have dates)
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

  // From categories that don't have scheduled sub-items (ONLY if they have a date defined: due_day or specific_date)
  for (const cat of categories.filter(c => c.type === 'INCOME')) {
    if (!categoriesWithItems.has(cat.id)) {
      const budget = Number(cat.monthly_budget) || 0;
      const freq = cat.frequency || 'MONTHLY';

      if (cat.due_day || cat.specific_date) {
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
        }
      }
    }
  }

  // 2. Track paid and received amounts per category in the current month (safe date parsing)
  const paidByCategory = new Map<string, number>();
  const receivedByCategory = new Map<string, number>();

  for (const exp of expenses) {
    if (exp.category_id) {
      const expDateStr = safeFormatDate(exp.date);
      if (expDateStr.startsWith(currentMonthPrefix)) {
        if (exp.type === 'INCOME') {
          const current = receivedByCategory.get(exp.category_id) || 0;
          receivedByCategory.set(exp.category_id, current + Number(exp.amount));
        } else if (!exp.type || exp.type === 'EXPENSE') {
          const current = paidByCategory.get(exp.category_id) || 0;
          paidByCategory.set(exp.category_id, current + Number(exp.amount));
        }
      }
    }
  }

  const deferTagCurrentMonth = `[Pospuesto al sig. mes - ${currentMonthPrefix}]`;

  // 3. Find Overdue and Upcoming Commitments, and build Next Income & Next Expense candidates
  const upcomingCommitments: UpcomingCommitment[] = [];
  const overdueCommitments: OverdueCommitment[] = [];
  const incomeCandidates: NextPaymentInfo[] = [];
  const expenseCandidates: NextPaymentInfo[] = [];

  const daysInMonth = getDaysInMonth(today.year, today.month);
  const endOfMonthStr = formatDateISO(today.year, today.month, daysInMonth);

  // A) Process scheduled sub-items
  for (const item of activeItems) {
    const amt = Number(item.amount) || 0;
    const freq = item.frequency || (item.specific_date ? 'ONCE' : (item.due_day ? 'MONTHLY' : 'NONE'));
    const cat = categoryMap.get(item.category_id);
    const catName = cat?.name || (item.type === 'INCOME' ? 'Ingreso' : 'Egreso');
    const isDeferred = Boolean(item.notes && item.notes.includes(deferTagCurrentMonth));
    const isIncome = item.type === 'INCOME';
    const fulfilled = isIncome
      ? (receivedByCategory.get(item.category_id) || 0) >= amt
      : (paidByCategory.get(item.category_id) || 0) >= amt;

    if (freq === 'MONTHLY' && item.due_day) {
      const clampedThisMonth = clampDay(today.year, today.month, item.due_day);
      const dateStrThisMonth = formatDateISO(today.year, today.month, clampedThisMonth);

      // Overdue or due today in current month
      if (clampedThisMonth <= today.day) {
        if (!fulfilled && !isDeferred) {
          const daysOver = today.day - clampedThisMonth;
          const isOver = daysOver > 0;
          const candidate: NextPaymentInfo = {
            id: item.id,
            name: item.name,
            amount: amt,
            dateStr: dateStrThisMonth,
            daysRemaining: isOver ? -daysOver : 0,
            isOverdue: isOver,
            daysOverdue: daysOver,
            label: isOver ? `${item.name} (Venció hace ${daysOver}d)` : `${item.name} (¡HOY!)`,
            categoryName: catName,
            categoryId: item.category_id,
            type: isIncome ? 'INCOME' : 'EXPENSE',
          };

          if (isIncome) {
            incomeCandidates.push(candidate);
          } else {
            expenseCandidates.push(candidate);
          }

          overdueCommitments.push({
            id: item.id,
            categoryId: item.category_id,
            name: item.name,
            amount: amt,
            type: isIncome ? 'INCOME' : 'EXPENSE',
            dueDay: clampedThisMonth,
            dateStr: dateStrThisMonth,
            daysOverdue: daysOver,
            frequency: 'MONTHLY',
            color: cat?.color || (isIncome ? '#10B981' : '#00ADB5'),
            icon: cat?.icon || (isIncome ? 'ArrowUpCircle' : 'Tag'),
          });
        } else {
          // Fulfilled or deferred: project next month
          const nextMonth = today.month === 12 ? 1 : today.month + 1;
          const nextYear = today.month === 12 ? today.year + 1 : today.year;
          const clampedNext = clampDay(nextYear, nextMonth, item.due_day);
          const dateStrNext = formatDateISO(nextYear, nextMonth, clampedNext);
          const daysLeftThisMonth = daysInMonth - today.day;
          const days = Math.max(1, daysLeftThisMonth + clampedNext);

          const candidate: NextPaymentInfo = {
            id: item.id,
            name: item.name,
            amount: amt,
            dateStr: dateStrNext,
            daysRemaining: days,
            isOverdue: false,
            daysOverdue: 0,
            label: `${item.name} (Próx. Día ${clampedNext})`,
            categoryName: catName,
            categoryId: item.category_id,
            type: isIncome ? 'INCOME' : 'EXPENSE',
          };
          if (isIncome) incomeCandidates.push(candidate);
          else expenseCandidates.push(candidate);
        }
      } else {
        // Due later this month (daysRemaining > 0)
        const days = clampedThisMonth - today.day;
        const candidate: NextPaymentInfo = {
          id: item.id,
          name: item.name,
          amount: amt,
          dateStr: dateStrThisMonth,
          daysRemaining: days,
          isOverdue: false,
          daysOverdue: 0,
          label: `${item.name} (Día ${clampedThisMonth})`,
          categoryName: catName,
          categoryId: item.category_id,
          type: isIncome ? 'INCOME' : 'EXPENSE',
        };

        if (isIncome) incomeCandidates.push(candidate);
        else expenseCandidates.push(candidate);

        upcomingCommitments.push({
          id: item.id,
          categoryId: item.category_id,
          name: item.name,
          amount: amt,
          type: isIncome ? 'INCOME' : 'EXPENSE',
          dateStr: dateStrThisMonth,
          daysUntil: days,
          frequency: 'MONTHLY',
          isPaid: fulfilled,
          color: cat?.color || (isIncome ? '#10B981' : '#00ADB5'),
          icon: cat?.icon || (isIncome ? 'ArrowUpCircle' : 'Tag'),
        });
      }
    } else if (freq === 'ONCE' && item.specific_date) {
      const targetStr = safeFormatDate(item.specific_date);
      const targetDateObj = new Date(targetStr + 'T00:00:00Z');
      const diffMs = targetDateObj.getTime() - today.dateObj.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (targetStr <= today.dateStr && targetStr.startsWith(currentMonthPrefix)) {
        if (!fulfilled && !isDeferred) {
          const daysOver = Math.max(0, -diffDays);
          const isOver = daysOver > 0;
          const candidate: NextPaymentInfo = {
            id: item.id,
            name: item.name,
            amount: amt,
            dateStr: targetStr,
            daysRemaining: isOver ? -daysOver : 0,
            isOverdue: isOver,
            daysOverdue: daysOver,
            label: `${item.name} (${targetStr})`,
            categoryName: catName,
            categoryId: item.category_id,
            type: isIncome ? 'INCOME' : 'EXPENSE',
          };
          if (isIncome) incomeCandidates.push(candidate);
          else expenseCandidates.push(candidate);

          overdueCommitments.push({
            id: item.id,
            categoryId: item.category_id,
            name: item.name,
            amount: amt,
            type: isIncome ? 'INCOME' : 'EXPENSE',
            dueDay: Number(targetStr.slice(8, 10)),
            dateStr: targetStr,
            daysOverdue: daysOver,
            frequency: 'ONCE',
            color: cat?.color || (isIncome ? '#10B981' : '#00ADB5'),
            icon: cat?.icon || (isIncome ? 'ArrowUpCircle' : 'Tag'),
          });
        }
      } else if (targetStr > today.dateStr) {
        const days = Math.max(1, diffDays);
        const candidate: NextPaymentInfo = {
          id: item.id,
          name: item.name,
          amount: amt,
          dateStr: targetStr,
          daysRemaining: days,
          isOverdue: false,
          daysOverdue: 0,
          label: `${item.name} (${targetStr})`,
          categoryName: catName,
          categoryId: item.category_id,
          type: isIncome ? 'INCOME' : 'EXPENSE',
        };
        if (isIncome) incomeCandidates.push(candidate);
        else expenseCandidates.push(candidate);

        upcomingCommitments.push({
          id: item.id,
          categoryId: item.category_id,
          name: item.name,
          amount: amt,
          type: isIncome ? 'INCOME' : 'EXPENSE',
          dateStr: targetStr,
          daysUntil: days,
          frequency: 'ONCE',
          isPaid: fulfilled,
          color: cat?.color || (isIncome ? '#10B981' : '#00ADB5'),
          icon: cat?.icon || (isIncome ? 'ArrowUpCircle' : 'Tag'),
        });
      }
    }
  }

  // B) Process single-date categories without sub-items
  for (const cat of categories) {
    if (!categoriesWithItems.has(cat.id)) {
      const budget = Number(cat.monthly_budget) || 0;
      const freq = cat.frequency || (cat.specific_date ? 'ONCE' : (cat.due_day ? 'MONTHLY' : 'NONE'));
      const isIncome = cat.type === 'INCOME';
      const fulfilled = isIncome
        ? (receivedByCategory.get(cat.id) || 0) >= budget
        : (paidByCategory.get(cat.id) || 0) >= budget;

      if (freq === 'MONTHLY' && cat.due_day && budget > 0) {
        const clampedThisMonth = clampDay(today.year, today.month, cat.due_day);
        const dateStrThisMonth = formatDateISO(today.year, today.month, clampedThisMonth);

        if (clampedThisMonth <= today.day) {
          if (!fulfilled) {
            const daysOver = today.day - clampedThisMonth;
            const isOver = daysOver > 0;
            const candidate: NextPaymentInfo = {
              id: cat.id,
              name: cat.name,
              amount: budget,
              dateStr: dateStrThisMonth,
              daysRemaining: isOver ? -daysOver : 0,
              isOverdue: isOver,
              daysOverdue: daysOver,
              label: isOver ? `${cat.name} (Venció hace ${daysOver}d)` : `${cat.name} (¡HOY!)`,
              categoryName: cat.name,
              categoryId: cat.id,
              type: isIncome ? 'INCOME' : 'EXPENSE',
            };
            if (isIncome) incomeCandidates.push(candidate);
            else expenseCandidates.push(candidate);

            overdueCommitments.push({
              id: cat.id,
              categoryId: cat.id,
              name: cat.name,
              amount: budget,
              type: isIncome ? 'INCOME' : 'EXPENSE',
              dueDay: clampedThisMonth,
              dateStr: dateStrThisMonth,
              daysOverdue: daysOver,
              frequency: 'MONTHLY',
              color: cat.color || (isIncome ? '#10B981' : '#00ADB5'),
              icon: cat.icon || (isIncome ? 'ArrowUpCircle' : 'Tag'),
            });
          } else {
            const nextMonth = today.month === 12 ? 1 : today.month + 1;
            const nextYear = today.month === 12 ? today.year + 1 : today.year;
            const clampedNext = clampDay(nextYear, nextMonth, cat.due_day);
            const dateStrNext = formatDateISO(nextYear, nextMonth, clampedNext);
            const daysLeftThisMonth = daysInMonth - today.day;
            const days = Math.max(1, daysLeftThisMonth + clampedNext);

            const candidate: NextPaymentInfo = {
              id: cat.id,
              name: cat.name,
              amount: budget,
              dateStr: dateStrNext,
              daysRemaining: days,
              isOverdue: false,
              daysOverdue: 0,
              label: `${cat.name} (Próx. Día ${clampedNext})`,
              categoryName: cat.name,
              categoryId: cat.id,
              type: isIncome ? 'INCOME' : 'EXPENSE',
            };
            if (isIncome) incomeCandidates.push(candidate);
            else expenseCandidates.push(candidate);
          }
        } else {
          const days = clampedThisMonth - today.day;
          const candidate: NextPaymentInfo = {
            id: cat.id,
            name: cat.name,
            amount: budget,
            dateStr: dateStrThisMonth,
            daysRemaining: days,
            isOverdue: false,
            daysOverdue: 0,
            label: `${cat.name} (Día ${clampedThisMonth})`,
            categoryName: cat.name,
            categoryId: cat.id,
            type: isIncome ? 'INCOME' : 'EXPENSE',
          };
          if (isIncome) incomeCandidates.push(candidate);
          else expenseCandidates.push(candidate);

          upcomingCommitments.push({
            categoryId: cat.id,
            name: cat.name,
            amount: budget,
            type: isIncome ? 'INCOME' : 'EXPENSE',
            dateStr: dateStrThisMonth,
            daysUntil: days,
            frequency: 'MONTHLY',
            isPaid: fulfilled,
            color: cat.color || (isIncome ? '#10B981' : '#00ADB5'),
            icon: cat.icon || (isIncome ? 'ArrowUpCircle' : 'Tag'),
          });
        }
      } else if (freq === 'ONCE' && cat.specific_date && budget > 0) {
        const targetStr = safeFormatDate(cat.specific_date);
        const targetDateObj = new Date(targetStr + 'T00:00:00Z');
        const diffMs = targetDateObj.getTime() - today.dateObj.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (targetStr <= today.dateStr && targetStr.startsWith(currentMonthPrefix)) {
          if (!fulfilled) {
            const daysOver = Math.max(0, -diffDays);
            const isOver = daysOver > 0;
            const candidate: NextPaymentInfo = {
              id: cat.id,
              name: cat.name,
              amount: budget,
              dateStr: targetStr,
              daysRemaining: isOver ? -daysOver : 0,
              isOverdue: isOver,
              daysOverdue: daysOver,
              label: `${cat.name} (${targetStr})`,
              categoryName: cat.name,
              categoryId: cat.id,
              type: isIncome ? 'INCOME' : 'EXPENSE',
            };
            if (isIncome) incomeCandidates.push(candidate);
            else expenseCandidates.push(candidate);

            overdueCommitments.push({
              id: cat.id,
              categoryId: cat.id,
              name: cat.name,
              amount: budget,
              type: isIncome ? 'INCOME' : 'EXPENSE',
              dueDay: Number(targetStr.slice(8, 10)),
              dateStr: targetStr,
              daysOverdue: daysOver,
              frequency: 'ONCE',
              color: cat.color || (isIncome ? '#10B981' : '#00ADB5'),
              icon: cat.icon || (isIncome ? 'ArrowUpCircle' : 'Tag'),
            });
          }
        } else if (targetStr > today.dateStr) {
          const days = Math.max(1, diffDays);
          const candidate: NextPaymentInfo = {
            id: cat.id,
            name: cat.name,
            amount: budget,
            dateStr: targetStr,
            daysRemaining: days,
            isOverdue: false,
            daysOverdue: 0,
            label: `${cat.name} (${targetStr})`,
            categoryName: cat.name,
            categoryId: cat.id,
            type: isIncome ? 'INCOME' : 'EXPENSE',
          };
          if (isIncome) incomeCandidates.push(candidate);
          else expenseCandidates.push(candidate);

          upcomingCommitments.push({
            categoryId: cat.id,
            name: cat.name,
            amount: budget,
            type: isIncome ? 'INCOME' : 'EXPENSE',
            dateStr: targetStr,
            daysUntil: days,
            frequency: 'ONCE',
            isPaid: fulfilled,
            color: cat.color || (isIncome ? '#10B981' : '#00ADB5'),
            icon: cat.icon || (isIncome ? 'ArrowUpCircle' : 'Tag'),
          });
        }
      }
    }
  }

  // Priority sorting: Due today first, then Overdue, then closest Upcoming
  function sortPaymentCandidates(a: NextPaymentInfo, b: NextPaymentInfo) {
    if (a.daysRemaining === 0 && b.daysRemaining !== 0) return -1;
    if (b.daysRemaining === 0 && a.daysRemaining !== 0) return 1;

    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    if (a.isOverdue && b.isOverdue) return a.daysRemaining - b.daysRemaining;

    return a.daysRemaining - b.daysRemaining;
  }

  incomeCandidates.sort(sortPaymentCandidates);
  const nextIncome = incomeCandidates.length > 0 ? incomeCandidates[0] : null;

  expenseCandidates.sort(sortPaymentCandidates);
  const nextExpense = expenseCandidates.length > 0 ? expenseCandidates[0] : null;

  // Sort upcoming commitments chronologically
  upcomingCommitments.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  overdueCommitments.sort((a, b) => b.daysOverdue - a.daysOverdue);

  // 4. Calculate Pending Commitments & Burn Rate
  const pendingExpensesList = upcomingCommitments.filter(c => !c.isPaid && c.type !== 'INCOME');

  // Total pending fixed expenses for the entire month (overdue + all upcoming for this month)
  let totalPendingFixedExpensesMonth = overdueCommitments
    .filter(c => c.type !== 'INCOME')
    .reduce((sum, c) => sum + c.amount, 0);
  for (const c of pendingExpensesList) {
    if (c.dateStr.startsWith(currentMonthPrefix)) {
      totalPendingFixedExpensesMonth += c.amount;
    }
  }

  // Real expenses registered in the current month
  const totalSpentMonth = expenses
    .filter(e => (!e.type || e.type === 'EXPENSE') && safeFormatDate(e.date).startsWith(currentMonthPrefix))
    .reduce((sum, e) => sum + Number(e.amount), 0);

  // Projected Net Balance = Dynamic Monthly Income - (Real Expenses Spent + Pending Fixed Commitments of the Month)
  const totalProjectedMonthExpenses = totalSpentMonth + totalPendingFixedExpensesMonth;
  const projectedNetBalance = dynamicMonthlyIncome - totalProjectedMonthExpenses;

  // Determine target income for daily spend calculation:
  // Find the closest upcoming income with daysRemaining >= 0
  const targetIncome = incomeCandidates.find(c => c.daysRemaining >= 0) || (incomeCandidates.length > 0 ? incomeCandidates[0] : null);

  let daysRemaining = Math.max(1, daysInMonth - today.day + 1);
  if (targetIncome) {
    if (targetIncome.daysRemaining > 0) {
      daysRemaining = targetIncome.daysRemaining;
    } else if (targetIncome.daysRemaining === 0) {
      daysRemaining = 1; // Hoy llega el ingreso
    }
  }

  // Overdue expense commitments that need to be settled immediately from current cash
  const overdueExpenseAmount = overdueCommitments
    .filter(c => c.type !== 'INCOME')
    .reduce((sum, c) => sum + c.amount, 0);

  // CRITICAL: Commitments that must be covered by current cash BEFORE the next income arrives
  // Any expense due AFTER the next income will be paid with that future income, NOT from currentCash!
  let totalPendingCommitments = 0;
  if (targetIncome && targetIncome.daysRemaining >= 0) {
    const expensesBeforeNextIncome = pendingExpensesList.filter(c => c.daysUntil <= targetIncome.daysRemaining);
    totalPendingCommitments = overdueExpenseAmount + expensesBeforeNextIncome.reduce((sum, c) => sum + c.amount, 0);
  } else {
    // If no upcoming income, all pending commitments of the current month apply
    const expensesRestOfMonth = pendingExpensesList.filter(c => c.dateStr.startsWith(currentMonthPrefix));
    totalPendingCommitments = overdueExpenseAmount + expensesRestOfMonth.reduce((sum, c) => sum + c.amount, 0);
  }

  const freeCashForPeriod = Math.max(0, currentCash - totalPendingCommitments);
  const safeDailySpend = Math.max(0, Math.floor(freeCashForPeriod / daysRemaining));
  const rawDailySpend = Math.max(0, Math.floor(currentCash / daysRemaining));

  // 5. Intelligent Notifications & Alerts
  const alerts: CashFlowResult['alerts'] = [];

  // Overdue commitments alerts (actionable)
  for (const o of overdueCommitments) {
    alerts.push({
      id: `overdue-${o.id}`,
      type: 'WARNING',
      title: `Compromiso No Registrado: ${o.name}`,
      message: `El pago de ${formatCOP(o.amount)} estaba programado para el Día ${o.dueDay || o.dateStr} (hace ${o.daysOverdue} días) y no se ha registrado movimiento este mes. ¿Deseas añadirle días de espera o programarlo para el siguiente mes?`,
      date: o.dateStr,
      action: {
        scheduledItemId: o.id,
        categoryId: o.categoryId,
        name: o.name,
        amount: o.amount,
        dueDay: o.dueDay,
      },
    });
  }

  // Liquidity alert
  if (currentCash < totalPendingCommitments && nextIncome) {
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
      message: `Apartando tus compromisos fijos (${formatCOP(totalPendingCommitments)}), tu margen seguro es de ${formatCOP(safeDailySpend)}/día${nextIncome ? ` hasta el ${nextIncome.dateStr}` : ' este mes'}.`,
      date: today.dateStr,
    });
  }

  // Imminent commitments (due in <= 3 days)
  for (const c of pendingExpensesList) {
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
  if (nextIncome && nextIncome.daysRemaining <= 3 && nextIncome.amount > 0) {
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
    nextExpense,
    upcomingCommitments,
    overdueCommitments,
    totalPendingCommitments,
    totalPendingFixedExpensesMonth,
    projectedNetBalance,
    freeCashForPeriod,
    currentCash,
    safeDailySpend,
    rawDailySpend,
    daysRemaining,
    alerts,
  };
}
