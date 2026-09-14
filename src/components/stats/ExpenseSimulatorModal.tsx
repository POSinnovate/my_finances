'use client';

import React, { useState } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  ArrowRight, 
  Wallet, 
  Calendar, 
  ShieldCheck, 
  Flame,
  Plus
} from 'lucide-react';
import { formatCOP, formatNumberInput, parseCurrencyInput } from '@/lib/utils';
import { Modal, Button, Badge, Input } from '@/components/ui';

interface ExpenseSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCash: number;
  daysRemaining: number;
  currentSafeDaily: number;
  pendingCommitments: number;
  nextIncomeLabel?: string;
  onProceedToRegister?: (data: { amount: number; notes: string; type: 'EXPENSE' }) => void;
}

export function ExpenseSimulatorModal({
  isOpen,
  onClose,
  currentCash,
  daysRemaining,
  currentSafeDaily,
  pendingCommitments,
  onProceedToRegister,
}: ExpenseSimulatorModalProps) {
  const [amountStr, setAmountStr] = useState('');
  const [concept, setConcept] = useState('');

  const simulatedAmount = parseCurrencyInput(amountStr);
  const validDays = Math.max(1, daysRemaining);

  // Simulation Calculations
  const projectedCash = currentCash - simulatedAmount;
  const isOverCash = projectedCash < 0;
  const cashDeficit = Math.max(0, -projectedCash);

  // Check if it compromises commitments prior to next income
  const isCompromisingCommitments = projectedCash >= 0 && projectedCash < pendingCommitments;
  const commitmentsDeficit = Math.max(0, pendingCommitments - projectedCash);

  // Projected free cash and safe daily spend
  const projectedFreeCash = Math.max(0, projectedCash - pendingCommitments);
  const projectedSafeDaily = Math.max(0, Math.floor(projectedFreeCash / validDays));

  // Determine feasibility status
  let status: 'SAFE' | 'WARNING' | 'CRITICAL' = 'SAFE';
  let statusTitle = '¡Viable y Seguro!';
  let statusMessage = '';

  if (simulatedAmount <= 0) {
    status = 'SAFE';
  } else if (isOverCash) {
    status = 'CRITICAL';
    statusTitle = 'Inviable: Supera tu Fondo';
    statusMessage = `Este gasto de ${formatCOP(simulatedAmount)} supera tu fondo actual por ${formatCOP(cashDeficit)}. Quedarías en saldo negativo.`;
  } else if (isCompromisingCommitments) {
    status = 'CRITICAL';
    statusTitle = 'Riesgo: Desfinancia tus Compromisos';
    statusMessage = `Aunque tienes el dinero, necesitas reservar ${formatCOP(pendingCommitments)} para pagos fijos antes de tu próximo ingreso. Te faltarían ${formatCOP(commitmentsDeficit)} para cubrirlos.`;
  } else if (projectedSafeDaily < 4000 || (currentSafeDaily > 0 && projectedSafeDaily < currentSafeDaily * 0.35)) {
    status = 'WARNING';
    statusTitle = 'Viable pero Muy Ajustado';
    statusMessage = `Te alcanza para la compra y tus pagos fijos quedan protegidos, pero tu margen diario caerá a ${formatCOP(projectedSafeDaily)}/día durante los próximos ${validDays} ${validDays === 1 ? 'día' : 'días'}.`;
  } else {
    status = 'SAFE';
    statusTitle = '¡Totalmente Viable!';
    statusMessage = `Puedes permitírtelo con tranquilidad. Mantendrás un margen seguro de ${formatCOP(projectedSafeDaily)}/día y tus compromisos fijos seguirán 100% cubiertos.`;
  }

  const handleQuickAdd = (value: number) => {
    const current = parseCurrencyInput(amountStr);
    setAmountStr(formatNumberInput(String(current + value)));
  };

  const handleRegister = () => {
    if (onProceedToRegister && simulatedAmount > 0) {
      onProceedToRegister({
        amount: simulatedAmount,
        notes: concept.trim() ? `Simulación: ${concept.trim()}` : 'Gasto simulado',
        type: 'EXPENSE',
      });
      onClose();
    }
  };

  const titleNode = (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-lg shadow-primary/10 shrink-0">
        <Sparkles className="w-5 h-5" />
      </div>
      <div>
        <h2 className="text-base font-black text-foreground flex items-center gap-1.5">
          <span>Simulador: ¿Puedo permitírmelo?</span>
        </h2>
        <p className="text-xs text-foreground/60">
          Proyecta el impacto de una compra antes de gastar tu dinero
        </p>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={titleNode}
      maxWidth="lg"
    >
      <div className="space-y-4 pt-1">
        {/* Current Financial Baseline Pills */}
        <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-surface-elevated/70 border border-border text-center">
          <div className="p-1.5">
            <span className="text-[10px] text-foreground/50 font-semibold flex items-center justify-center gap-1">
              <Wallet className="w-3 h-3 text-primary" />
              <span>Fondo Actual</span>
            </span>
            <p className="text-xs sm:text-sm font-black text-foreground mt-0.5">
              {formatCOP(currentCash)}
            </p>
          </div>
          <div className="p-1.5 border-x border-border">
            <span className="text-[10px] text-foreground/50 font-semibold flex items-center justify-center gap-1">
              <Calendar className="w-3 h-3 text-accent" />
              <span>Próx. Ingreso</span>
            </span>
            <p className="text-xs sm:text-sm font-black text-foreground mt-0.5">
              {validDays} {validDays === 1 ? 'día' : 'días'}
            </p>
          </div>
          <div className="p-1.5">
            <span className="text-[10px] text-foreground/50 font-semibold flex items-center justify-center gap-1">
              <Flame className="w-3 h-3 text-amber-400" />
              <span>Gasto Seguro</span>
            </span>
            <p className="text-xs sm:text-sm font-black text-primary mt-0.5">
              {formatCOP(currentSafeDaily)}/d
            </p>
          </div>
        </div>

        {/* Input Fields */}
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-foreground/70 uppercase tracking-wider mb-1.5">
              ¿Cuánto planeas gastar? (COP)
            </label>
            <Input
              type="text"
              inputMode="numeric"
              value={amountStr}
              onChange={(e) => setAmountStr(formatNumberInput(e.target.value))}
              placeholder="0"
              leftIcon={<span className="font-black text-base">$</span>}
              autoFocus
              className="text-base font-black"
            />

            {/* Quick Amount Suggestion Chips */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto scrollbar-none pb-1">
              {[10000, 20000, 50000, 100000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAdd(val)}
                  className="px-2.5 py-1 rounded-lg bg-surface-elevated hover:bg-secondary/60 border border-border hover:border-primary text-[10px] font-bold text-foreground/70 hover:text-primary transition-all cursor-pointer whitespace-nowrap"
                >
                  +${val / 1000}k
                </button>
              ))}
              {simulatedAmount > 0 && (
                <button
                  type="button"
                  onClick={() => setAmountStr('')}
                  className="px-2.5 py-1 rounded-lg bg-danger/10 hover:bg-danger/20 border border-danger/30 text-[10px] font-bold text-danger transition-all cursor-pointer whitespace-nowrap ml-auto"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-foreground/70 uppercase tracking-wider mb-1.5">
              Motivo o Concepto (Opcional)
            </label>
            <Input
              type="text"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Ej: Salida a cenar, ropa, repuesto..."
            />
          </div>
        </div>

        {/* Live Simulation Diagnostic Result */}
        {simulatedAmount > 0 ? (
          <div className="space-y-3">
            {/* Status Verdict Banner */}
            <div
              className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-all ${
                status === 'SAFE'
                  ? 'bg-success/10 border-success/30 text-success'
                  : status === 'WARNING'
                  ? 'bg-warning/10 border-warning/30 text-warning'
                  : 'bg-danger/10 border-danger/30 text-danger'
              }`}
            >
              <div className="p-1.5 rounded-xl shrink-0 mt-0.5 bg-black/20">
                {status === 'SAFE' ? (
                  <CheckCircle2 className="w-5 h-5 text-success" />
                ) : status === 'WARNING' ? (
                  <AlertTriangle className="w-5 h-5 text-warning" />
                ) : (
                  <AlertOctagon className="w-5 h-5 text-danger" />
                )}
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-black">
                  {statusTitle}
                </h4>
                <p className="text-xs mt-1 leading-relaxed text-foreground/80">
                  {statusMessage}
                </p>
              </div>
            </div>

            {/* Impact Breakdown Table (Before vs After) */}
            <div className="p-3 rounded-2xl bg-surface-elevated border border-border space-y-2">
              <span className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider block">
                Impacto en tus Números (Antes ➔ Después)
              </span>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                {/* Fondo Disponible */}
                <div className="p-2 rounded-xl bg-surface border border-border">
                  <span className="text-[10px] text-foreground/50 block">Fondo Disponible</span>
                  <div className="flex items-center gap-1.5 mt-0.5 font-black">
                    <span className="text-foreground/40 line-through text-[11px]">{formatCOP(currentCash)}</span>
                    <ArrowRight className="w-3 h-3 text-foreground/30 shrink-0" />
                    <span className={projectedCash >= 0 ? 'text-foreground' : 'text-danger'}>
                      {formatCOP(projectedCash)}
                    </span>
                  </div>
                </div>

                {/* Gasto Diario Seguro */}
                <div className="p-2 rounded-xl bg-surface border border-border">
                  <span className="text-[10px] text-foreground/50 block">Gasto Diario Seguro</span>
                  <div className="flex items-center gap-1.5 mt-0.5 font-black">
                    <span className="text-foreground/40 line-through text-[11px]">{formatCOP(currentSafeDaily)}</span>
                    <ArrowRight className="w-3 h-3 text-foreground/30 shrink-0" />
                    <span className={projectedSafeDaily > 0 ? 'text-primary' : 'text-danger'}>
                      {formatCOP(projectedSafeDaily)}/d
                    </span>
                  </div>
                </div>
              </div>

              {/* Commitments protection status */}
              <div className="flex items-center justify-between text-[11px] px-1 pt-1">
                <span className="text-foreground/60 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  <span>Compromisos previos ({formatCOP(pendingCommitments)}):</span>
                </span>
                <span className={`font-black ${isCompromisingCommitments ? 'text-danger' : 'text-success'}`}>
                  {isCompromisingCommitments ? `En riesgo (Faltan ${formatCOP(commitmentsDeficit)})` : '100% Protegidos'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Empty state guide */
          <div className="p-4 rounded-2xl bg-surface-elevated/40 border border-border text-center">
            <Sparkles className="w-6 h-6 text-primary mx-auto mb-1.5 opacity-60" />
            <p className="text-xs text-foreground/80 font-semibold">
              Digita una cantidad arriba para evaluar tu compra
            </p>
            <span className="text-[10px] text-foreground/50 block mt-1">
              El simulador calculará en vivo si te alcanza para llegar a tu próximo ingreso y pagar tus compromisos.
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2.5 pt-2 border-t border-border">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            Cerrar
          </Button>

          {simulatedAmount > 0 && status !== 'CRITICAL' && (
            <Button
              variant="primary"
              onClick={handleRegister}
              className="flex-1 gap-1.5 font-black"
            >
              <Plus className="w-4 h-4 stroke-[3px]" />
              <span>Registrar este Gasto</span>
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
