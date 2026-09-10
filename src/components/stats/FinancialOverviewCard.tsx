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
  Info
} from 'lucide-react';
import Link from 'next/link';
import { formatCOP } from '@/lib/utils';
import { toast } from 'sonner';

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

interface CashFlowData {
  nextIncome?: {
    name: string;
    amount: number;
    dateStr: string;
    daysRemaining: number;
    label: string;
    categoryName?: string;
  } | null;
  upcomingCommitments?: Array<{
    id?: string;
    categoryId: string;
    name: string;
    amount: number;
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
  onRegisterExpense?: (data: { categoryId?: string; amount?: number; notes?: string }) => void;
}

export function FinancialOverviewCard({ 
  summary, 
  health, 
  cashFlow, 
  onRefresh, 
  onRegisterExpense 
}: FinancialOverviewCardProps) {
  const [isNextIncomeModalOpen, setIsNextIncomeModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const safeDaily = health?.safeDailySpend ?? 0;
  const pendingCommitments = cashFlow?.totalPendingCommitments ?? health?.totalPendingCommitments ?? 0;
  const freeCash = cashFlow?.freeCashForPeriod ?? Math.max(0, summary.current_cash - pendingCommitments);
  const nextIncome = cashFlow?.nextIncome;
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
        {/* 1. Dinero que puedo gastar al día */}
        <div className="bg-[#102A43] border border-[#00ADB5]/40 hover:border-[#00ADB5] rounded-2xl p-3 sm:p-3.5 shadow-lg transition-all relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-300">Gasto Diario Seguro</span>
            <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00ADB5]" />
          </div>
          <p className="text-sm sm:text-base font-black text-white truncate">
            {formatCOP(safeDaily)}
          </p>
          <span className="text-[9px] sm:text-[10px] text-[#00ADB5] block mt-0.5 font-medium truncate" title="Límite máximo seguro por día hasta el próximo ingreso">
            Límite máximo / día
          </span>
        </div>

        {/* 2. Dinero que queda (Cálculo de fechas) */}
        <div className="bg-[#102A43] border border-[#243B55] hover:border-cyan-500/40 rounded-2xl p-3 sm:p-3.5 shadow-lg transition-all">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-300">Fondo Libre Real</span>
            <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
          </div>
          <p className="text-sm sm:text-base font-black text-cyan-300 truncate">
            {formatCOP(freeCash)}
          </p>
          <span className="text-[9px] sm:text-[10px] text-slate-400 block mt-0.5 truncate" title={`Fondo total: ${formatCOP(summary.current_cash)} - Fijos pendientes: ${formatCOP(pendingCommitments)}`}>
            {pendingCommitments > 0 ? `-${formatCOP(pendingCommitments)} fijos prev.` : 'Sin pagos fijos pend.'}
          </span>
        </div>

        {/* 3. Días faltantes para el próximo ingreso (Interactivo con modal o redirección) */}
        {nextIncome ? (
          <div 
            onClick={() => setIsNextIncomeModalOpen(true)}
            className="bg-[#102A43] border border-[#243B55] hover:border-[#06B6D4] rounded-2xl p-3 sm:p-3.5 shadow-lg transition-all cursor-pointer group active:scale-[0.98]"
            title="Haz clic para ver el desglose y compromisos de este cobro"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-300 flex items-center gap-1">
                <span>Próximo Ingreso</span>
                <Info className="w-3 h-3 text-[#06B6D4] opacity-70 group-hover:opacity-100" />
              </span>
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#06B6D4]" />
            </div>
            <p className="text-sm sm:text-base font-black text-white truncate">
              {daysRemaining === 1 ? '¡Mañana / Hoy!' : `En ${daysRemaining} días`}
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
            +{formatCOP(monthlyIncomeWithDates)}
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
            -{formatCOP(summary.total_spent)}
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
            {isPositiveBalance ? `+${formatCOP(projectedNetBalance)}` : formatCOP(projectedNetBalance)}
          </p>
          <span className="text-[9px] sm:text-[10px] text-slate-400 block mt-0.5 truncate" title="Ingresos con fecha menos los gastos del mes ya ejecutados y los egresos fijos pendientes por registrar">
            {isPositiveBalance ? 'Ahorro proyectado neto' : 'Déficit proyectado mes'}
          </span>
        </div>
      </div>

      {/* OVERDUE COMMITMENTS BANNER: Compromisos vencidos sin movimiento registrado */}
      {overdueCommitments.length > 0 && (
        <div className="bg-[#102A43] border border-amber-500/50 rounded-2xl p-4 shadow-xl space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                  <span>Compromisos Pendientes Vencidos</span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-extrabold font-mono">
                    {overdueCommitments.length} sin registrar
                  </span>
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Llegó la fecha estimada pero no encontramos movimientos en el grupo. ¿Deseas añadir días de espera o programarlos para el próximo mes?
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            {overdueCommitments.map((item) => (
              <div 
                key={item.id}
                className="bg-[#0B192C] border border-[#243B55] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white truncate">{item.name}</span>
                    <span className="text-xs font-black text-rose-400 font-mono shrink-0">
                      {formatCOP(item.amount)}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Estaba previsto para el <strong className="text-slate-300">Día {item.dueDay || item.dateStr}</strong> (hace {item.daysOverdue} {item.daysOverdue === 1 ? 'día' : 'días'}).
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
                      })}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-extrabold transition-colors flex items-center gap-1 whitespace-nowrap shadow-sm"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Registrar pago</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Detalles del Próximo Ingreso */}
      {isNextIncomeModalOpen && nextIncome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[#0B192C] border border-[#06B6D4] rounded-3xl p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E3A5F]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-[#06B6D4] flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Detalles del Próximo Ingreso</h3>
                  <span className="text-[10px] text-slate-400">Proyección y compromisos asociados</span>
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
                <span className="text-[10px] font-extrabold text-[#06B6D4] uppercase tracking-wider block">
                  {nextIncome.categoryName || 'Fuente de Ingreso'}
                </span>
                <p className="text-base font-black text-white mt-0.5">{nextIncome.name}</p>
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
                  {nextIncome.daysRemaining === 1 ? '¡Llega mañana o muy pronto!' : `Faltan ${nextIncome.daysRemaining} días`}
                </span>
              </div>
            </div>

            {/* Commitments Section */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-white block">
                Compromisos a cubrir antes de este ingreso:
              </span>

              {upcomingCommitments.length === 0 ? (
                <div className="p-3.5 rounded-xl bg-[#102A43]/50 border border-[#243B55] text-xs text-slate-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>¡Excelente! No tienes compromisos fijos pendientes antes de esta fecha.</span>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {upcomingCommitments.map((c, i) => (
                    <div 
                      key={i}
                      className="p-2.5 rounded-xl bg-[#102A43]/70 border border-[#243B55] flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-white block">{c.name}</span>
                        <span className="text-[10px] text-slate-400">
                          Vence el {c.dateStr} ({c.daysUntil === 0 ? 'hoy' : `en ${c.daysUntil} días`})
                        </span>
                      </div>
                      <span className="font-bold text-rose-400 font-mono">
                        {formatCOP(c.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Liquidity breakdown */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1E3A5F]">
              <div className="p-2.5 rounded-xl bg-[#102A43]/50 border border-[#243B55]">
                <span className="text-[9px] text-slate-400 font-bold block">Fondo en Cuentas</span>
                <p className="text-xs font-black text-white mt-0.5">{formatCOP(summary.current_cash)}</p>
              </div>

              <div className="p-2.5 rounded-xl bg-[#102A43]/50 border border-[#243B55]">
                <span className="text-[9px] text-slate-400 font-bold block">Fondo Libre Real</span>
                <p className="text-xs font-black text-cyan-300 mt-0.5">{formatCOP(freeCash)}</p>
              </div>

              <div className="p-2.5 rounded-xl bg-[#102A43]/50 border border-[#243B55]">
                <span className="text-[9px] text-slate-400 font-bold block">Gasto Seguro / Día</span>
                <p className="text-xs font-black text-[#00ADB5] mt-0.5">{formatCOP(safeDaily)}</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsNextIncomeModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#102A43] hover:bg-[#1E3A5F] text-xs font-bold text-white transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

