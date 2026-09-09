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

  // TanStack React Query Hooks with caching
  const { data: user } = useUser();
  const { data: expenses = [], isLoading: loading } = useExpenses(selectedMonth);
  const { data: categories = [] } = useCategories();
  const { data: paymentMethods = [] } = usePaymentMethods();

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

  // Filter expenses based on selected filters and search
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e: any) => {
      // Type filter
      if (selectedType === 'EXPENSE' && (e.type === 'INCOME' || e.type === 'TRANSFER')) return false;
      if (selectedType === 'INCOME' && e.type !== 'INCOME') return false;
      if (selectedType === 'TRANSFER' && e.type !== 'TRANSFER') return false;

      // Category filter
      if (selectedCategory !== 'ALL' && e.category_id !== selectedCategory) return false;

      // Payment Method filter
      if (selectedPaymentMethod !== 'ALL' && e.payment_method !== selectedPaymentMethod) return false;

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchNotes = e.notes?.toLowerCase().includes(query);
        const matchCat = e.category_name?.toLowerCase().includes(query);
        const matchPay = e.payment_method?.toLowerCase().includes(query);
        const matchAmount = e.amount?.toString().includes(query);
        if (!matchNotes && !matchCat && !matchPay && !matchAmount) return false;
      }

      return true;
    });
  }, [expenses, selectedType, selectedCategory, selectedPaymentMethod, searchQuery]);

  // Totals for filtered view
  const totalExpensesAmount = useMemo(() => {
    return filteredExpenses
      .filter((e: any) => e.type === 'EXPENSE' || !e.type)
      .reduce((acc: number, curr: any) => acc + curr.amount, 0);
  }, [filteredExpenses]);

  const totalIncomesAmount = useMemo(() => {
    return filteredExpenses
      .filter((e: any) => e.type === 'INCOME')
      .reduce((acc: number, curr: any) => acc + curr.amount, 0);
  }, [filteredExpenses]);

  const netBalance = totalIncomesAmount - totalExpensesAmount;

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Reset page to 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMonth, selectedType, selectedCategory, selectedPaymentMethod, searchQuery]);

  const totalItems = filteredExpenses.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedExpenses = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredExpenses.slice(start, start + pageSize);
  }, [filteredExpenses, safeCurrentPage, pageSize]);

  // Generate quick month pills (current and previous 2 months in Colombia)
  const currentMonthISO = getTodayColombiaDate().slice(0, 7);
  const prevMonth1 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 7);
  const prevMonth2 = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 7);

  return (
    <div className="min-h-screen bg-[#070F1E] flex flex-col">
      <Header user={user} onUserUpdate={invalidateFinance} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-5 space-y-4">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0B192C] border border-[#1E3A5F] rounded-3xl p-5 shadow-xl">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-[#102A43] border border-[#243B55] text-slate-400 hover:text-white transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-black text-white">Libro de Movimientos</h1>
              <p className="text-xs text-slate-400">Historial completo de entradas y salidas de dinero</p>
            </div>
          </div>

          <button
            onClick={() => setIsQuickExpenseOpen(true)}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#00ADB5] to-[#06B6D4] text-[#0B192C] font-extrabold text-xs shadow-md shadow-[#00ADB5]/20 flex items-center gap-1.5 self-start sm:self-center hover:opacity-95 active:scale-95 transition-all whitespace-nowrap shrink-0"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5px]" />
            <span>+ Nuevo Movimiento</span>
          </button>
        </div>

        {/* 1. HORIZONTAL MONTH FILTER BAR (Never breaks downwards) */}
        <div className="bg-[#0B192C] border border-[#1E3A5F] p-2 rounded-2xl">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none whitespace-nowrap">
            <div className="flex items-center gap-1 text-xs text-slate-400 font-semibold px-2 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-[#00ADB5]" />
              <span className="whitespace-nowrap">Período:</span>
            </div>

            {/* Pill: Todo el Historial */}
            <button
              onClick={() => setSelectedMonth('ALL')}
              className={`text-xs px-3.5 py-1.5 rounded-xl border font-bold transition-all whitespace-nowrap shrink-0 ${
                selectedMonth === 'ALL'
                  ? 'bg-[#00ADB5] text-[#0B192C] border-[#00ADB5] shadow-sm'
                  : 'bg-[#102A43] text-slate-300 border-[#243B55] hover:text-white'
              }`}
            >
              Todo el Historial
            </button>

            {/* Quick Pills for Recent Months */}
            <button
              onClick={() => setSelectedMonth(currentMonthISO)}
              className={`text-xs px-3 py-1.5 rounded-xl border font-semibold transition-all whitespace-nowrap shrink-0 ${
                selectedMonth === currentMonthISO
                  ? 'bg-[#00ADB5] text-[#0B192C] border-[#00ADB5] font-bold'
                  : 'bg-[#102A43] text-slate-300 border-[#243B55] hover:text-white'
              }`}
            >
              Este Mes
            </button>

            <button
              onClick={() => setSelectedMonth(prevMonth1)}
              className={`text-xs px-3 py-1.5 rounded-xl border font-semibold transition-all whitespace-nowrap shrink-0 ${
                selectedMonth === prevMonth1
                  ? 'bg-[#00ADB5] text-[#0B192C] border-[#00ADB5] font-bold'
                  : 'bg-[#102A43] text-slate-300 border-[#243B55] hover:text-white'
              }`}
            >
              Mes Anterior
            </button>

            {/* Custom Month Picker */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-[#1E3A5F] shrink-0">
              <span className="text-[11px] text-slate-400 whitespace-nowrap">Otro mes:</span>
              <input
                type="month"
                value={selectedMonth === 'ALL' ? '' : selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value || 'ALL')}
                className="bg-[#102A43] border border-[#243B55] text-white text-xs px-2.5 py-1 rounded-xl focus:outline-none focus:border-[#00ADB5] shrink-0"
              />
            </div>
          </div>
        </div>

        {/* 2. SEARCH + TYPE SWITCHER */}
        <div className="space-y-2.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por concepto, grupo, tarjeta o valor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0B192C] border border-[#1E3A5F] text-white text-xs pl-9 pr-3 py-2.5 rounded-xl focus:border-[#00ADB5] focus:outline-none"
              />
            </div>

            {/* Type Switcher (All / Expenses / Incomes) with Horizontal Scroll */}
            <div className="flex items-center gap-1.5 bg-[#0B192C] border border-[#1E3A5F] p-1.5 rounded-xl overflow-x-auto scrollbar-none whitespace-nowrap shrink-0">
              <button
                onClick={() => setSelectedType('ALL')}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  selectedType === 'ALL'
                    ? 'bg-gradient-to-r from-[#00ADB5] to-[#06B6D4] text-[#0B192C] shadow'
                    : 'text-slate-400 hover:text-white'
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
                    ? 'bg-emerald-500 text-[#0B192C] shadow'
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
                    ? 'bg-cyan-500 text-[#0B192C] shadow'
                    : 'text-slate-400 hover:text-cyan-400'
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Transferencias</span>
              </button>
            </div>
          </div>

          {/* 3. CATEGORIES CHIPS (Horizontal Scroll) */}
          <div className="bg-[#0B192C] border border-[#1E3A5F] p-2 rounded-2xl">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none whitespace-nowrap">
              <div className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold px-1 shrink-0">
                <Layers className="w-3 h-3 text-[#00ADB5]" />
                <span>Grupos:</span>
              </div>
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`text-xs px-3 py-1.5 rounded-xl whitespace-nowrap shrink-0 border font-medium transition-colors ${
                  selectedCategory === 'ALL'
                    ? 'bg-[#00ADB5] text-[#0B192C] border-[#00ADB5] font-bold'
                    : 'bg-[#102A43] text-slate-300 border-[#243B55]'
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
                      ? 'bg-[#00ADB5] text-[#0B192C] border-[#00ADB5] font-bold'
                      : 'bg-[#102A43] text-slate-300 border-[#243B55]'
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

          {/* 4. PAYMENT METHODS CHIPS (Horizontal Scroll) */}
          <div className="bg-[#0B192C] border border-[#1E3A5F] p-2 rounded-2xl">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none whitespace-nowrap">
              <div className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold px-1 shrink-0">
                <Wallet className="w-3 h-3 text-cyan-400" />
                <span>Medios:</span>
              </div>
              <button
                onClick={() => setSelectedPaymentMethod('ALL')}
                className={`text-xs px-3 py-1.5 rounded-xl whitespace-nowrap shrink-0 border font-medium transition-colors ${
                  selectedPaymentMethod === 'ALL'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                    : 'bg-[#102A43] text-slate-400 border-[#243B55]'
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
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                      : 'bg-[#102A43] text-slate-400 border-[#243B55]'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: pm.color || '#00ADB5' }}
                  />
                  <span>{pm.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Breakdown Card */}
        <div className="bg-[#102A43] border border-[#243B55] rounded-2xl p-4 grid grid-cols-3 gap-2 text-center shadow-md">
          <div>
            <span className="block text-[10px] sm:text-[11px] font-semibold text-slate-400 whitespace-nowrap">Ingresos Filtrados</span>
            <span className="text-xs sm:text-sm font-black text-emerald-400 whitespace-nowrap">
              +{formatCOP(totalIncomesAmount)}
            </span>
          </div>
          <div className="border-x border-[#243B55] px-2">
            <span className="block text-[10px] sm:text-[11px] font-semibold text-slate-400 whitespace-nowrap">Egresos Filtrados</span>
            <span className="text-xs sm:text-sm font-black text-rose-400 whitespace-nowrap">
              -{formatCOP(totalExpensesAmount)}
            </span>
          </div>
          <div>
            <span className="block text-[10px] sm:text-[11px] font-semibold text-slate-400 whitespace-nowrap">Balance Neto</span>
            <span className={`text-xs sm:text-sm font-black whitespace-nowrap ${netBalance >= 0 ? 'text-[#00ADB5]' : 'text-rose-400'}`}>
              {netBalance >= 0 ? `+${formatCOP(netBalance)}` : formatCOP(netBalance)}
            </span>
          </div>
        </div>

        {/* Movements Table / Cards */}
        <div className="bg-[#0B192C] border border-[#1E3A5F] rounded-3xl p-5 shadow-xl">
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30 text-[#00ADB5]" />
              <p className="text-xs">No hay movimientos que coincidan con estos filtros.</p>
              {selectedMonth !== 'ALL' && (
                <button
                  onClick={() => setSelectedMonth('ALL')}
                  className="mt-3 px-3.5 py-1.5 rounded-xl bg-[#102A43] text-[#00ADB5] border border-[#243B55] text-xs font-bold hover:bg-[#152E4D] transition-colors"
                >
                  Ver Todo el Historial (todos los meses)
                </button>
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
                    className="bg-[#102A43] hover:bg-[#152E4D] border border-[#243B55] hover:border-[#00ADB5]/50 rounded-2xl p-3.5 flex items-center justify-between gap-3 transition-all cursor-pointer group"
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
                            <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider whitespace-nowrap shrink-0">Fijo</span>
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

              {/* Pagination Controls */}
              {totalItems > 0 && (
                <div className="mt-4 pt-3.5 border-t border-[#1E3A5F]/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="text-slate-400 text-[11px] sm:text-xs">
                    Mostrando{' '}
                    <span className="font-bold text-white">
                      {(safeCurrentPage - 1) * pageSize + 1}
                    </span>
                    {' '}-{' '}
                    <span className="font-bold text-white">
                      {Math.min(safeCurrentPage * pageSize, totalItems)}
                    </span>
                    {' '}de{' '}
                    <span className="font-bold text-[#00ADB5]">{totalItems}</span> movimientos
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={safeCurrentPage <= 1}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl border font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-[#102A43] hover:bg-[#152E4D] border-[#243B55] text-slate-300 hover:text-white"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Anterior</span>
                    </button>

                    <div className="px-3 py-1.5 rounded-xl bg-[#0B192C] border border-[#243B55] text-[11px] font-bold text-white whitespace-nowrap">
                      Página <span className="text-cyan-400">{safeCurrentPage}</span> de <span className="text-slate-300">{totalPages}</span>
                    </div>

                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={safeCurrentPage >= totalPages}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl border font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-[#102A43] hover:bg-[#152E4D] border-[#243B55] text-slate-300 hover:text-white"
                    >
                      <span>Siguiente</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
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
