'use client';

import React, { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { FinancialOverviewCard } from '@/components/stats/FinancialOverviewCard';
import { QuickExpenseModal } from '@/components/expenses/QuickExpenseModal';
import { MovementDetailModal } from '@/components/expenses/MovementDetailModal';
import { formatCOP } from '@/lib/utils';
import { formatShortDateSpanish } from '@/lib/dayjs';
import { 
  useUser, 
  useStats, 
  useRecentExpenses, 
  useCategories, 
  useInvalidateFinance 
} from '@/lib/api-hooks';
import { 
  AlertTriangle, 
  ArrowRight, 
  PlusCircle, 
  Receipt, 
  Trash2, 
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowRightLeft,
  ArrowDownRight,
  ArrowUpRight,
  Layers
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function DashboardPage() {
  const invalidateFinance = useInvalidateFinance();

  // TanStack React Query Hooks with automatic caching
  const { data: user, isLoading: loadingUser } = useUser();
  const { data: stats, isLoading: loadingStats } = useStats();
  const { data: categories = [] } = useCategories();
  const { data: recentExpenses = [], isLoading: loadingExpenses } = useRecentExpenses(5);

  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);
  const [prefillExpense, setPrefillExpense] = useState<{ categoryId?: string; amount?: number; notes?: string; type?: 'EXPENSE' | 'INCOME' | 'TRANSFER' } | null>(null);
  const [selectedMovement, setSelectedMovement] = useState<any | null>(null);

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('¿Eliminar este movimiento y actualizar el fondo disponible?')) return;
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Movimiento eliminado y saldo actualizado');
        invalidateFinance();
      } else {
        toast.error('Error al eliminar');
      }
    } catch {
      toast.error('Error de conexión');
    }
  };

  const loading = loadingUser || loadingStats || loadingExpenses;

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-[#070F1E] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#00ADB5]/30 border-t-[#00ADB5] rounded-full animate-spin" />
        <p className="text-xs text-slate-400 mt-3 font-semibold tracking-wider uppercase">Cargando tus finanzas...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070F1E] flex flex-col">
      <Header user={user} onUserUpdate={invalidateFinance} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-5 space-y-5">
        {/* Welcome & Quick Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-linear-to-r from-[#0B192C] to-[#102A43] border border-[#1E3A5F] rounded-3xl p-5 shadow-xl">
          <div>
            <span className="text-[11px] font-bold text-[#00ADB5] uppercase tracking-wider whitespace-nowrap">
              Diagnóstico Financiero en Vivo
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5">
              Hola, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-md">
              Mantén el registro al instante para erradicar las fugas y llegar con dinero al fin de mes.
            </p>
          </div>
        </div>

        {/* Executive 6-KPI Overview Grid */}
        {stats?.summary && (
          <FinancialOverviewCard
            summary={stats.summary}
            health={stats.health}
            cashFlow={stats.cashFlow}
            onRefresh={invalidateFinance}
            onRegisterExpense={(data) => {
              setPrefillExpense(data);
              setIsQuickExpenseOpen(true);
            }}
          />
        )}

        {/* Recent Expenses List (Strictly last 5) */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#00ADB5]/20 text-[#00ADB5] flex items-center justify-center shrink-0">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white truncate">Últimos Movimientos</h3>
                <span className="text-[10px] text-slate-400 block leading-tight">Últimos 5 registros</span>
              </div>
            </div>
            <Link
              href="/expenses"
              className="text-xs text-[#00ADB5] hover:underline flex items-center gap-1 font-semibold whitespace-nowrap shrink-0"
            >
              <span>Todos</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {recentExpenses.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#00ADB5]" />
              <p className="text-xs">Aún no has registrado ningún movimiento.</p>
              <button
                onClick={() => {
                  setPrefillExpense(null);
                  setIsQuickExpenseOpen(true);
                }}
                className="mt-3 text-xs text-[#00ADB5] font-bold underline"
              >
                Registrar el primer movimiento ahora
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentExpenses.slice(0, 5).map((exp: any) => {
                const isIncome = exp.type === 'INCOME';
                const isTransfer = exp.type === 'TRANSFER';
                return (
                  <div
                    key={exp.id}
                    onClick={() => setSelectedMovement(exp)}
                    className="bg-[#102A43] hover:bg-[#152E4D] border border-[#243B55] hover:border-[#00ADB5]/50 rounded-2xl p-3 flex items-center justify-between gap-3 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                          isTransfer
                            ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                            : isIncome
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {isTransfer ? (
                          <ArrowRightLeft className="w-4 h-4" />
                        ) : isIncome ? (
                          <ArrowUpCircle className="w-4 h-4" />
                        ) : (
                          <ArrowDownCircle className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white group-hover:text-[#00ADB5] transition-colors truncate">
                            {isTransfer
                              ? 'Transferencia entre Cuentas'
                              : isIncome
                              ? (exp.category_name || 'Ingreso de Dinero')
                              : exp.category_name}
                          </span>
                          {/* Payment method badge */}
                          {isTransfer ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-md border font-semibold bg-cyan-950/50 text-cyan-300 border-cyan-800/50 whitespace-nowrap shrink-0 flex items-center gap-1">
                              <span>{exp.payment_method}</span>
                              <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0" />
                              <span>{exp.destination_method || 'Efectivo'}</span>
                            </span>
                          ) : (
                            <span className={`text-[10px] px-2 py-0.5 rounded-md border font-medium whitespace-nowrap shrink-0 flex items-center gap-1 ${
                              isIncome 
                                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40' 
                                : 'bg-[#0B192C] text-slate-300 border-[#243B55]'
                            }`}>
                              {isIncome ? (
                                <ArrowUpRight className="w-3 h-3 text-emerald-400 shrink-0" />
                              ) : (
                                <ArrowDownRight className="w-3 h-3 text-rose-400 shrink-0" />
                              )}
                              <span>{exp.payment_method || (isIncome ? 'Fondo' : 'Efectivo')}</span>
                            </span>
                          )}
                          {!isIncome && !isTransfer && exp.is_fixed === 1 && (
                            <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider whitespace-nowrap shrink-0">
                              Fijo
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {exp.notes ? <span className="text-slate-300">{exp.notes} • </span> : null}
                          <span className="text-slate-300 font-medium whitespace-nowrap">{formatShortDateSpanish(exp.date)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <span className={`text-sm sm:text-base font-extrabold whitespace-nowrap shrink-0 ${
                        isTransfer ? 'text-cyan-400' : isIncome ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {isTransfer ? formatCOP(exp.amount) : isIncome ? `+${formatCOP(exp.amount)}` : `-${formatCOP(exp.amount)}`}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteExpense(exp.id);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                        title="Eliminar movimiento y actualizar saldo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <BottomNav
        onOpenQuickExpense={() => {
          setPrefillExpense(null);
          setIsQuickExpenseOpen(true);
        }}
        userRole={user?.role}
      />

      <QuickExpenseModal
        isOpen={isQuickExpenseOpen}
        onClose={() => {
          setIsQuickExpenseOpen(false);
          setPrefillExpense(null);
        }}
        onExpenseAdded={invalidateFinance}
        categories={categories}
        initialData={prefillExpense}
      />

      <MovementDetailModal
        movement={selectedMovement}
        isOpen={!!selectedMovement}
        onClose={() => setSelectedMovement(null)}
        onMovementDeleted={invalidateFinance}
      />
    </div>
  );
}
