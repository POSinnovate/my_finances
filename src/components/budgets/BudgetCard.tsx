'use client';

import React, { useState } from 'react';
import { Check, Edit3, X, AlertCircle, Trash2 } from 'lucide-react';
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
  const [newName, setNewName] = useState(category.name);
  const [newBudget, setNewBudget] = useState(category.monthly_budget.toString());
  const [newIsFixed, setNewIsFixed] = useState(category.is_fixed === 1);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!newName.trim()) {
      toast.error('El nombre del grupo es obligatorio');
      return;
    }
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
        body: JSON.stringify({ 
          id: category.id, 
          name: newName.trim(),
          monthly_budget: num,
          is_fixed: newIsFixed
        }),
      });
      if (res.ok) {
        toast.success(`Grupo "${newName.trim()}" actualizado`);
        setIsEditing(false);
        onBudgetUpdated();
      } else {
        toast.error('Error guardando grupo');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!confirm(`¿Eliminar el grupo "${category.name}"? Los movimientos registrados no se borrarán.`)) return;
    try {
      const res = await fetch(`/api/categories?id=${category.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(`Grupo "${category.name}" eliminado`);
        onBudgetUpdated();
      } else {
        toast.error('Error al eliminar');
      }
    } catch {
      toast.error('Error de conexión');
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
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
            style={{ backgroundColor: category.color || '#00ADB5' }}
          />
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white leading-snug truncate">{category.name}</h4>
            {category.is_fixed === 1 && (
              <span className="text-[10px] text-cyan-400 font-semibold uppercase tracking-wider whitespace-nowrap">Gasto Fijo</span>
            )}
          </div>
        </div>

        {/* Status Traffic Light Badge */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${statusColor}`}>
            {category.percentage_used}%
          </span>
          <button
            onClick={() => {
              setNewName(category.name);
              setNewBudget(category.monthly_budget.toString());
              setIsEditing(!isEditing);
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-[#00ADB5] hover:bg-[#152E4D] transition-colors shrink-0"
            title="Editar grupo de gasto"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Edit Form */}
      {isEditing && (
        <div className="mt-3 p-3 bg-[#0B192C] border border-[#00ADB5]/40 rounded-xl space-y-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Nombre del Grupo:</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-[#152E4D] border border-[#243B55] text-white text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-[#00ADB5]"
              placeholder="Ej: Alimentación, Arriendo"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Presupuesto Mensual Estimado ($ COP):</label>
            <input
              type="number"
              value={newBudget}
              onChange={(e) => setNewBudget(e.target.value)}
              className="w-full bg-[#152E4D] border border-[#243B55] text-white text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-[#00ADB5]"
              placeholder="Monto estimado"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
            <input
              type="checkbox"
              checked={newIsFixed}
              onChange={(e) => setNewIsFixed(e.target.checked)}
              className="rounded border-[#243B55] text-[#00ADB5] focus:ring-0"
            />
            <span>¿Es un gasto fijo mensual obligatorio?</span>
          </label>

          <div className="flex items-center justify-between pt-1 border-t border-[#1E3A5F]">
            <button
              onClick={handleDeleteCategory}
              className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 hover:underline"
              type="button"
            >
              <Trash2 className="w-3 h-3" />
              <span>Eliminar grupo</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-2 py-1 text-xs text-slate-400 hover:text-white"
                type="button"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-3 py-1 bg-[#00ADB5] text-[#0B192C] font-bold text-xs rounded-lg hover:opacity-90 flex items-center gap-1"
                type="button"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Guardar</span>
              </button>
            </div>
          </div>
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
