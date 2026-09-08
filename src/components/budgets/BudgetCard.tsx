'use client';

import React, { useState } from 'react';
import { Check, Edit3, X, AlertCircle } from 'lucide-react';
import { formatCOP } from '@/lib/utils';
import { toast } from 'sonner';

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
  onBudgetUpdated: () => void;
}

export function BudgetCard({ category, onBudgetUpdated }: BudgetCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newBudget, setNewBudget] = useState(category.monthly_budget.toString());
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const num = Number(newBudget);
    if (isNaN(num) || num < 0) {
      toast.error('Ingresa un monto válido');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: category.id, monthly_budget: num }),
      });
      if (res.ok) {
        toast.success(`Presupuesto de ${category.name} actualizado`);
        setIsEditing(false);
        onBudgetUpdated();
      } else {
        toast.error('Error guardando presupuesto');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setIsSaving(false);
    }
  };

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
    <div className="bg-[#102A43] border border-[#243B55] hover:border-[#1E3A5F] rounded-2xl p-4 transition-all shadow-md">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
            style={{ backgroundColor: category.color || '#00ADB5' }}
          />
          <div>
            <h4 className="text-sm font-bold text-white leading-snug">{category.name}</h4>
            {category.is_fixed === 1 && (
              <span className="text-[10px] text-cyan-400 font-semibold uppercase tracking-wider">Gasto Fijo</span>
            )}
          </div>
        </div>

        {/* Status Traffic Light Badge */}
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>
            {category.percentage_used}%
          </span>
          <button
            onClick={() => {
              setNewBudget(category.monthly_budget.toString());
              setIsEditing(!isEditing);
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-[#00ADB5] hover:bg-[#152E4D] transition-colors"
            title="Ajustar presupuesto mensual"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Edit Form */}
      {isEditing && (
        <div className="mt-3 p-2.5 bg-[#0B192C] border border-[#00ADB5]/40 rounded-xl flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">Presupuesto:</span>
          <input
            type="number"
            value={newBudget}
            onChange={(e) => setNewBudget(e.target.value)}
            className="flex-1 bg-[#152E4D] border border-[#243B55] text-white text-xs px-2 py-1 rounded focus:outline-none"
            placeholder="Monto estimado"
            autoFocus
          />
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="p-1 bg-[#00ADB5] text-[#0B192C] rounded hover:opacity-90"
            title="Guardar"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="p-1 text-slate-400 hover:text-white"
            title="Cancelar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Progress Bar */}
      <div className="mt-3.5">
        <div className="w-full h-2 bg-[#0B192C] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressBarColor}`}
            style={{ width: `${progressWidth}%` }}
          />
        </div>
      </div>

      {/* Figures Row */}
      <div className="flex items-center justify-between text-xs mt-2.5 pt-2 border-t border-[#1E3A5F]">
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
