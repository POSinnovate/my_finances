'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Sparkles, 
  X, 
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
  nextIncomeLabel,
  onProceedToRegister,
}: ExpenseSimulatorModalProps) {
  const [mounted, setMounted] = useState(false);
  const [amountStr, setAmountStr] = useState('');
  const [concept, setConcept] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

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

  const handleQuickAdd = (addVal: number) => {
    const current = parseCurrencyInput(amountStr);
    const newVal = current + addVal;
    setAmountStr(formatNumberInput(newVal));
  };

  const handleRegister = () => {
    if (simulatedAmount <= 0) return;
    if (onProceedToRegister) {
      onProceedToRegister({
        amount: simulatedAmount,
        notes: concept.trim() || 'Gasto evaluado en simulador',
        type: 'EXPENSE',
      });
    }
    onClose();
  };

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-99999 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#0B192C] border border-[#1E3A5F] rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden my-auto animate-in zoom-in-95 duration-150"
      >
        {/* Dynamic Top Glow Bar */}
        <div
          className={`absolute top-0 left-0 right-0 h-1.5 transition-colors duration-300 ${
            simulatedAmount <= 0
              ? 'bg-linear-to-r from-[#00ADB5] via-[#06B6D4] to-emerald-400'
              : status === 'SAFE'
              ? 'bg-linear-to-r from-emerald-500 via-teal-400 to-cyan-400'
              : status === 'WARNING'
              ? 'bg-linear-to-r from-amber-500 via-orange-500 to-yellow-400'
              : 'bg-linear-to-r from-rose-600 via-red-600 to-amber-600'
          }`}
        />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00ADB5]/15 border border-[#00ADB5]/30 flex items-center justify-center text-[#00ADB5] shadow-lg shadow-[#00ADB5]/10 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-1.5">
                <span>Simulador: ¿Puedo permitírmelo?</span>
              </h2>
              <p className="text-xs text-slate-400">
                Proyecta el impacto de una compra antes de gastar tu dinero
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#102A43] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Financial Baseline Pills */}
        <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-[#102A43]/70 border border-[#1E3A5F] mb-4 text-center">
          <div className="p-1.5">
            <span className="text-[10px] text-slate-400 font-semibold flex items-center justify-center gap-1">
              <Wallet className="w-3 h-3 text-[#00ADB5]" />
              <span>Fondo Actual</span>
            </span>
            <p className="text-xs sm:text-sm font-black text-white mt-0.5">
              {formatCOP(currentCash)}
            </p>
          </div>
          <div className="p-1.5 border-x border-[#1E3A5F]">
            <span className="text-[10px] text-slate-400 font-semibold flex items-center justify-center gap-1">
              <Calendar className="w-3 h-3 text-cyan-400" />
              <span>Próx. Ingreso</span>
            </span>
            <p className="text-xs sm:text-sm font-black text-white mt-0.5">
              {validDays} {validDays === 1 ? 'día' : 'días'}
            </p>
          </div>
          <div className="p-1.5">
            <span className="text-[10px] text-slate-400 font-semibold flex items-center justify-center gap-1">
              <Flame className="w-3 h-3 text-amber-400" />
              <span>Gasto Seguro</span>
            </span>
            <p className="text-xs sm:text-sm font-black text-[#00ADB5] mt-0.5">
              {formatCOP(currentSafeDaily)}/d
            </p>
          </div>
        </div>

        {/* Input Fields */}
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              ¿Cuánto planeas gastar? (COP)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-base">$</span>
              <input
                type="text"
                inputMode="numeric"
                value={amountStr}
                onChange={(e) => setAmountStr(formatNumberInput(e.target.value))}
                placeholder="0"
                autoFocus
                className="w-full bg-[#102A43] border border-[#243B55] focus:border-[#00ADB5] rounded-xl pl-8 pr-3 py-2.5 text-base font-black text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#00ADB5] transition-all"
              />
            </div>

            {/* Quick Amount Suggestion Chips */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto scrollbar-none pb-1">
              <button
                type="button"
                onClick={() => handleQuickAdd(10000)}
                className="px-2.5 py-1 rounded-lg bg-[#102A43] hover:bg-[#152E4D] border border-[#243B55] hover:border-[#00ADB5] text-[10px] font-bold text-slate-300 hover:text-[#00ADB5] transition-all cursor-pointer whitespace-nowrap"
              >
                +$10k
              </button>
              <button
                type="button"
                onClick={() => handleQuickAdd(20000)}
                className="px-2.5 py-1 rounded-lg bg-[#102A43] hover:bg-[#152E4D] border border-[#243B55] hover:border-[#00ADB5] text-[10px] font-bold text-slate-300 hover:text-[#00ADB5] transition-all cursor-pointer whitespace-nowrap"
              >
                +$20k
              </button>
              <button
                type="button"
                onClick={() => handleQuickAdd(50000)}
                className="px-2.5 py-1 rounded-lg bg-[#102A43] hover:bg-[#152E4D] border border-[#243B55] hover:border-[#00ADB5] text-[10px] font-bold text-slate-300 hover:text-[#00ADB5] transition-all cursor-pointer whitespace-nowrap"
              >
                +$50k
              </button>
              <button
                type="button"
                onClick={() => handleQuickAdd(100000)}
                className="px-2.5 py-1 rounded-lg bg-[#102A43] hover:bg-[#152E4D] border border-[#243B55] hover:border-[#00ADB5] text-[10px] font-bold text-slate-300 hover:text-[#00ADB5] transition-all cursor-pointer whitespace-nowrap"
              >
                +$100k
              </button>
              {simulatedAmount > 0 && (
                <button
                  type="button"
                  onClick={() => setAmountStr('')}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-[10px] font-bold text-rose-400 transition-all cursor-pointer whitespace-nowrap ml-auto"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Motivo o Concepto (Opcional)
            </label>
            <input
              type="text"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Ej: Salida a cenar, ropa, repuesto..."
              className="w-full bg-[#102A43] border border-[#243B55] focus:border-[#00ADB5] rounded-xl px-3.5 py-2 text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#00ADB5] transition-all"
            />
          </div>
        </div>

        {/* Live Simulation Diagnostic Result */}
        {simulatedAmount > 0 ? (
          <div className="space-y-3 mb-5">
            {/* Status Verdict Banner */}
            <div
              className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-all ${
                status === 'SAFE'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : status === 'WARNING'
                  ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl shrink-0 mt-0.5 ${
                  status === 'SAFE'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : status === 'WARNING'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {status === 'SAFE' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : status === 'WARNING' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <AlertOctagon className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0">
                <h4
                  className={`text-xs sm:text-sm font-black ${
                    status === 'SAFE'
                      ? 'text-emerald-300'
                      : status === 'WARNING'
                      ? 'text-amber-300'
                      : 'text-rose-300'
                  }`}
                >
                  {statusTitle}
                </h4>
                <p className="text-xs mt-1 leading-relaxed text-slate-200">
                  {statusMessage}
                </p>
              </div>
            </div>

            {/* Impact Breakdown Table (Before vs After) */}
            <div className="p-3 rounded-2xl bg-[#102A43] border border-[#1E3A5F] space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Impacto en tus Números (Antes ➔ Después)
              </span>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                {/* Fondo Disponible */}
                <div className="p-2 rounded-xl bg-[#0B192C]/80 border border-[#243B55]">
                  <span className="text-[10px] text-slate-400 block">Fondo Disponible</span>
                  <div className="flex items-center gap-1.5 mt-0.5 font-black">
                    <span className="text-slate-400 line-through text-[11px]">{formatCOP(currentCash)}</span>
                    <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className={projectedCash >= 0 ? 'text-white' : 'text-rose-400'}>
                      {formatCOP(projectedCash)}
                    </span>
                  </div>
                </div>

                {/* Gasto Diario Seguro */}
                <div className="p-2 rounded-xl bg-[#0B192C]/80 border border-[#243B55]">
                  <span className="text-[10px] text-slate-400 block">Gasto Diario Seguro</span>
                  <div className="flex items-center gap-1.5 mt-0.5 font-black">
                    <span className="text-slate-400 line-through text-[11px]">{formatCOP(currentSafeDaily)}</span>
                    <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className={projectedSafeDaily > 0 ? 'text-[#00ADB5]' : 'text-rose-400'}>
                      {formatCOP(projectedSafeDaily)}/d
                    </span>
                  </div>
                </div>
              </div>

              {/* Commitments protection status */}
              <div className="flex items-center justify-between text-[11px] px-1 pt-1">
                <span className="text-slate-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#00ADB5]" />
                  <span>Compromisos previos ({formatCOP(pendingCommitments)}):</span>
                </span>
                <span className={`font-black ${isCompromisingCommitments ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {isCompromisingCommitments ? `En riesgo (Faltan ${formatCOP(commitmentsDeficit)})` : '100% Protegidos'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Empty state guide */
          <div className="p-4 rounded-2xl bg-[#102A43]/40 border border-[#1E3A5F] text-center mb-5">
            <Sparkles className="w-6 h-6 text-[#00ADB5] mx-auto mb-1.5 opacity-60" />
            <p className="text-xs text-slate-300 font-semibold">
              Digita una cantidad arriba para evaluar tu compra
            </p>
            <span className="text-[10px] text-slate-400 block mt-1">
              El simulador calculará en vivo si te alcanza para llegar a tu próximo ingreso y pagar tus compromisos.
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-[#102A43] hover:bg-[#152E4D] border border-[#243B55] text-xs font-bold text-slate-300 transition-colors cursor-pointer"
          >
            Cerrar
          </button>

          {simulatedAmount > 0 && status !== 'CRITICAL' && (
            <button
              type="button"
              onClick={handleRegister}
              className="flex-1 py-2.5 rounded-xl bg-linear-to-r from-[#00ADB5] to-[#06B6D4] hover:opacity-95 text-[#0B192C] text-xs font-black shadow-lg shadow-[#00ADB5]/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3px]" />
              <span>Registrar este Gasto</span>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
