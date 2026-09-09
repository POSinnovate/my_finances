'use client';

import React, { useState } from 'react';
import { Edit3, Check, X, Trash2, TrendingUp, Calendar, DollarSign, Award } from 'lucide-react';
import { formatCOP } from '@/lib/utils';
import { toast } from 'sonner';

export interface IncomeCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  monthly_budget?: number;
  earned_this_month?: number;
  earned_this_year?: number;
  type?: 'INCOME';
}

interface IncomeSourceCardProps {
  category: IncomeCategory;
  totalMonthlyIncome: number;
  isTopSource?: boolean;
  onUpdated: () => void;
}

export function IncomeSourceCard({
  category,
  totalMonthlyIncome,
  isTopSource = false,
  onUpdated,
}: IncomeSourceCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [isSaving, setIsSaving] = useState(false);

  const earnedMonth = Number(category.earned_this_month) || 0;
  const earnedYear = Number(category.earned_this_year) || 0;

  const percentOfMonth = totalMonthlyIncome > 0 
    ? Math.round((earnedMonth / totalMonthlyIncome) * 100) 
    : 0;

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('El nombre no puede estar vacío');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: category.id, name: name.trim() }),
      });
      if (res.ok) {
        toast.success('Fuente de ingreso actualizada');
        setIsEditing(false);
        onUpdated();
      } else {
        toast.error('Error al actualizar');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar la fuente "${category.name}"? Los ingresos ya registrados se conservarán.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/categories?id=${category.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Fuente eliminada');
        onUpdated();
      } else {
        toast.error('Error al eliminar');
      }
    } catch {
      toast.error('Error de conexión');
    }
  };

  return (
    <div className={`bg-[#102A43] border rounded-2xl p-4 transition-all shadow-md relative overflow-hidden ${
      isTopSource ? 'border-emerald-500/50 ring-1 ring-emerald-500/30' : 'border-[#243B55] hover:border-[#1E3A5F]'
    }`}>
      {/* Top Banner Tag for Top Source */}
      {isTopSource && (
        <div className="absolute top-0 right-0 bg-gradient-to-l from-emerald-500 to-teal-500 text-slate-950 font-black text-[9px] uppercase tracking-wider px-2.5 py-0.5 rounded-bl-xl flex items-center gap-1 shadow-sm">
          <Award className="w-3 h-3" />
          <span>Fuente Principal</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
            style={{ backgroundColor: category.color || '#10B981' }}
          />
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white leading-snug truncate">{category.name}</h4>
            <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider whitespace-nowrap">
              Entrada de Dinero
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => {
              setName(category.name);
              setIsEditing(!isEditing);
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-[#00ADB5] hover:bg-[#152E4D] transition-colors shrink-0"
            title="Editar nombre"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Edit Form */}
      {isEditing && (
        <div className="mt-3 p-2.5 bg-[#0B192C] border border-[#00ADB5]/40 rounded-xl space-y-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-[#152E4D] border border-[#243B55] text-white text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-[#00ADB5]"
            placeholder="Nombre de la fuente"
            autoFocus
          />
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handleDelete}
              className="text-[11px] text-rose-400 hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Eliminar</span>
            </button>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsEditing(false)}
                className="px-2 py-1 text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-3 py-1 bg-[#00ADB5] text-[#0B192C] font-bold text-xs rounded-lg flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Guardar</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
