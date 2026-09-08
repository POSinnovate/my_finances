'use client';

import React from 'react';
import { TrendingUp, ArrowDownRight, HeartHandshake, Sparkles } from 'lucide-react';
import { formatCOP } from '@/lib/utils';

interface SummaryData {
  monthly_income: number;
  current_cash: number;
  total_spent: number;
  fixed_spent: number;
  variable_spent: number;
  expense_count: number;
  free_cash_flow: number;
}

interface FinancialOverviewCardProps {
  summary: SummaryData;
}

export function FinancialOverviewCard({ summary }: FinancialOverviewCardProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Monthly Income */}
      <div className="bg-[#102A43] border border-[#243B55] rounded-2xl p-3.5 shadow-lg">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-slate-400">Ingreso Mensual</span>
          <TrendingUp className="w-4 h-4 text-emerald-400" />
        </div>
        <p className="text-base sm:text-lg font-black text-white">{formatCOP(summary.monthly_income)}</p>
        <span className="text-[10px] text-emerald-400/90 font-medium">Base mensual</span>
      </div>

      {/* Spent This Month */}
      <div className="bg-[#102A43] border border-[#243B55] rounded-2xl p-3.5 shadow-lg">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-slate-400">Gastado Este Mes</span>
          <ArrowDownRight className="w-4 h-4 text-rose-400" />
        </div>
        <p className="text-base sm:text-lg font-black text-white">{formatCOP(summary.total_spent)}</p>
        <span className="text-[10px] text-slate-400 font-medium">{summary.expense_count} registros</span>
      </div>

      {/* Fixed Parents Support */}
      <div className="bg-[#102A43] border border-[#243B55] rounded-2xl p-3.5 shadow-lg">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-slate-400">Apoyo a Papás</span>
          <HeartHandshake className="w-4 h-4 text-[#06B6D4]" />
        </div>
        <p className="text-base sm:text-lg font-black text-[#06B6D4]">{formatCOP(summary.fixed_spent)}</p>
        <span className="text-[10px] text-slate-400 font-medium">Compromiso fijo</span>
      </div>

      {/* Free Cash / Margin */}
      <div className="bg-[#102A43] border border-[#243B55] rounded-2xl p-3.5 shadow-lg">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-slate-400">Margen Disponible</span>
          <Sparkles className="w-4 h-4 text-[#00ADB5]" />
        </div>
        <p className="text-base sm:text-lg font-black text-[#00ADB5]">{formatCOP(summary.free_cash_flow)}</p>
        <span className="text-[10px] text-slate-400 font-medium">Ingresos - Gastos</span>
      </div>
    </div>
  );
}
