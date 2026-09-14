'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { QuickExpenseModal } from '@/components/expenses/QuickExpenseModal';
import { MovementDetailModal, Movement } from '@/components/expenses/MovementDetailModal';
import { formatCOP } from '@/lib/utils';
import { formatShortDateSpanish, getTodayColombiaDate } from '@/lib/dayjs';
import { 
  useUser, 
  useExpenses, 
  useCategories, 
  usePaymentMethods, 
  useInvalidateFinance 
} from '@/lib/api-hooks';
import { 
  ArrowLeft, 
  Search, 
  PlusCircle, 
  Trash2, 
  Receipt,
  Calendar,
  Layers,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowRightLeft,
  ArrowDownRight,
  ArrowUpRight,
  ArrowRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

import { Button, Badge } from '@/components/ui';

export default function ExpensesPage() {
  const router = useRouter();
  const invalidateFinance = useInvalidateFinance();

  // Filters State
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<'ALL' | 'EXPENSE' | 'INCOME' | 'TRANSFER'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals State
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Reset page to 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMonth, selectedType, selectedCategory, selectedPaymentMethod, searchQuery]);

  // TanStack React Query Hooks with database-level server-side pagination & caching
  const { data: user } = useUser();
  const { data, isLoading: loading } = useExpenses({
    month: selectedMonth,
    type: selectedType,
    categoryId: selectedCategory,
    paymentMethod: selectedPaymentMethod,
    search: searchQuery,
    page: currentPage,
    pageSize,
  });
  const { data: categories = [] } = useCategories();
  const { data: paymentMethods = [] } = usePaymentMethods();

  const expenses = data?.expenses || [];
  const pagination = data?.pagination || { total: 0, page: 1, pageSize: 15, totalPages: 1 };
  const summary = data?.summary || { total_income: 0, total_expense: 0, net_balance: 0 };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('¿Deseas eliminar este movimiento? Tu fondo disponible se recalculará automáticamente.')) {
      return;
    }

    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Movimiento eliminado y fondo actualizado');
        invalidateFinance();
      } else {
        toast.error('Error al eliminar el movimiento');
      }
    } catch {
      toast.error('Error de conexión');
    }
  };

  const paginatedExpenses = expenses;
  const totalItems = pagination.total;
  const totalPages = pagination.totalPages;
  const safeCurrentPage = pagination.page;

  // Totals for filtered view directly from database aggregates
  const totalExpensesAmount = summary.total_expense;
  const totalIncomesAmount = summary.total_income;
  const netBalance = summary.net_balance;

  // Generate quick month pills (current and previous 2 months in Colombia)
  const currentMonthISO = getTodayColombiaDate().slice(0, 7);
  const prevMonth1 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 7);
  const prevMonth2 = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 7);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header user={user} onUserUpdate={invalidateFinance} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-5 space-y-4">
        <div>
          <h1 className="text-xl font-black text-foreground">Libro de Movimientos</h1>
          <p className="text-xs text-slate-400">Historial completo de entradas y salidas de dinero</p>
        </div>

        {/* 1. HORIZONTAL MONTH FILTER BAR */}
        <div className="bg-surface border border-border p-2 rounded-2xl">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none whitespace-nowrap">
            <div className="flex items-center gap-1 text-xs text-slate-400 font-semibold px-2 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span className="whitespace-nowrap">Período:</span>
            </div>

            {/* Pill: Todo el Historial */}
            <button
              onClick={() => setSelectedMonth('ALL')}
              className={`text-xs px-3.5 py-1.5 rounded-xl border font-bold transition-all whitespace-nowrap shrink-0 ${
                selectedMonth === 'ALL'
                  ? 'bg-primary text-secondary-foreground border-primary shadow-sm'
                  : 'bg-surface-elevated text-slate-300 border-border hover:text-foreground'
              }`}
            >
              Todo el Historial
            </button>

            {/* Quick Pills for Recent Months */}
            <button
              onClick={() => setSelectedMonth(currentMonthISO)}
              className={`text-xs px-3 py-1.5 rounded-xl border font-semibold transition-all whitespace-nowrap shrink-0 ${
                selectedMonth === currentMonthISO
                  ? 'bg-primary text-secondary-foreground border-primary font-bold'
                  : 'bg-surface-elevated text-slate-300 border-border hover:text-foreground'
              }`}
            >
              Este Mes
            </button>

            <button
              onClick={() => setSelectedMonth(prevMonth1)}
              className={`text-xs px-3 py-1.5 rounded-xl border font-semibold transition-all whitespace-nowrap shrink-0 ${
                selectedMonth === prevMonth1
                  ? 'bg-primary text-secondary-foreground border-primary font-bold'
                  : 'bg-surface-elevated text-slate-300 border-border hover:text-foreground'
              }`}
            >
              Mes Anterior
            </button>

            {/* Custom Month Picker */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-border shrink-0">
              <span className="text-[11px] text-slate-400 whitespace-nowrap">Otro mes:</span>
              <input
                type="month"
                value={selectedMonth === 'ALL' ? '' : selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value || 'ALL')}
                className="bg-surface-elevated border border-border text-foreground text-xs px-2.5 py-1 rounded-xl focus:outline-none focus:border-primary shrink-0"
              />
            </div>
          </div>
        </div>

        {/* 2. SEARCH + TYPE SWITCHER */}
        <div className="space-y-2.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por concepto, grupo, tarjeta o valor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface border border-border text-foreground text-xs pl-9 pr-3 py-2.5 rounded-xl focus:border-primary focus:outline-none placeholder:text-slate-500"
              />
            </div>

            {/* Type Switcher */}
            <div className="flex items-center gap-1.5 bg-surface border border-border p-1.5 rounded-xl overflow-x-auto scrollbar-none whitespace-nowrap shrink-0">
              <button
                onClick={() => setSelectedType('ALL')}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  selectedType === 'ALL'
                    ? 'bg-primary text-secondary-foreground shadow'
                    : 'text-slate-400 hover:text-foreground'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Todos ({expenses.length})</span>
              </button>
              <button
                onClick={() => setSelectedType('EXPENSE')}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  selectedType === 'EXPENSE'
                    ? 'bg-rose-500 text-white shadow'
                    : 'text-slate-400 hover:text-rose-400'
                }`}
              >
                <ArrowDownCircle className="w-3.5 h-3.5" />
                <span>Egresos</span>
              </button>
              <button
                onClick={() => setSelectedType('INCOME')}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  selectedType === 'INCOME'
                    ? 'bg-emerald-500 text-secondary-foreground shadow'
                    : 'text-slate-400 hover:text-emerald-400'
                }`}
              >
                <ArrowUpCircle className="w-3.5 h-3.5" />
                <span>Ingresos</span>
              </button>
              <button
                onClick={() => setSelectedType('TRANSFER')}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  selectedType === 'TRANSFER'
                    ? 'bg-accent text-accent-foreground shadow'
                    : 'text-slate-400 hover:text-accent'
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Transferencias</span>
              </button>
            </div>
          </div>

          {/* 3. CATEGORIES CHIPS */}
          <div className="bg-surface border border-border p-2 rounded-2xl">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none whitespace-nowrap">
              <div className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold px-1 shrink-0">
                <Layers className="w-3 h-3 text-primary" />
                <span>Grupos:</span>
              </div>
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`text-xs px-3 py-1.5 rounded-xl whitespace-nowrap shrink-0 border font-medium transition-colors ${
                  selectedCategory === 'ALL'
                    ? 'bg-primary text-secondary-foreground border-primary font-bold'
                    : 'bg-surface-elevated text-slate-300 border-border'
                }`}
              >
                Todos los grupos
              </button>
              {categories.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`text-xs px-3 py-1.5 rounded-xl whitespace-nowrap shrink-0 border font-medium transition-colors flex items-center gap-1.5 ${
                    selectedCategory === c.id
                      ? 'bg-primary text-secondary-foreground border-primary font-bold'
                      : 'bg-surface-elevated text-slate-300 border-border'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: c.color }}
                  />
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 4. PAYMENT METHODS CHIPS */}
          <div className="bg-surface border border-border p-2 rounded-2xl">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none whitespace-nowrap">
              <div className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold px-1 shrink-0">
                <Wallet className="w-3 h-3 text-accent" />
                <span>Medios:</span>
              </div>
              <button
                onClick={() => setSelectedPaymentMethod('ALL')}
                className={`text-xs px-3 py-1.5 rounded-xl whitespace-nowrap shrink-0 border font-medium transition-colors ${
                  selectedPaymentMethod === 'ALL'
                    ? 'bg-accent/20 text-accent border-accent/50 font-bold'
                    : 'bg-surface-elevated text-slate-400 border-border'
                }`}
              >
                Todos los medios
              </button>
              {paymentMethods.map((pm: any) => (
                <button
                  key={pm.id}
                  onClick={() => setSelectedPaymentMethod(pm.name)}
                  className={`text-xs px-3 py-1.5 rounded-xl whitespace-nowrap shrink-0 border font-medium transition-colors flex items-center gap-1.5 ${
                    selectedPaymentMethod === pm.name
                      ? 'bg-accent/20 text-accent border-accent/50 font-bold'
                      : 'bg-surface-elevated text-slate-400 border-border'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: pm.color || 'var(--primary)' }}
                  />
                  <span>{pm.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Breakdown Card */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <span className="block text-[10px] sm:text-[11px] font-semibold text-slate-400 whitespace-nowrap">Ingresos Filtrados</span>
            <span className="text-xs sm:text-sm font-black text-emerald-400 whitespace-nowrap">
              +{formatCOP(totalIncomesAmount)}
            </span>
          </div>
          <div className="border-x border-border px-2">
            <span className="block text-[10px] sm:text-[11px] font-semibold text-slate-400 whitespace-nowrap">Egresos Filtrados</span>
            <span className="text-xs sm:text-sm font-black text-rose-400 whitespace-nowrap">
              -{formatCOP(totalExpensesAmount)}
            </span>
          </div>
          <div>
            <span className="block text-[10px] sm:text-[11px] font-semibold text-slate-400 whitespace-nowrap">Balance Neto</span>
            <span className={`text-xs sm:text-sm font-black whitespace-nowrap ${netBalance >= 0 ? 'text-primary' : 'text-rose-400'}`}>
              {netBalance >= 0 ? `+${formatCOP(netBalance)}` : formatCOP(netBalance)}
            </span>
          </div>
        </div>

        {/* Movements Table / Cards */}
        <div>
          {totalItems === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30 text-primary" />
              <p className="text-xs">No hay movimientos que coincidan con estos filtros.</p>
              {selectedMonth !== 'ALL' && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3 text-primary"
                  onClick={() => setSelectedMonth('ALL')}
                >
                  Ver Todo el Historial (todos los meses)
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {paginatedExpenses.map((exp: any) => {
                const isIncome = exp.type === 'INCOME';
                const isTransfer = exp.type === 'TRANSFER';
                return (
                  <div
                    key={exp.id}
                    onClick={() => setSelectedMovement(exp)}
                    className="bg-surface-elevated hover:bg-surface-elevated/80 border border-border hover:border-primary/50 rounded-2xl p-3.5 flex items-center justify-between gap-3 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                          isTransfer
                            ? 'bg-accent/15 text-accent border border-accent/30'
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
                          <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                            {isTransfer
                              ? 'Transferencia entre Cuentas'
                              : isIncome
                              ? (exp.category_name || 'Ingreso de Dinero')
                              : exp.category_name}
                          </span>
                          {isTransfer ? (
                            <Badge variant="accent" size="sm" className="whitespace-nowrap shrink-0 flex items-center gap-1">
                              <span>{exp.payment_method}</span>
                              <ArrowRight className="w-3 h-3 text-accent shrink-0" />
                              <span>{exp.destination_method || 'Efectivo'}</span>
                            </Badge>
                          ) : (
                            <Badge
                              variant={isIncome ? 'success' : 'secondary'}
                              size="sm"
                              className="whitespace-nowrap shrink-0 flex items-center gap-1"
                            >
                              {isIncome ? (
                                <ArrowUpRight className="w-3 h-3 text-emerald-400 shrink-0" />
                              ) : (
                                <ArrowDownRight className="w-3 h-3 text-rose-400 shrink-0" />
                              )}
                              <span>{exp.payment_method || (isIncome ? 'Fondo' : 'Efectivo')}</span>
                            </Badge>
                          )}
                          {!isIncome && !isTransfer && exp.is_fixed === 1 && (
                            <Badge variant="accent" size="sm" className="uppercase tracking-wider">
                              Fijo
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {exp.notes ? <span className="text-slate-200">{exp.notes} • </span> : null}
                          <span className="text-slate-300 font-medium whitespace-nowrap">{formatShortDateSpanish(exp.date)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <span className={`text-sm sm:text-base font-black whitespace-nowrap shrink-0 ${
                        isTransfer ? 'text-accent' : isIncome ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {isTransfer ? formatCOP(exp.amount) : isIncome ? `+${formatCOP(exp.amount)}` : `-${formatCOP(exp.amount)}`}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteExpense(exp.id);
                        }}
                        className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                        title="Eliminar movimiento y actualizar saldo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}

              {/* Pagination Controls */}
              {totalItems > 0 && (
                <div className="mt-4 pt-3.5 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="text-slate-400 text-[11px] sm:text-xs">
                    Mostrando{' '}
                    <span className="font-bold text-foreground">
                      {(safeCurrentPage - 1) * pageSize + 1}
                    </span>
                    {' '}-{' '}
                    <span className="font-bold text-foreground">
                      {Math.min(safeCurrentPage * pageSize, totalItems)}
                    </span>
                    {' '}de{' '}
                    <span className="font-bold text-primary">{totalItems}</span> movimientos
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={safeCurrentPage <= 1}
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Anterior</span>
                    </Button>

                    <div className="px-3 py-1.5 rounded-xl bg-surface border border-border text-[11px] font-bold text-foreground whitespace-nowrap">
                      Página <span className="text-accent">{safeCurrentPage}</span> de <span className="text-slate-300">{totalPages}</span>
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={safeCurrentPage >= totalPages}
                    >
                      <span>Siguiente</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <BottomNav
        onOpenQuickExpense={() => setIsQuickExpenseOpen(true)}
        userRole={user?.role}
      />

      <QuickExpenseModal
        isOpen={isQuickExpenseOpen}
        onClose={() => setIsQuickExpenseOpen(false)}
        onExpenseAdded={invalidateFinance}
        categories={categories}
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
