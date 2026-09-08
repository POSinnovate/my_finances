'use client';

import React from 'react';
import { TrendingUp, ArrowDownRight, HeartHandshake, Scale } from 'lucide-react';
import { formatCOP } from '@/lib/utils';

interface SummaryData {
  total_income: number;
  income_count: number;
  total_spent: number;
  fixed_spent: number;
  variable_spent: number;
  fixed_budget: number;
  expense_count: number;
  net_difference: number;
  current_cash: number;
}

interface FinancialOverviewCardProps {
  summary: SummaryData;
}

export function FinancialOverviewCard({ summary }: FinancialOverviewCardProps) {
  const isPositive = summary.net_difference >= 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
      {/* 1. Real Monthly Income */}
      <div className="bg-[#102A43] border border-[#243B55] rounded-2xl p-3 sm:p-3.5 shadow-lg">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400">Ingresos del Mes</span>
          <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
        </div>
        <p className="text-sm sm:text-lg font-black text-emerald-400 truncate">
          +{formatCOP(summary.total_income)}
        </p>
        <span className="text-[9px] sm:text-[10px] text-slate-400 block mt-0.5">
          {summary.income_count} ingresos reg.
        </span>
      </div>

      {/* 2. Total Expenses This Month */}
      <div className="bg-[#102A43] border border-[#243B55] rounded-2xl p-3 sm:p-3.5 shadow-lg">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400">Egresos del Mes</span>
          <ArrowDownRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" />
        </div>
        <p className="text-sm sm:text-lg font-black text-rose-400 truncate">
          -{formatCOP(summary.total_spent)}
        </p>
        <span className="text-[9px] sm:text-[10px] text-slate-400 block mt-0.5">
          {summary.expense_count} gastos reg.
        </span>
      </div>

      {/* 3. Fixed Expenses Committed / Paid */}
      <div className="bg-[#102A43] border border-[#243B55] rounded-2xl p-3 sm:p-3.5 shadow-lg">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400">Gastos Fijos</span>
          <HeartHandshake className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#06B6D4]" />
        </div>
        <p className="text-sm sm:text-lg font-black text-[#06B6D4] truncate">
          {formatCOP(summary.fixed_spent)}
        </p>
        <span className="text-[9px] sm:text-[10px] text-slate-400 block mt-0.5">
          de {formatCOP(summary.fixed_budget)} fijos
        </span>
      </div>

      {/* 4. Net Difference (Savings / Deficit) */}
      <div className="bg-[#102A43] border border-[#243B55] rounded-2xl p-3 sm:p-3.5 shadow-lg">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400">Diferencia Neta</span>
          <Scale className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isPositive ? 'text-[#00ADB5]' : 'text-rose-400'}`} />
        </div>
        <p className={`text-sm sm:text-lg font-black truncate ${isPositive ? 'text-[#00ADB5]' : 'text-rose-400'}`}>
          {isPositive ? `+${formatCOP(summary.net_difference)}` : formatCOP(summary.net_difference)}
        </p>
        <span className="text-[9px] sm:text-[10px] text-slate-400 block mt-0.5">
          {isPositive ? 'Ahorro del mes' : 'Déficit del mes'}
        </span>
      </div>
    </div>
  );
}
