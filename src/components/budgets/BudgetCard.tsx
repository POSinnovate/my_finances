'use client';

import React from 'react';
import { Edit3, AlertCircle, Trash2, Layers, Calendar } from 'lucide-react';
import { formatCOP } from '@/lib/utils';
import { Badge, Button } from '@/components/ui';

export interface CategoryWithBudget {
  id: string;
  name: string;
  icon: string;
  color: string;
  monthly_budget: number;
  is_fixed: number;
  due_day?: number | null;
  specific_date?: string | null;
  frequency?: string | null;
  has_multiple_items?: number;
  items?: any[];
  spent_this_month: number;
  remaining_budget: number;
  percentage_used: number;
  status: 'GREEN' | 'YELLOW' | 'RED';
}

interface BudgetCardProps {
  category: CategoryWithBudget;
  onEdit: (category: CategoryWithBudget) => void;
  onDelete: (id: string, name: string) => void;
  onManageSchedule?: (category: CategoryWithBudget) => void;
}

export function BudgetCard({ category, onEdit, onDelete }: BudgetCardProps) {
  const isExceeded = category.spent_this_month > category.monthly_budget && category.monthly_budget > 0;
  const progressWidth = Math.min(100, category.percentage_used);

  const statusVariant = category.status === 'RED'
    ? 'danger'
    : category.status === 'YELLOW'
    ? 'warning'
    : 'success';

  const progressBarColor = category.status === 'RED'
    ? 'bg-linear-to-r from-rose-500 to-red-600'
    : category.status === 'YELLOW'
    ? 'bg-linear-to-r from-amber-500 to-yellow-500'
    : 'bg-linear-to-r from-primary to-accent';

  return (
    <div className="bg-surface-elevated border border-border hover:border-primary/40 rounded-2xl p-4 transition-all shadow-md space-y-3">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-background shrink-0 shadow-sm"
            style={{ backgroundColor: category.color || '#00ADB5' }}
          >
            <Layers className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-black text-foreground leading-snug truncate">{category.name}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-foreground/50 uppercase font-semibold whitespace-nowrap">
                {category.is_fixed === 1 ? 'Gasto Fijo' : 'Gasto Variable'}
              </span>
              {category.is_fixed === 1 && (
                <Badge variant="accent" size="sm">
                  Fijo
                </Badge>
              )}
            </div>
            {category.has_multiple_items === 1 && category.items && category.items.length > 0 ? (
              <div className="flex items-center gap-1 text-[10px] font-semibold text-accent mt-1">
                <Calendar className="w-3 h-3 text-accent shrink-0" />
                <span>{category.items.length} fechas: {category.items.map((it: any) => it.due_day ? `Día ${it.due_day}` : it.specific_date?.slice(5, 10)).join(', ')}</span>
              </div>
            ) : category.frequency === 'MONTHLY' && category.due_day ? (
              <div className="flex items-center gap-1 text-[10px] font-semibold text-accent mt-1">
                <Calendar className="w-3 h-3 text-accent shrink-0" />
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

        {/* Action Buttons: Status Badge + Edit + Delete */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant={statusVariant} size="sm">
            {category.percentage_used}%
          </Badge>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onEdit(category)}
            title="Editar grupo de gasto"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onDelete(category.id, category.name)}
            className="text-danger hover:text-danger hover:bg-danger/15"
            title="Eliminar grupo de gasto"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="pt-1">
        <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressBarColor}`}
            style={{ width: `${progressWidth}%` }}
          />
        </div>
      </div>

      {/* Figures Row */}
      <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
        <div>
          <span className="block text-[10px] text-foreground/50">Gastado</span>
          <span className="font-extrabold text-foreground">{formatCOP(category.spent_this_month)}</span>
        </div>
        <div className="text-right">
          <span className="block text-[10px] text-foreground/50">
            {isExceeded ? 'Excedido por' : 'Presupuesto'}
          </span>
          <span className={`font-extrabold ${isExceeded ? 'text-danger' : 'text-foreground/80'}`}>
            {isExceeded
              ? formatCOP(category.spent_this_month - category.monthly_budget)
              : formatCOP(category.monthly_budget)}
          </span>
        </div>
      </div>

      {isExceeded && (
        <div className="mt-2 text-[11px] text-danger bg-danger/10 border border-danger/30 rounded-lg p-1.5 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-danger" />
          <span>¡Límite superado! Detén gastos aquí.</span>
        </div>
      )}
    </div>
  );
}
