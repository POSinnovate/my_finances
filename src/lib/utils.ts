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

export function formatNumberInput(value: string | number): string {
  if (value === '' || value === null || value === undefined) return '';
  const numStr = value.toString().replace(/\D/g, '');
  if (!numStr) return '';
  return new Intl.NumberFormat('es-CO').format(Number(numStr));
}

export function parseCurrencyInput(value: string): number {
  if (!value) return 0;
  const clean = value.replace(/\D/g, '');
  return Number(clean) || 0;
}

export function formatDateSpanish(dateString: string | null | undefined, includeTime = false): string {
  if (!dateString) return 'Sin fecha';
  
  try {
    // Check if format is YYYY-MM-DD
    const parts = dateString.toString().split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const day = parseInt(parts[2]);
      
      const targetDate = new Date(year, month, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const targetTime = targetDate.getTime();
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

      if (targetTime === today.getTime()) {
        return 'Hoy';
      } else if (targetTime === yesterday.getTime()) {
        return 'Ayer';
      } else if (targetTime === tomorrow.getTime()) {
        return 'Mañana';
      } else {
        return `${day} ${months[month]} ${year !== today.getFullYear() ? year : ''}`.trim();
      }
    }

    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString.toString();
    return d.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  } catch {
    return dateString.toString();
  }
}

export function getDaysRemainingUntilPayday(paydayDay = 30): { days: number; label: string } {
  const now = new Date();
  const currentDay = now.getDate();
  const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  // Multi-schedule quincena support: 15 and end of month (30/31)
  if (currentDay < 15) {
    const days = 15 - currentDay;
    return { days, label: `Quincena (Día 15)` };
  } else if (currentDay === 15) {
    return { days: 1, label: `¡Hoy es Quincena!` };
  } else {
    const targetDay = Math.min(paydayDay, daysInCurrentMonth);
    if (currentDay < targetDay) {
      return { days: targetDay - currentDay, label: `Fin de Mes (Día ${targetDay})` };
    } else if (currentDay === targetDay) {
      return { days: 1, label: `¡Hoy es Día de Pago!` };
    } else {
      const daysLeftThisMonth = daysInCurrentMonth - currentDay;
      const days = daysLeftThisMonth + 15;
      return { days, label: `Próxima Quincena (Día 15)` };
    }
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
  const paydayInfo = getDaysRemainingUntilPayday(paydayDay);
  const daysRemaining = Math.max(1, paydayInfo.days);

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
    message = `¡Alerta crítica! Con tu fondo actual de ${formatCOP(currentCash)}, solo te quedan ${daysOfCashRemaining} días de dinero para tu próximo ingreso (${paydayInfo.label}, faltan ${daysRemaining} días).`;
  } else if (safeDailySpend < 25000) {
    statusLevel = 'WARNING';
    message = `Cuidado: Tu gasto diario seguro es ajustado (${formatCOP(safeDailySpend)}/día hasta el ${paydayInfo.label}). Evita compras impulsivas.`;
  }

  return {
    safeDailySpend,
    dailyBurnAverage,
    daysRemaining,
    daysOfCashRemaining,
    paydayLabel: paydayInfo.label,
    statusLevel,
    message,
  };
}
