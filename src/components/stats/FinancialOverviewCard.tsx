'use client';

import React from 'react';
import { TrendingUp, ArrowDownRight, Scale, Flame, Calendar, Wallet, CheckCircle2 } from 'lucide-react';
import { formatCOP } from '@/lib/utils';

interface SummaryData {
  total_income: number;
  dynamic_monthly_income?: number;
  income_count: number;
  total_spent: number;
  fixed_spent: number;
  variable_spent: number;
  fixed_budget: number;
  expense_count: number;
  net_difference: number;
  current_cash: number;
}

interface HealthData {
  safeDailySpend: number;
  daysRemaining: number;
  statusLevel: 'CRITICAL' | 'WARNING' | 'HEALTHY';
  paydayLabel?: string;
  totalPendingCommitments?: number;
  freeCashForPeriod?: number;
}

interface CashFlowData {
  nextIncome?: {
    name: string;
    amount: number;
    dateStr: string;
    daysRemaining: number;
    label: string;
  };
  totalPendingCommitments?: number;
  freeCashForPeriod?: number;
}

interface FinancialOverviewCardProps {
  summary: SummaryData;
  health?: HealthData;
  cashFlow?: CashFlowData;
}

export function FinancialOverviewCard({ summary, health, cashFlow }: FinancialOverviewCardProps) {
  const isPositive = summary.net_difference >= 0;
  const safeDaily = health?.safeDailySpend ?? 0;
  const daysRemaining = cashFlow?.nextIncome?.daysRemaining ?? health?.daysRemaining ?? 1;
  const pendingCommitments = cashFlow?.totalPendingCommitments ?? health?.totalPendingCommitments ?? 0;
  const freeCash = cashFlow?.freeCashForPeriod ?? Math.max(0, summary.current_cash - pendingCommitments);
  const nextIncome = cashFlow?.nextIncome;
  const monthlySalaryEst = summary.dynamic_monthly_income || summary.total_income;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
      {/* 1. Dinero que puedo gastar al día */}
      <div className="bg-[#102A43] border border-[#00ADB5]/40 hover:border-[#00ADB5] rounded-2xl p-3 sm:p-3.5 shadow-lg transition-all relative overflow-hidden">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-300">Gasto Diario Seguro</span>
          <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00ADB5]" />
        </div>
        <p className="text-sm sm:text-base font-black text-white truncate">
          {formatCOP(safeDaily)}
        </p>
        <span className="text-[9px] sm:text-[10px] text-[#00ADB5] block mt-0.5 font-medium truncate">
          Límite máximo / día
        </span>
      </div>

      {/* 2. Dinero que queda (Cálculo de fechas) */}
      <div className="bg-[#102A43] border border-[#243B55] hover:border-cyan-500/40 rounded-2xl p-3 sm:p-3.5 shadow-lg transition-all">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-300">Fondo Libre Real</span>
          <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
        </div>
        <p className="text-sm sm:text-base font-black text-cyan-300 truncate">
          {formatCOP(freeCash)}
        </p>
        <span className="text-[9px] sm:text-[10px] text-slate-400 block mt-0.5 truncate" title={`Fondo ${formatCOP(summary.current_cash)} - Fijos ${formatCOP(pendingCommitments)}`}>
          {pendingCommitments > 0 ? `-${formatCOP(pendingCommitments)} fijos` : 'Sin pagos fijos pend.'}
        </span>
      </div>

      {/* 3. Días faltantes para el próximo ingreso */}
      <div className="bg-[#102A43] border border-[#243B55] hover:border-[#06B6D4]/40 rounded-2xl p-3 sm:p-3.5 shadow-lg transition-all">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-300">Próximo Ingreso</span>
          <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#06B6D4]" />
        </div>
        <p className="text-sm sm:text-base font-black text-white truncate">
          {daysRemaining === 1 ? '¡Mañana / Hoy!' : `En ${daysRemaining} días`}
        </p>
        <span className="text-[9px] sm:text-[10px] text-slate-400 block mt-0.5 truncate">
          {nextIncome?.name || health?.paydayLabel || 'Fin de mes'}
        </span>
      </div>

      {/* 4. Ingreso del mes (Real y Proyectado) */}
      <div className="bg-[#102A43] border border-[#243B55] hover:border-emerald-500/40 rounded-2xl p-3 sm:p-3.5 shadow-lg transition-all">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-300">Ingreso Mensual</span>
          <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
        </div>
        <p className="text-sm sm:text-base font-black text-emerald-400 truncate">
          +{formatCOP(summary.total_income > 0 ? summary.total_income : monthlySalaryEst)}
        </p>
        <span className="text-[9px] sm:text-[10px] text-slate-400 block mt-0.5 truncate">
          {summary.total_income > 0 ? `${summary.income_count} cobros este mes` : `Est. ${formatCOP(monthlySalaryEst)}`}
        </span>
      </div>

      {/* 5. Egreso del mes */}
      <div className="bg-[#102A43] border border-[#243B55] hover:border-rose-500/40 rounded-2xl p-3 sm:p-3.5 shadow-lg transition-all">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-300">Egresos del Mes</span>
          <ArrowDownRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" />
        </div>
        <p className="text-sm sm:text-base font-black text-rose-400 truncate">
          -{formatCOP(summary.total_spent)}
        </p>
        <span className="text-[9px] sm:text-[10px] text-slate-400 block mt-0.5 truncate">
          {summary.expense_count} gastos registrados
        </span>
      </div>

      {/* 6. Balance Neto / Ahorro */}
      <div className="bg-[#102A43] border border-[#243B55] hover:border-slate-400/40 rounded-2xl p-3 sm:p-3.5 shadow-lg transition-all">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-300">Balance Neto</span>
          <Scale className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isPositive ? 'text-[#00ADB5]' : 'text-rose-400'}`} />
        </div>
        <p className={`text-sm sm:text-base font-black truncate ${isPositive ? 'text-[#00ADB5]' : 'text-rose-400'}`}>
          {isPositive ? `+${formatCOP(summary.net_difference)}` : formatCOP(summary.net_difference)}
        </p>
        <span className="text-[9px] sm:text-[10px] text-slate-400 block mt-0.5 truncate">
          {isPositive ? 'Ahorro a favor' : 'Déficit en el mes'}
        </span>
      </div>
    </div>
  );
}
