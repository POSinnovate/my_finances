import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCOP(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '$ 0';
  }
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getDaysRemainingUntilPayday(paydayDay = 30): number {
  const now = new Date();
  const currentDay = now.getDate();
  const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  // If payday is set to 30 or last day of month
  const targetDay = Math.min(paydayDay, daysInCurrentMonth);

  if (currentDay < targetDay) {
    return targetDay - currentDay;
  } else if (currentDay === targetDay) {
    return 1; // Payday is today
  } else {
    // Already past payday this month, calculate days to next month's payday
    const daysLeftThisMonth = daysInCurrentMonth - currentDay;
    return daysLeftThisMonth + targetDay;
  }
}

export function calculateFinancialHealth({
  monthlyIncome,
  currentCash,
  totalSpentThisMonth,
  paydayDay = 30,
}: {
  monthlyIncome: number;
  currentCash: number;
  totalSpentThisMonth: number;
  paydayDay?: number;
}) {
  const now = new Date();
  const currentDay = Math.max(1, now.getDate());
  const daysRemaining = Math.max(1, getDaysRemainingUntilPayday(paydayDay));

  // Safe daily spend based on real cash available in hand / bank
  const safeDailySpend = Math.max(0, Math.floor(currentCash / daysRemaining));

  // Current burn rate per day
  const dailyBurnAverage = Math.round(totalSpentThisMonth / currentDay);

  // Projected days until cash reaches 0 at current pace
  const daysOfCashRemaining = dailyBurnAverage > 0 
    ? Math.floor(currentCash / dailyBurnAverage) 
    : 999;

  // Status diagnosis
  let statusLevel: 'CRITICAL' | 'WARNING' | 'HEALTHY' = 'HEALTHY';
  let message = 'Tus finanzas están bajo control.';

  if (currentCash < 150000 || daysOfCashRemaining < daysRemaining) {
    statusLevel = 'CRITICAL';
    message = `¡Alerta crítica! Con tu saldo actual de ${formatCOP(currentCash)}, a tu ritmo diario solo te quedan ${daysOfCashRemaining} días de dinero, pero faltan ${daysRemaining} días para tu pago.`;
  } else if (safeDailySpend < 25000) {
    statusLevel = 'WARNING';
    message = `Cuidado: Tu gasto diario seguro es ajustado (${formatCOP(safeDailySpend)}/día). Evita cualquier compra impulsiva.`;
  }

  return {
    safeDailySpend,
    dailyBurnAverage,
    daysRemaining,
    daysOfCashRemaining,
    statusLevel,
    message,
  };
}
