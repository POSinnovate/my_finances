'use client';

import React from 'react';
import { Edit3, AlertCircle, Trash2, Layers } from 'lucide-react';
import { formatCOP } from '@/lib/utils';

export interface CategoryWithBudget {
  id: string;
  name: string;
  icon: string;
  color: string;
  monthly_budget: number;
  is_fixed: number;
  spent_this_month: number;
  remaining_budget: number;
  percentage_used: number;
  status: 'GREEN' | 'YELLOW' | 'RED';
}

interface BudgetCardProps {
  category: CategoryWithBudget;
  onEdit: (category: CategoryWithBudget) => void;
  onDelete: (id: string, name: string) => void;
}

export function BudgetCard({ category, onEdit, onDelete }: BudgetCardProps) {
  const isExceeded = category.spent_this_month > category.monthly_budget && category.monthly_budget > 0;
  const progressWidth = Math.min(100, category.percentage_used);

  const statusColor = category.status === 'RED'
    ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
    : category.status === 'YELLOW'
    ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
    : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';

  const progressBarColor = category.status === 'RED'
    ? 'bg-gradient-to-r from-rose-500 to-red-600'
    : category.status === 'YELLOW'
    ? 'bg-gradient-to-r from-amber-500 to-yellow-500'
    : 'bg-gradient-to-r from-[#00ADB5] to-[#06B6D4]';

  return (
    <div className="bg-[#102A43] border border-[#243B55] hover:border-[#1E3A5F] rounded-2xl p-4 transition-all shadow-md space-y-3">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
            style={{ backgroundColor: category.color || '#00ADB5' }}
          >
            <Layers className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-black text-white leading-snug truncate">{category.name}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-slate-400 uppercase font-semibold whitespace-nowrap">
                {category.is_fixed === 1 ? 'Gasto Fijo' : 'Gasto Variable'}
              </span>
              {category.is_fixed === 1 && (
                <span className="text-[9px] font-bold text-cyan-400 px-1 py-0.2 rounded bg-cyan-950/60 border border-cyan-800/40 whitespace-nowrap">
                  Fijo
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons: Status Badge + Edit + Delete */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${statusColor}`}>
            {category.percentage_used}%
          </span>
          <button
            onClick={() => onEdit(category)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all shrink-0"
            title="Editar grupo de gasto"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(category.id, category.name)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all shrink-0"
            title="Eliminar grupo de gasto"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="pt-1">
        <div className="w-full h-2 bg-[#0B192C] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressBarColor}`}
            style={{ width: `${progressWidth}%` }}
          />
        </div>
      </div>

      {/* Figures Row */}
      <div className="flex items-center justify-between text-xs pt-2 border-t border-[#1E3A5F]">
        <div>
          <span className="block text-[10px] text-slate-400">Gastado</span>
          <span className="font-extrabold text-white">{formatCOP(category.spent_this_month)}</span>
        </div>
        <div className="text-right">
          <span className="block text-[10px] text-slate-400">
            {isExceeded ? 'Excedido por' : 'Presupuesto'}
          </span>
          <span className={`font-extrabold ${isExceeded ? 'text-rose-400' : 'text-slate-300'}`}>
            {isExceeded
              ? formatCOP(category.spent_this_month - category.monthly_budget)
              : formatCOP(category.monthly_budget)}
          </span>
        </div>
      </div>

      {isExceeded && (
        <div className="mt-2 text-[11px] text-rose-300 bg-rose-950/40 border border-rose-800/40 rounded-lg p-1.5 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
          <span>¡Límite superado! Detén gastos aquí.</span>
        </div>
      )}
    </div>
  );
}
