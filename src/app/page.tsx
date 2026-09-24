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
  Layers,
  HandCoins
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button, Card, Badge } from '@/components/ui';

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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-xs text-foreground/60 mt-3 font-semibold tracking-wider uppercase">Cargando tus finanzas...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header user={user} onUserUpdate={invalidateFinance} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 pt-5 pb-28 sm:pb-32 space-y-5">
        {/* Welcome & Quick Action Header */}
        <Card variant="glass" padding="md" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold text-primary uppercase tracking-wider whitespace-nowrap">
              Diagnóstico Financiero en Vivo
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-foreground mt-0.5">
              Hola, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-xs text-foreground/60 mt-1 max-w-md">
              Mantén el registro al instante para erradicar las fugas y llegar con dinero al fin de mes.
            </p>
          </div>
        </Card>

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
              <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground truncate">Últimos Movimientos</h3>
                <span className="text-[10px] text-foreground/50 block leading-tight">Últimos 5 registros</span>
              </div>
            </div>
            <Link
              href="/expenses"
              className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold whitespace-nowrap shrink-0"
            >
              <span>Todos</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {recentExpenses.length === 0 ? (
            <div className="text-center py-8 text-foreground/50">
              <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30 text-primary" />
              <p className="text-xs">Aún no has registrado ningún movimiento.</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPrefillExpense(null);
                  setIsQuickExpenseOpen(true);
                }}
                className="mt-3 text-primary font-bold underline"
              >
                Registrar el primer movimiento ahora
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentExpenses.slice(0, 5).map((exp: any) => {
                const isTransfer = exp.type === 'TRANSFER';
                const isLoan = exp.type === 'LOAN' || exp.type === 'LOAN_DISBURSEMENT' || exp.type === 'LOAN_PAYMENT' || exp.type === 'LOAN_REPAY' || exp.type === 'LOAN_BORROW';
                const isLoanOut = exp.type === 'LOAN' || exp.type === 'LOAN_DISBURSEMENT' || exp.type === 'LOAN_PAYMENT';
                const isIncome = exp.type === 'INCOME' || exp.type === 'LOAN_REPAY' || exp.type === 'LOAN_BORROW';
                return (
                  <div
                    key={exp.id}
                    onClick={() => setSelectedMovement(exp)}
                    className="bg-surface-elevated hover:bg-surface-elevated/80 border border-border hover:border-primary/50 rounded-2xl p-3 flex items-center justify-between gap-3 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                          isLoan
                            ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                            : isTransfer
                            ? 'bg-accent/15 text-accent border border-accent/30'
                            : isIncome
                            ? 'bg-success/15 text-success border border-success/30'
                            : 'bg-danger/15 text-danger border border-danger/30'
                        }`}
                      >
                        {isLoan ? (
                          <HandCoins className="w-4 h-4" />
                        ) : isTransfer ? (
                          <ArrowRightLeft className="w-4 h-4" />
                        ) : isIncome ? (
                          <ArrowUpCircle className="w-4 h-4" />
                        ) : (
                          <ArrowDownCircle className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                            {isLoan
                              ? (exp.category_name || (isLoanOut ? 'Desembolso de Préstamo' : 'Abono / Retorno de Capital'))
                              : isTransfer
                              ? 'Transferencia entre Cuentas'
                              : isIncome
                              ? (exp.category_name || 'Ingreso de Dinero')
                              : exp.category_name}
                          </span>
                          {/* Payment method badge */}
                          {isLoan ? (
                            <Badge variant="accent" size="sm" className="whitespace-nowrap shrink-0 flex items-center gap-1 bg-purple-500/15 text-purple-300 border-purple-500/30">
                              <HandCoins className="w-3 h-3 text-purple-400 shrink-0" />
                              <span>{exp.payment_method || 'Cuenta'}</span>
                            </Badge>
                          ) : isTransfer ? (
                            <Badge variant="accent" size="sm">
                              <span>{exp.payment_method}</span>
                              <ArrowRight className="w-3 h-3 text-accent shrink-0" />
                              <span>{exp.destination_method || 'Efectivo'}</span>
                            </Badge>
                          ) : (
                            <Badge variant={isIncome ? 'success' : 'secondary'} size="sm">
                              {isIncome ? (
                                <ArrowUpRight className="w-3 h-3 text-success shrink-0" />
                              ) : (
                                <ArrowDownRight className="w-3 h-3 text-danger shrink-0" />
                              )}
                              <span>{exp.payment_method || (isIncome ? 'Fondo' : 'Efectivo')}</span>
                            </Badge>
                          )}
                          {!isIncome && !isTransfer && !isLoan && exp.is_fixed === 1 && (
                            <Badge variant="primary" size="sm">
                              Fijo
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-foreground/50 truncate mt-0.5">
                          {exp.notes ? <span className="text-foreground/80">{exp.notes} • </span> : null}
                          <span className="text-foreground/80 font-medium whitespace-nowrap">{formatShortDateSpanish(exp.date)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <span className={`text-sm sm:text-base font-extrabold whitespace-nowrap shrink-0 ${
                        isLoan
                          ? (isLoanOut ? 'text-purple-400' : 'text-emerald-400')
                          : isTransfer 
                          ? 'text-accent' 
                          : isIncome 
                          ? 'text-success' 
                          : 'text-danger'
                      }`}>
                        {isLoan
                          ? (isLoanOut ? `-${formatCOP(exp.amount)}` : `+${formatCOP(exp.amount)}`)
                          : isTransfer
                          ? formatCOP(exp.amount)
                          : isIncome
                          ? `+${formatCOP(exp.amount)}`
                          : `-${formatCOP(exp.amount)}`}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteExpense(exp.id);
                        }}
                        className="text-foreground/40 hover:text-danger hover:bg-danger/10"
                        title="Eliminar movimiento y actualizar saldo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
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
