'use client';

import React, { useState } from 'react';
import { 
  TrendingUp, 
  ArrowDownRight, 
  Scale, 
  Flame, 
  Calendar, 
  Wallet, 
  AlertTriangle, 
  X, 
  Clock, 
  PlusCircle, 
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Info,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { formatCOP } from '@/lib/utils';
import { toast } from 'sonner';
import { ExpenseSimulatorModal } from './ExpenseSimulatorModal';

interface SummaryData {
  total_income: number;
  dynamic_monthly_income?: number;
  income_count: number;
  total_spent: number;
  fixed_spent: number;
  variable_spent: number;
  fixed_budget: number;
  expense_count: number;
  net_difference: number;
  projected_net_balance?: number;
  total_pending_fixed_expenses?: number;
  current_cash: number;
}

interface HealthData {
  safeDailySpend: number;
  daysRemaining: number;
  statusLevel: 'CRITICAL' | 'WARNING' | 'HEALTHY';
  paydayLabel?: string;
  totalPendingCommitments?: number;
  freeCashForPeriod?: number;
}

interface NextPaymentInfo {
  id?: string;
  name: string;
  amount: number;
  dateStr: string;
  daysRemaining: number;
  isOverdue?: boolean;
  daysOverdue?: number;
  label?: string;
  categoryName?: string;
  categoryId?: string;
  type?: 'INCOME' | 'EXPENSE';
}

interface CashFlowData {
  nextIncome?: NextPaymentInfo | null;
  nextExpense?: NextPaymentInfo | null;
  upcomingCommitments?: Array<{
    id?: string;
    categoryId: string;
    name: string;
    amount: number;
    type?: 'INCOME' | 'EXPENSE';
    dateStr: string;
    daysUntil: number;
    frequency: string;
    isPaid: boolean;
  }>;
  overdueCommitments?: Array<{
    id: string;
    categoryId: string;
    name: string;
    amount: number;
    type?: 'INCOME' | 'EXPENSE';
    dueDay?: number | null;
    dateStr: string;
    daysOverdue: number;
    frequency: string;
  }>;
  totalPendingCommitments?: number;
  totalPendingFixedExpensesMonth?: number;
  projectedNetBalance?: number;
  freeCashForPeriod?: number;
}

interface FinancialOverviewCardProps {
  summary: SummaryData;
  health?: HealthData;
  cashFlow?: CashFlowData;
  onRefresh?: () => void;
  onRegisterExpense?: (data: { categoryId?: string; amount?: number; notes?: string; type?: 'EXPENSE' | 'INCOME' | 'TRANSFER' }) => void;
}

export function FinancialOverviewCard({ 
  summary, 
  health, 
  cashFlow, 
  onRefresh, 
  onRegisterExpense 
}: FinancialOverviewCardProps) {
  const [isNextIncomeModalOpen, setIsNextIncomeModalOpen] = useState(false);
  const [isNextExpenseModalOpen, setIsNextExpenseModalOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const safeDaily = health?.safeDailySpend ?? 0;
  const pendingCommitments = cashFlow?.totalPendingCommitments ?? health?.totalPendingCommitments ?? 0;
  const freeCash = cashFlow?.freeCashForPeriod ?? Math.max(0, summary.current_cash - pendingCommitments);
  const nextIncome = cashFlow?.nextIncome;
  const nextExpense = cashFlow?.nextExpense;
  const daysRemaining = nextIncome?.daysRemaining ?? health?.daysRemaining ?? 1;

  // 1. Ingreso Mensual: Sum of incomes with dates (0 if none)
  const monthlyIncomeWithDates = summary.dynamic_monthly_income ?? 0;

  // 2. Projected Net Balance: dynamic income - (real spent + pending fixed commitments)
  const projectedNetBalance = summary.projected_net_balance ?? cashFlow?.projectedNetBalance ?? (monthlyIncomeWithDates - summary.total_spent);
  const isPositiveBalance = projectedNetBalance >= 0;

  // Overdue commitments
  const overdueCommitments = cashFlow?.overdueCommitments || [];
  const upcomingCommitments = (cashFlow?.upcomingCommitments || []).filter(c => !c.isPaid);

  const handlePostpone = async (itemId: string, action: 'ADD_DAYS' | 'NEXT_MONTH', days: number = 3) => {
    setActionLoadingId(`${itemId}-${action}-${days}`);
    try {
      const res = await fetch('/api/scheduled-items/postpone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, action, days }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Compromiso actualizado');
        if (onRefresh) onRefresh();
      } else {
        toast.error(data.error || 'Error al actualizar');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-3.5">
      {/* 6 Executive KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        {/* 1. Dinero que puedo gastar al día (Stat interactivo -> abre Simulador) */}
        <div 
          onClick={() => setIsSimulatorOpen(true)}
          className="bg-[#102A43] border border-[#00ADB5]/40 hover:border-[#00ADB5] rounded-2xl p-3 sm:p-3.5 shadow-lg transition-all cursor-pointer group active:scale-[0.98] relative overflow-hidden"
          title={
            pendingCommitments > 0
              ? `Fondo libre: ${formatCOP(freeCash)} (descontando ${formatCOP(pendingCommitments)} en compromisos previos) dividido en ${daysRemaining} días hasta tu próximo ingreso. Haz clic para simular una compra.`
              : `Fondo disponible: ${formatCOP(freeCash)} dividido en ${daysRemaining} días hasta tu próximo ingreso. Haz clic para simular una compra.`
          }
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-300 flex items-center gap-1">
              <span>Gasto Seguro</span>
              <Sparkles className="w-3 h-3 text-[#00ADB5] opacity-70 group-hover:opacity-100 group-hover:rotate-12 transition-all" />
            </span>
            <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00ADB5] group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-sm sm:text-base font-black text-white truncate group-hover:text-[#00ADB5] transition-colors">
            {formatCOP(safeDaily)}
          </p>
          <span className="text-[9px] sm:text-[10px] text-[#00ADB5] block mt-0.5 font-medium truncate group-hover:underline">
            {nextIncome && nextIncome.daysRemaining > 0
              ? `${daysRemaining}d hasta ingreso • Simular`
              : nextIncome && nextIncome.daysRemaining === 0
              ? 'Llega hoy • Simular'
              : `${daysRemaining}d restantes • Simular`}
          </span>
        </div>

        {/* 2. Próximo Egreso */}
        {nextExpense ? (
          <div 
            onClick={() => setIsNextExpenseModalOpen(true)}
            className="bg-[#102A43] border border-[#243B55] hover:border-rose-400/80 rounded-2xl p-3 sm:p-3.5 shadow-lg transition-all cursor-pointer group active:scale-[0.98]"
            title="Haz clic para ver opciones de pago o aplazamiento"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-300 flex items-center gap-1">
                <span>Próximo Egreso</span>
                <Info className="w-3 h-3 text-rose-400 opacity-70 group-hover:opacity-100" />
              </span>
              <ArrowDownRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" />
            </div>
            <p className="text-sm sm:text-base font-black text-white truncate">
              {nextExpense.isOverdue
                ? `Venció hace ${nextExpense.daysOverdue}d`
                : nextExpense.daysRemaining === 0
                ? '¡Vence Hoy!'
                : nextExpense.daysRemaining === 1
                ? '¡Mañana!'
                : `En ${nextExpense.daysRemaining} días`}
            </p>
            <span className="text-[9px] sm:text-[10px] text-rose-300 block mt-0.5 truncate font-semibold group-hover:underline">
              {nextExpense.name} • {formatCOP(nextExpense.amount)}
            </span>
          </div>
        ) : (
          <Link 
            href="/budgets"
            className="bg-[#102A43] border border-[#243B55] hover:border-rose-400/60 rounded-2xl p-3 sm:p-3.5 shadow-lg transition-all block group active:scale-[0.98]"
            title="Sin egresos con fechas programadas. Clic para configurar en Rubros"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-300">Próximo Egreso</span>
              <ArrowDownRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400/70" />
            </div>
            <p className="text-sm sm:text-base font-bold text-slate-400 truncate">
              Sin programar
            </p>
            <span className="text-[9px] sm:text-[10px] text-rose-400 flex items-center gap-1 mt-0.5 font-bold truncate group-hover:underline">
              <span>Configurar fechas</span>
              <ArrowRight className="w-2.5 h-2.5" />
            </span>
          </Link>
        )}

        {/* 3. Próximo Ingreso */}
        {nextIncome ? (
          <div 
            onClick={() => setIsNextIncomeModalOpen(true)}
            className="bg-[#102A43] border border-[#243B55] hover:border-[#06B6D4] rounded-2xl p-3 sm:p-3.5 shadow-lg transition-all cursor-pointer group active:scale-[0.98]"
            title="Haz clic para ver opciones de cobro o aplazamiento"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-300 flex items-center gap-1">
                <span>Próximo Ingreso</span>
                <Info className="w-3 h-3 text-[#06B6D4] opacity-70 group-hover:opacity-100" />
              </span>
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#06B6D4]" />
            </div>
            <p className="text-sm sm:text-base font-black text-white truncate">
              {nextIncome.isOverdue
                ? `Venció hace ${nextIncome.daysOverdue}d`
                : nextIncome.daysRemaining === 0
                ? '¡Llega Hoy!'
                : nextIncome.daysRemaining === 1
                ? '¡Mañana!'
                : `En ${nextIncome.daysRemaining} días`}
            </p>
            <span className="text-[9px] sm:text-[10px] text-cyan-400 block mt-0.5 truncate font-semibold group-hover:underline">
              {nextIncome.name} • {formatCOP(nextIncome.amount)}
            </span>
          </div>
        ) : (
          <Link 
            href="/budgets"
            className="bg-[#102A43] border border-[#243B55] hover:border-amber-400/60 rounded-2xl p-3 sm:p-3.5 shadow-lg transition-all block group active:scale-[0.98]"
            title="Sin ingresos con fechas programadas. Clic para configurar en Rubros"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-300">Próximo Ingreso</span>
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
            </div>
            <p className="text-sm sm:text-base font-bold text-slate-400 truncate">
              Sin programar
            </p>
            <span className="text-[9px] sm:text-[10px] text-amber-400 flex items-center gap-1 mt-0.5 font-bold truncate group-hover:underline">
              <span>Configurar fechas</span>
              <ArrowRight className="w-2.5 h-2.5" />
            </span>
          </Link>
        )}

        {/* 4. Ingreso Mensual (Suma de ingresos con fechas, 0 si no hay) */}
        <div className="bg-[#102A43] border border-[#243B55] hover:border-emerald-500/40 rounded-2xl p-3 sm:p-3.5 shadow-lg transition-all">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-300">Ingreso Mensual</span>
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
          </div>
          <p className="text-sm sm:text-base font-black text-emerald-400 truncate">
            {formatCOP(monthlyIncomeWithDates)}
          </p>
          <span className="text-[9px] sm:text-[10px] text-slate-400 block mt-0.5 truncate" title="Suma de ingresos fijos programados con fechas y quincenas">
            {monthlyIncomeWithDates > 0 ? 'Suma de ingresos con fecha' : 'Sin ingresos con fecha'}
          </span>
        </div>

        {/* 5. Egreso del mes */}
        <div className="bg-[#102A43] border border-[#243B55] hover:border-rose-500/40 rounded-2xl p-3 sm:p-3.5 shadow-lg transition-all">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-300">Egresos del Mes</span>
            <ArrowDownRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" />
          </div>
          <p className="text-sm sm:text-base font-black text-rose-400 truncate">
            {formatCOP(summary.total_spent)}
          </p>
          <span className="text-[9px] sm:text-[10px] text-slate-400 block mt-0.5 truncate">
            {summary.expense_count} gastos registrados
          </span>
        </div>

        {/* 6. Balance Neto / Ahorro Proyectado */}
        <div className="bg-[#102A43] border border-[#243B55] hover:border-slate-400/40 rounded-2xl p-3 sm:p-3.5 shadow-lg transition-all">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-300">Balance Neto</span>
            <Scale className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isPositiveBalance ? 'text-[#00ADB5]' : 'text-rose-400'}`} />
          </div>
          <p className={`text-sm sm:text-base font-black truncate ${isPositiveBalance ? 'text-[#00ADB5]' : 'text-rose-400'}`}>
            {isPositiveBalance ? `${formatCOP(projectedNetBalance)}` : formatCOP(projectedNetBalance)}
          </p>
          <span className="text-[9px] sm:text-[10px] text-slate-400 block mt-0.5 truncate" title="Ingresos con fecha menos los gastos del mes ya ejecutados y los egresos fijos pendientes por registrar">
            {isPositiveBalance ? 'Ahorro proyectado neto' : 'Déficit proyectado mes'}
          </span>
        </div>
      </div>

      {/* OVERDUE COMMITMENTS BANNER: Compromisos y cobros que vencen hoy o están vencidos sin movimiento registrado */}
      {overdueCommitments.length > 0 && (
        <div className="bg-[#102A43] border border-amber-500/50 rounded-2xl p-4 shadow-xl space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                  <span>Compromisos y Cobros por Confirmar</span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-extrabold font-mono">
                    {overdueCommitments.length} pendiente{overdueCommitments.length === 1 ? '' : 's'}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Llegó la fecha estimada de estos rubros. Confirma el registro si ya se efectuó, o aplázalos si aún estás esperando.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            {overdueCommitments.map((item) => {
              const isIncome = item.type === 'INCOME';
              return (
                <div 
                  key={item.id}
                  className={`bg-[#0B192C] border rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isIncome ? 'border-emerald-500/40' : 'border-[#243B55]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase shrink-0 ${
                        isIncome ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {isIncome ? 'Ingreso' : 'Egreso'}
                      </span>
                      <span className="text-xs font-black text-white truncate">{item.name}</span>
                      <span className={`text-xs font-black font-mono shrink-0 ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isIncome ? '+' : '-'}{formatCOP(item.amount)}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {item.daysOverdue === 0 ? (
                        <span className="text-cyan-300 font-bold">
                          ★ Fecha programada: HOY (Día {item.dueDay || item.dateStr}). ¿Ya se realizó este movimiento?
                        </span>
                      ) : (
                        <span>
                          Estaba previsto para el <strong className="text-slate-300">Día {item.dueDay || item.dateStr}</strong> (hace {item.daysOverdue} {item.daysOverdue === 1 ? 'día' : 'días'}).
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={Boolean(actionLoadingId)}
                      onClick={() => handlePostpone(item.id, 'ADD_DAYS', 3)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#102A43] hover:bg-[#1E3A5F] border border-[#243B55] text-[11px] font-bold text-cyan-300 transition-colors whitespace-nowrap"
                    >
                      +3 Días de espera
                    </button>

                    <button
                      type="button"
                      disabled={Boolean(actionLoadingId)}
                      onClick={() => handlePostpone(item.id, 'ADD_DAYS', 5)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#102A43] hover:bg-[#1E3A5F] border border-[#243B55] text-[11px] font-bold text-cyan-300 transition-colors whitespace-nowrap"
                    >
                      +5 Días
                    </button>

                    <button
                      type="button"
                      disabled={Boolean(actionLoadingId)}
                      onClick={() => handlePostpone(item.id, 'NEXT_MONTH')}
                      className="px-2.5 py-1.5 rounded-lg bg-[#102A43] hover:bg-[#1E3A5F] border border-[#243B55] text-[11px] font-bold text-amber-300 transition-colors whitespace-nowrap"
                      title="Posponer para el próximo mes"
                    >
                      Siguiente mes
                    </button>

                    {onRegisterExpense && (
                      <button
                        type="button"
                        onClick={() => onRegisterExpense({
                          categoryId: item.categoryId,
                          amount: item.amount,
                          notes: item.name,
                          type: isIncome ? 'INCOME' : 'EXPENSE',
                        })}
                        className={`px-2.5 py-1.5 rounded-lg text-slate-950 text-[11px] font-extrabold transition-colors flex items-center gap-1 whitespace-nowrap shadow-sm ${
                          isIncome ? 'bg-emerald-400 hover:bg-emerald-300' : 'bg-rose-500 hover:bg-rose-400 text-white'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{isIncome ? 'Registrar ingreso' : 'Registrar pago'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: Detalles del Próximo Ingreso */}
      {isNextIncomeModalOpen && nextIncome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[#0B192C] border border-emerald-500/80 rounded-3xl p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E3A5F]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Detalles del Próximo Ingreso</h3>
                  <span className="text-[10px] text-slate-400">Proyección y gestión de cobro</span>
                </div>
              </div>

              <button
                onClick={() => setIsNextIncomeModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Income Highlight Box */}
            <div className="p-4 rounded-2xl bg-[#102A43] border border-[#243B55] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-base font-extrabold text-white uppercase tracking-wider block text-nowrap truncate">
                  {nextIncome.categoryName || 'Fuente de Ingreso'}
                </span>
                <span className="text-xs text-slate-300 mt-1 block">
                  Fecha estimada: <strong className="text-white">{nextIncome.dateStr}</strong>
                </span>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs font-semibold text-slate-400 block">Monto a recibir:</span>
                <span className="text-xl font-black text-emerald-400 font-mono block">
                  {formatCOP(nextIncome.amount)}
                </span>
                <span className="text-[10px] font-bold text-cyan-300 block mt-0.5">
                  {nextIncome.isOverdue
                    ? `⚠️ Vencido (hace ${nextIncome.daysOverdue}d)`
                    : nextIncome.daysRemaining === 0
                    ? '★ ¡Llega Hoy!'
                    : nextIncome.daysRemaining === 1
                    ? '¡Llega Mañana!'
                    : `Faltan ${nextIncome.daysRemaining} días`}
                </span>
              </div>
            </div>

            {/* Actions according to date logic */}
            <div className="p-3.5 rounded-2xl bg-[#102A43]/50 border border-[#243B55] space-y-3">
              {nextIncome.isOverdue ? (
                <div className="space-y-2.5">
                  <div className="text-xs text-amber-300 flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>
                      La fecha estimada ({nextIncome.dateStr}) ya pasó sin confirmación de registro.
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Si el cobro se retrasó, añade días de espera o pásalo al siguiente mes. Si ya lo recibiste, regístralo ahora:
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {nextIncome.id && (
                      <>
                        <button
                          type="button"
                          disabled={Boolean(actionLoadingId)}
                          onClick={async () => {
                            await handlePostpone(nextIncome.id!, 'ADD_DAYS', 3);
                            setIsNextIncomeModalOpen(false);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#102A43] hover:bg-[#1E3A5F] border border-[#243B55] text-xs font-bold text-cyan-300 transition-colors"
                        >
                          +3 Días de espera
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(actionLoadingId)}
                          onClick={async () => {
                            await handlePostpone(nextIncome.id!, 'ADD_DAYS', 5);
                            setIsNextIncomeModalOpen(false);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#102A43] hover:bg-[#1E3A5F] border border-[#243B55] text-xs font-bold text-cyan-300 transition-colors"
                        >
                          +5 Días
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(actionLoadingId)}
                          onClick={async () => {
                            await handlePostpone(nextIncome.id!, 'NEXT_MONTH');
                            setIsNextIncomeModalOpen(false);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#102A43] hover:bg-[#1E3A5F] border border-[#243B55] text-xs font-bold text-amber-300 transition-colors"
                        >
                          Siguiente mes
                        </button>
                      </>
                    )}

                    {onRegisterExpense && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsNextIncomeModalOpen(false);
                          onRegisterExpense({
                            categoryId: nextIncome.categoryId,
                            amount: nextIncome.amount,
                            notes: nextIncome.name,
                            type: 'INCOME',
                          });
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-md ml-auto"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Registrar ingreso</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : nextIncome.daysRemaining === 0 ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-white block">
                      ★ Hoy es la fecha programada
                    </span>
                    <span className="text-[11px] text-slate-300 block mt-0.5">
                      Confirma la entrada de dinero para actualizar tus saldos.
                    </span>
                  </div>

                  {onRegisterExpense && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsNextIncomeModalOpen(false);
                        onRegisterExpense({
                          categoryId: nextIncome.categoryId,
                          amount: nextIncome.amount,
                          notes: nextIncome.name,
                          type: 'INCOME',
                        });
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all whitespace-nowrap"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Registrar ingreso</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Faltan {nextIncome.daysRemaining} días ({nextIncome.dateStr})
                    </span>
                    <span className="text-[11px] text-slate-300 block mt-0.5">
                      ¿Recibiste este dinero por adelantado?
                    </span>
                  </div>

                  {onRegisterExpense && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsNextIncomeModalOpen(false);
                        onRegisterExpense({
                          categoryId: nextIncome.categoryId,
                          amount: nextIncome.amount,
                          notes: nextIncome.name,
                          type: 'INCOME',
                        });
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all whitespace-nowrap"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Ingreso anticipado</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Detalles del Próximo Egreso */}
      {isNextExpenseModalOpen && nextExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[#0B192C] border border-rose-500/80 rounded-3xl p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E3A5F]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Detalles del Próximo Egreso</h3>
                  <span className="text-[10px] text-slate-400">Compromiso de pago programado</span>
                </div>
              </div>

              <button
                onClick={() => setIsNextExpenseModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Expense Highlight Box */}
            <div className="p-4 rounded-2xl bg-[#102A43] border border-[#243B55] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-base font-extrabold text-white uppercase tracking-wider block text-nowrap truncate">
                  {nextExpense.categoryName || 'Grupo de Gasto'}
                </span>
                <span className="text-xs text-slate-300 mt-1 block">
                  Fecha estimada: <strong className="text-white">{nextExpense.dateStr}</strong>
                </span>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs font-semibold text-slate-400 block">Monto a pagar:</span>
                <span className="text-xl font-black text-rose-400 font-mono block">
                  {formatCOP(nextExpense.amount)}
                </span>
                <span className="text-[10px] font-bold text-rose-300 block mt-0.5">
                  {nextExpense.isOverdue
                    ? `⚠️ Vencido (hace ${nextExpense.daysOverdue}d)`
                    : nextExpense.daysRemaining === 0
                    ? '★ ¡Vence Hoy!'
                    : nextExpense.daysRemaining === 1
                    ? '¡Vence Mañana!'
                    : `Faltan ${nextExpense.daysRemaining} días`}
                </span>
              </div>
            </div>

            {/* Actions according to date logic */}
            <div className="p-3.5 rounded-2xl bg-[#102A43]/50 border border-[#243B55] space-y-3">
              {nextExpense.isOverdue ? (
                <div className="space-y-2.5">
                  <div className="text-xs text-amber-300 flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>
                      La fecha límite ({nextExpense.dateStr}) ya pasó sin confirmación de pago.
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Si aún no has pagado, puedes agregar días de espera para recalcular tu gasto diario, o posponerlo al siguiente mes:
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {nextExpense.id && (
                      <>
                        <button
                          type="button"
                          disabled={Boolean(actionLoadingId)}
                          onClick={async () => {
                            await handlePostpone(nextExpense.id!, 'ADD_DAYS', 3);
                            setIsNextExpenseModalOpen(false);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#102A43] hover:bg-[#1E3A5F] border border-[#243B55] text-xs font-bold text-cyan-300 transition-colors"
                        >
                          +3 Días de espera
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(actionLoadingId)}
                          onClick={async () => {
                            await handlePostpone(nextExpense.id!, 'ADD_DAYS', 5);
                            setIsNextExpenseModalOpen(false);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#102A43] hover:bg-[#1E3A5F] border border-[#243B55] text-xs font-bold text-cyan-300 transition-colors"
                        >
                          +5 Días
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(actionLoadingId)}
                          onClick={async () => {
                            await handlePostpone(nextExpense.id!, 'NEXT_MONTH');
                            setIsNextExpenseModalOpen(false);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#102A43] hover:bg-[#1E3A5F] border border-[#243B55] text-xs font-bold text-amber-300 transition-colors"
                        >
                          Siguiente mes
                        </button>
                      </>
                    )}

                    {onRegisterExpense && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsNextExpenseModalOpen(false);
                          onRegisterExpense({
                            categoryId: nextExpense.categoryId,
                            amount: nextExpense.amount,
                            notes: nextExpense.name,
                            type: 'EXPENSE',
                          });
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md ml-auto"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Registrar pago</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : nextExpense.daysRemaining === 0 ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-white block">
                      ★ Hoy es la fecha de vencimiento
                    </span>
                    <span className="text-[11px] text-slate-300 block mt-0.5">
                      Confirma el pago para deducirlo de tus fondos y presupuesto.
                    </span>
                  </div>

                  {onRegisterExpense && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsNextExpenseModalOpen(false);
                        onRegisterExpense({
                          categoryId: nextExpense.categoryId,
                          amount: nextExpense.amount,
                          notes: nextExpense.name,
                          type: 'EXPENSE',
                        });
                      }}
                      className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all whitespace-nowrap"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Registrar pago</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Faltan {nextExpense.daysRemaining} días ({nextExpense.dateStr})
                    </span>
                    <span className="text-[11px] text-slate-300 block mt-0.5">
                      ¿Deseas pagar este compromiso con anticipación?
                    </span>
                  </div>

                  {onRegisterExpense && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsNextExpenseModalOpen(false);
                        onRegisterExpense({
                          categoryId: nextExpense.categoryId,
                          amount: nextExpense.amount,
                          notes: nextExpense.name,
                          type: 'EXPENSE',
                        });
                      }}
                      className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all whitespace-nowrap"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Pago anticipado</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expense Feasibility Simulator Modal */}
      <ExpenseSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        currentCash={summary.current_cash}
        daysRemaining={daysRemaining}
        currentSafeDaily={safeDaily}
        pendingCommitments={pendingCommitments}
        nextIncomeLabel={nextIncome ? `${nextIncome.name} (${nextIncome.label})` : undefined}
        onProceedToRegister={(data) => {
          if (onRegisterExpense) {
            onRegisterExpense({
              amount: data.amount,
              notes: data.notes,
              type: 'EXPENSE',
            });
          }
        }}
      />
    </div>
  );
}

