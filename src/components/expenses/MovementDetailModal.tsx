'use client';

import React from 'react';
import { Trash2, ArrowDownCircle, ArrowUpCircle, Calendar, CreditCard, Tag, FileText, ArrowRightLeft } from 'lucide-react';
import { formatCOP } from '@/lib/utils';
import { formatMovementDetailDate } from '@/lib/dayjs';
import { toast } from 'sonner';
import { Modal, Button, Badge } from '@/components/ui';

export interface Movement {
  id: string;
  type?: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  amount: number;
  payment_method: string;
  destination_method?: string | null;
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
  const isTransfer = movement.type === 'TRANSFER';
  const dateInfo = formatMovementDetailDate(movement.date, movement.created_at);

  const handleDelete = async () => {
    const confirmMsg = isTransfer
      ? '¿Deseas eliminar este registro de transferencia entre cuentas?'
      : '¿Deseas eliminar este movimiento? Tu fondo disponible se actualizará automáticamente.';
    if (!confirm(confirmMsg)) {
      return;
    }

    try {
      const res = await fetch(`/api/expenses/${movement.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(
          isTransfer
            ? 'Transferencia eliminada'
            : isIncome
            ? 'Ingreso eliminado y fondo ajustado'
            : 'Gasto eliminado y fondo restaurado'
        );
        onMovementDeleted();
        onClose();
      } else {
        toast.error('Error al eliminar el movimiento');
      }
    } catch {
      toast.error('Error de conexión');
    }
  };

  const titleNode = (
    <div className="flex items-center gap-2">
      {isTransfer ? (
        <span className="text-xs font-bold text-accent flex items-center gap-1.5 uppercase tracking-wider whitespace-nowrap">
          <ArrowRightLeft className="w-4 h-4 shrink-0" />
          Transferencia Entre Cuentas
        </span>
      ) : isIncome ? (
        <span className="text-xs font-bold text-success flex items-center gap-1.5 uppercase tracking-wider whitespace-nowrap">
          <ArrowUpCircle className="w-4 h-4 shrink-0" />
          Ingreso Registrado
        </span>
      ) : (
        <span className="text-xs font-bold text-danger flex items-center gap-1.5 uppercase tracking-wider whitespace-nowrap">
          <ArrowDownCircle className="w-4 h-4 shrink-0" />
          Egreso / Gasto
        </span>
      )}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={titleNode} maxWidth="md">
      {/* Big Amount Card */}
      <div className="text-center py-4">
        <span className="text-[11px] text-foreground/60 uppercase font-semibold tracking-wider whitespace-nowrap">
          {isTransfer ? 'Monto Transferido' : 'Impacto en Fondo'}
        </span>
        <p
          className={`text-3xl sm:text-4xl font-black mt-1 whitespace-nowrap ${
            isTransfer ? 'text-accent' : isIncome ? 'text-success' : 'text-danger'
          }`}
        >
          {isTransfer ? formatCOP(movement.amount) : isIncome ? `+${formatCOP(movement.amount)}` : `-${formatCOP(movement.amount)}`}
        </p>
        <div className="mt-2.5 flex justify-center">
          <Badge variant={isTransfer ? 'accent' : isIncome ? 'success' : 'danger'}>
            {isTransfer
              ? 'Movimiento interno entre tus cuentas'
              : isIncome
              ? 'Añadido a tu dinero disponible'
              : 'Descontado de tu dinero disponible'}
          </Badge>
        </div>
      </div>

      {/* Detail Attributes List */}
      <div className="bg-surface-elevated border border-border rounded-2xl p-4 space-y-3 mt-2">
        {/* Category / Source / Transfer */}
        <div className="flex items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-2 text-foreground/60 whitespace-nowrap shrink-0">
            {isTransfer ? (
              <ArrowRightLeft className="w-4 h-4 text-accent shrink-0" />
            ) : (
              <Tag className="w-4 h-4 text-primary shrink-0" />
            )}
            <span>{isTransfer ? 'Tipo de Operación:' : isIncome ? 'Fuente de Ingreso:' : 'Grupo de Gasto:'}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-foreground truncate">
              {isTransfer ? 'Transferencia entre Cuentas' : movement.category_name || (isIncome ? 'Ingreso General' : 'Gasto General')}
            </span>
            {!isTransfer && movement.is_fixed === 1 && (
              <Badge variant="accent" size="sm">
                Fijo
              </Badge>
            )}
          </div>
        </div>

        {/* Payment Method / Accounts */}
        {isTransfer ? (
          <div className="space-y-2 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between text-xs gap-2">
              <div className="flex items-center gap-2 text-foreground/60 whitespace-nowrap shrink-0">
                <CreditCard className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Cuenta Origen:</span>
              </div>
              <span className="font-bold text-rose-300 px-2.5 py-0.5 rounded-lg bg-surface border border-rose-500/30 whitespace-nowrap shrink-0">
                {movement.payment_method}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs gap-2">
              <div className="flex items-center gap-2 text-foreground/60 whitespace-nowrap shrink-0">
                <CreditCard className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Cuenta Destino:</span>
              </div>
              <span className="font-bold text-emerald-300 px-2.5 py-0.5 rounded-lg bg-surface border border-emerald-500/30 whitespace-nowrap shrink-0">
                {movement.destination_method || 'Efectivo'}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2 text-foreground/60 whitespace-nowrap shrink-0">
              <CreditCard className="w-4 h-4 text-primary shrink-0" />
              <span>Medio / Cuenta:</span>
            </div>
            <span className="font-bold text-foreground px-2.5 py-0.5 rounded-lg bg-surface border border-border whitespace-nowrap shrink-0">
              {movement.payment_method || 'Nequi'}
            </span>
          </div>
        )}

        {/* Date Formatted with dayjs */}
        <div className="pt-2 border-t border-border/50">
          <div className="flex items-center gap-1.5 text-xs text-foreground/60 mb-1.5">
            <Calendar className="w-4 h-4 text-primary shrink-0" />
            <span className="font-medium">Fecha de movimiento:</span>
          </div>
          <div className="bg-surface border border-border px-3 py-2 rounded-xl flex items-center justify-between gap-2 overflow-hidden">
            <span
              className="font-bold text-xs text-foreground truncate"
              title={`${dateInfo.dayName ? `${dateInfo.dayName}, ` : ''}${dateInfo.formattedDate}`}
            >
              {dateInfo.dayName ? `${dateInfo.dayName}, ` : ''}{dateInfo.formattedDate}
            </span>
            {dateInfo.timeFormatted && (
              <span className="text-[10px] text-accent font-mono shrink-0 whitespace-nowrap bg-accent/10 border border-accent/30 px-2 py-0.5 rounded-md">
                {dateInfo.timeFormatted}
              </span>
            )}
          </div>
        </div>

        {/* Notes / Concept */}
        <div className="pt-2 border-t border-border/50">
          <div className="flex items-center gap-1.5 text-xs text-foreground/60 mb-1 whitespace-nowrap">
            <FileText className="w-3.5 h-3.5 text-primary" />
            <span>Concepto / Descripción:</span>
          </div>
          <p className="text-xs font-semibold text-foreground/90 bg-surface border border-border p-2.5 rounded-xl wrap-break-word">
            {movement.notes || 'Sin descripción adicional'}
          </p>
        </div>
      </div>

      {/* Delete Action Footer */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <Button
          variant="secondary"
          onClick={onClose}
          className="flex-1"
        >
          Cerrar Detalle
        </Button>
        <Button
          variant="danger"
          onClick={handleDelete}
        >
          <Trash2 className="w-3.5 h-3.5 mr-1" />
          <span>Eliminar</span>
        </Button>
      </div>
    </Modal>
  );
}
