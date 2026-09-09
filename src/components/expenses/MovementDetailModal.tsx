'use client';

import React from 'react';
import { X, Trash2, ArrowDownCircle, ArrowUpCircle, Calendar, CreditCard, Tag, FileText } from 'lucide-react';
import { formatCOP } from '@/lib/utils';
import { formatMovementDetailDate } from '@/lib/dayjs';
import { toast } from 'sonner';

export interface Movement {
  id: string;
  type?: 'EXPENSE' | 'INCOME';
  amount: number;
  payment_method: string;
  notes: string | null;
  date: string;
  created_at?: string;
  category_name?: string;
  category_color?: string;
  is_fixed?: number;
}

interface MovementDetailModalProps {
  movement: Movement | null;
  isOpen: boolean;
  onClose: () => void;
  onMovementDeleted: () => void;
}

export function MovementDetailModal({
  movement,
  isOpen,
  onClose,
  onMovementDeleted,
}: MovementDetailModalProps) {
  if (!isOpen || !movement) return null;

  const isIncome = movement.type === 'INCOME';
  const dateInfo = formatMovementDetailDate(movement.date);

  const handleDelete = async () => {
    if (!confirm('¿Deseas eliminar este movimiento? Tu fondo disponible se actualizará automáticamente.')) {
      return;
    }

    try {
      const res = await fetch(`/api/expenses/${movement.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(isIncome ? 'Ingreso eliminado y fondo ajustado' : 'Gasto eliminado y fondo restaurado');
        onMovementDeleted();
        onClose();
      } else {
        toast.error('Error al eliminar el movimiento');
      }
    } catch {
      toast.error('Error de conexión');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#0B192C] border border-[#1E3A5F] rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        {/* Glow Header Accent */}
        <div
          className={`absolute top-0 left-0 right-0 h-1.5 ${
            isIncome ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-rose-500 to-red-600'
          }`}
        />

        {/* Top Close Row */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1E3A5F]">
          <div className="flex items-center gap-2">
            {isIncome ? (
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider whitespace-nowrap">
                <ArrowUpCircle className="w-4 h-4 shrink-0" />
                Ingreso Registrado
              </span>
            ) : (
              <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider whitespace-nowrap">
                <ArrowDownCircle className="w-4 h-4 shrink-0" />
                Egreso / Gasto
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Big Amount Card */}
        <div className="text-center py-5">
          <span className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider whitespace-nowrap">Impacto en Fondo</span>
          <p
            className={`text-3xl sm:text-4xl font-black mt-1 whitespace-nowrap ${
              isIncome ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isIncome ? `+${formatCOP(movement.amount)}` : `-${formatCOP(movement.amount)}`}
          </p>
          <span className="inline-block mt-2 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#102A43] border border-[#243B55] text-slate-300 whitespace-nowrap">
            {isIncome ? 'Añadido a tu dinero disponible' : 'Descontado de tu dinero disponible'}
          </span>
        </div>

        {/* Detail Attributes List */}
        <div className="bg-[#102A43] border border-[#243B55] rounded-2xl p-4 space-y-3">
          {/* Category / Source */}
          <div className="flex items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2 text-slate-400 whitespace-nowrap shrink-0">
              <Tag className="w-4 h-4 text-[#00ADB5]" />
              <span>{isIncome ? 'Fuente de Ingreso:' : 'Grupo de Gasto:'}</span>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: movement.category_color || (isIncome ? '#10B981' : '#00ADB5') }}
              />
              <span className="font-bold text-white truncate">
                {movement.category_name || (isIncome ? 'Ingreso General' : 'Gasto General')}
              </span>
              {movement.is_fixed === 1 && (
                <span className="text-[9px] font-bold text-cyan-400 uppercase px-1.5 py-0.2 rounded bg-cyan-950/60 border border-cyan-800/40 whitespace-nowrap shrink-0">
                  Fijo
                </span>
              )}
            </div>
          </div>

          {/* Payment Method */}
          <div className="flex items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2 text-slate-400 whitespace-nowrap shrink-0">
              <CreditCard className="w-4 h-4 text-[#00ADB5]" />
              <span>Medio / Cuenta:</span>
            </div>
            <span className="font-bold text-white px-2 py-0.5 rounded-lg bg-[#0B192C] border border-[#243B55] whitespace-nowrap shrink-0">
              {movement.payment_method || 'Nequi'}
            </span>
          </div>

          {/* Date Formatted with dayjs */}
          <div className="flex items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2 text-slate-400 whitespace-nowrap shrink-0">
              <Calendar className="w-4 h-4 text-[#00ADB5]" />
              <span>Fecha del Movimiento:</span>
            </div>
            <div className="text-right">
              <span className="font-bold text-white block whitespace-nowrap">{dateInfo.dayName}, {dateInfo.formattedDate}</span>
              {movement.created_at && (
                <span className="text-[10px] text-slate-400 font-mono block whitespace-nowrap">
                  Hora: {formatMovementDetailDate(movement.created_at).timeFormatted}
                </span>
              )}
            </div>
          </div>

          {/* Notes / Concept */}
          <div className="pt-2 border-t border-[#1E3A5F]">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1 whitespace-nowrap">
              <FileText className="w-3.5 h-3.5 text-[#00ADB5]" />
              <span>Concepto / Descripción:</span>
            </div>
            <p className="text-xs font-semibold text-slate-200 bg-[#0B192C] border border-[#243B55] p-2.5 rounded-xl break-words">
              {movement.notes || 'Sin descripción adicional'}
            </p>
          </div>
        </div>

        {/* Delete Action Footer */}
        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-[#102A43] hover:bg-[#152E4D] border border-[#243B55] text-xs font-bold text-slate-300 transition-colors"
          >
            Cerrar Detalle
          </button>
          <button
            onClick={handleDelete}
            className="py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-bold text-rose-400 flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Eliminar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
