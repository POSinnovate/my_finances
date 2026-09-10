'use client';

import React from 'react';
import { Edit3, Trash2, TrendingUp, Calendar, Award, Briefcase } from 'lucide-react';
import { formatCOP } from '@/lib/utils';

export interface IncomeCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  monthly_budget?: number;
  earned_this_month?: number;
  earned_this_year?: number;
  due_day?: number | null;
  specific_date?: string | null;
  frequency?: string | null;
  type?: 'INCOME';
}

interface IncomeSourceCardProps {
  category: IncomeCategory;
  totalMonthlyIncome: number;
  isTopSource?: boolean;
  onEdit: (category: IncomeCategory) => void;
  onDelete: (id: string, name: string) => void;
}

export function IncomeSourceCard({
  category,
  totalMonthlyIncome,
  isTopSource = false,
  onEdit,
  onDelete,
}: IncomeSourceCardProps) {
  const earnedMonth = Number(category.earned_this_month) || 0;
  const earnedYear = Number(category.earned_this_year) || 0;

  const percentOfMonth = totalMonthlyIncome > 0 
    ? Math.round((earnedMonth / totalMonthlyIncome) * 100) 
    : 0;

  return (
    <div className={`bg-[#102A43] border rounded-2xl p-4 transition-all shadow-md relative overflow-hidden space-y-3 ${
      isTopSource ? 'border-emerald-500/50 ring-1 ring-emerald-500/30' : 'border-[#243B55] hover:border-[#1E3A5F]'
    }`}>
      {/* Top Banner Tag for Top Source */}
      {isTopSource && (
        <div className="absolute top-0 right-0 bg-gradient-to-l from-emerald-500 to-teal-500 text-slate-950 font-black text-[9px] uppercase tracking-wider px-2.5 py-0.5 rounded-bl-xl flex items-center gap-1 shadow-sm z-10">
          <Award className="w-3 h-3" />
          <span>Fuente Principal</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
            style={{ backgroundColor: category.color || '#10B981' }}
          >
            <Briefcase className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-black text-white leading-snug truncate">{category.name}</h4>
            <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider whitespace-nowrap">
              Fuente de Ingreso
            </span>
            {category.frequency === 'MONTHLY' && category.due_day ? (
              <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-300 mt-1">
                <Calendar className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>Día {category.due_day} de cada mes</span>
              </div>
            ) : category.specific_date ? (
              <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-300 mt-1">
                <Calendar className="w-3 h-3 text-amber-400 shrink-0" />
                <span>Fecha: {category.specific_date.slice(0, 10)}</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Action Buttons: Edit + Delete */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEdit(category)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all shrink-0"
            title="Editar fuente de ingreso"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(category.id, category.name)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all shrink-0"
            title="Eliminar fuente"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Figures Row: Month & Year */}
      <div className="grid grid-cols-2 gap-2 mt-3.5 pt-2.5 border-t border-[#1E3A5F]">
        <div>
          <span className="block text-[10px] text-slate-400 font-medium flex items-center gap-1">
            <Calendar className="w-3 h-3 text-[#00ADB5]" />
            <span>Este Mes:</span>
          </span>
          <span className="text-sm font-black text-emerald-400 mt-0.5 block">
            +{formatCOP(earnedMonth)}
          </span>
        </div>
        <div className="text-right">
          <span className="block text-[10px] text-slate-400 font-medium flex items-center justify-end gap-1">
            <TrendingUp className="w-3 h-3 text-cyan-400" />
            <span>Acumulado Año:</span>
          </span>
          <span className="text-sm font-black text-white mt-0.5 block">
            +{formatCOP(earnedYear)}
          </span>
        </div>
      </div>

      {/* Share of total monthly income bar */}
      <div className="mt-3">
        <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-medium">
          <span>Participación mensual</span>
          <span className="text-emerald-400 font-bold">{percentOfMonth}% del total</span>
        </div>
        <div className="w-full h-1.5 bg-[#0B192C] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, percentOfMonth)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
