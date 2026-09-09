'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { QuickExpenseModal } from '@/components/expenses/QuickExpenseModal';
import { MovementDetailModal } from '@/components/expenses/MovementDetailModal';
import { formatCOP, formatDateSpanish } from '@/lib/utils';
import { Receipt, Trash2, Filter, Search, PlusCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function ExpensesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<'ALL' | 'EXPENSE' | 'INCOME'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        router.push('/login');
        return;
      }
      const meData = await meRes.json();
      setUser(meData.user);

      const catRes = await fetch('/api/categories');
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData.categories || []);
      }

      const pmRes = await fetch('/api/payment-methods');
      if (pmRes.ok) {
        const pmData = await pmRes.json();
        setPaymentMethods(pmData.paymentMethods || []);
      }

      let expUrl = '/api/expenses?';
      if (selectedMonth !== 'ALL') {
        expUrl += `month=${selectedMonth}&`;
      }
      if (selectedType !== 'ALL') {
        expUrl += `&type=${selectedType}`;
      }
      if (selectedCategory !== 'ALL') {
        expUrl += `&categoryId=${selectedCategory}`;
      }
      if (selectedPaymentMethod !== 'ALL') {
        expUrl += `&paymentMethod=${encodeURIComponent(selectedPaymentMethod)}`;
      }
      const expRes = await fetch(expUrl);
      if (expRes.ok) {
        const expData = await expRes.json();
        setExpenses(expData.expenses || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [router, selectedMonth, selectedType, selectedCategory, selectedPaymentMethod]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('¿Eliminar este movimiento y actualizar el fondo disponible?')) return;
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Movimiento eliminado y saldo actualizado');
        loadData();
      } else {
        toast.error('Error al eliminar');
      }
    } catch {
      toast.error('Error de conexión');
    }
  };

  const filteredExpenses = expenses.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.category_name?.toLowerCase().includes(q) ||
      e.notes?.toLowerCase().includes(q) ||
      e.payment_method?.toLowerCase().includes(q)
    );
  });

  const totalExpensesAmount = filteredExpenses
    .filter((e) => e.type !== 'INCOME')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalIncomesAmount = filteredExpenses
    .filter((e) => e.type === 'INCOME')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const netBalance = totalIncomesAmount - totalExpensesAmount;

  return (
    <div className="min-h-screen bg-[#070F1E] flex flex-col">
      <Header user={user} onUserUpdate={loadData} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-5 space-y-4">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0B192C] border border-[#1E3A5F] rounded-3xl p-5 shadow-xl">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-[#102A43] border border-[#243B55] text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-black text-white">Libro de Movimientos</h1>
              <p className="text-xs text-slate-400">Historial completo de entradas y salidas de dinero</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedMonth(selectedMonth === 'ALL' ? new Date().toISOString().slice(0, 7) : 'ALL')}
              className={`text-xs px-3 py-2 rounded-xl border font-bold transition-all ${
                selectedMonth === 'ALL'
                  ? 'bg-[#00ADB5] text-[#0B192C] border-[#00ADB5]'
                  : 'bg-[#102A43] text-slate-300 border-[#243B55] hover:text-white'
              }`}
            >
              {selectedMonth === 'ALL' ? 'Todo el Historial' : 'Ver Todo el Historial'}
            </button>

            {selectedMonth !== 'ALL' && (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-[#102A43] border border-[#243B55] text-white text-xs px-3 py-2 rounded-xl focus:outline-none"
              />
            )}

            <button
              onClick={() => setIsQuickExpenseOpen(true)}
              className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-[#00ADB5] to-[#06B6D4] text-[#0B192C] font-extrabold text-xs shadow-md shadow-[#00ADB5]/20 flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Movimiento</span>
            </button>
          </div>
        </div>

        {/* Filters: Type + Search + Categories */}
        <div className="space-y-2.5">
          {/* Movement Type Switcher (All / Expenses / Incomes) */}
          <div className="flex items-center gap-2 bg-[#0B192C] border border-[#1E3A5F] p-1.5 rounded-2xl w-full sm:w-auto self-start">
            <button
              onClick={() => setSelectedType('ALL')}
              className={`flex-1 sm:flex-initial text-xs px-4 py-2 rounded-xl font-bold transition-all ${
                selectedType === 'ALL'
                  ? 'bg-gradient-to-r from-[#00ADB5] to-[#06B6D4] text-[#0B192C] shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos ({expenses.length})
            </button>
            <button
              onClick={() => setSelectedType('EXPENSE')}
              className={`flex-1 sm:flex-initial text-xs px-4 py-2 rounded-xl font-bold transition-all ${
                selectedType === 'EXPENSE'
                  ? 'bg-rose-500 text-white shadow'
                  : 'text-slate-400 hover:text-rose-400'
              }`}
            >
              - Egresos
            </button>
            <button
              onClick={() => setSelectedType('INCOME')}
              className={`flex-1 sm:flex-initial text-xs px-4 py-2 rounded-xl font-bold transition-all ${
                selectedType === 'INCOME'
                  ? 'bg-emerald-500 text-[#0B192C] shadow'
                  : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              + Ingresos
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por descripción, grupo o método..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0B192C] border border-[#1E3A5F] text-white text-xs pl-9 pr-3 py-2.5 rounded-xl focus:border-[#00ADB5] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`text-xs px-3 py-2 rounded-xl whitespace-nowrap border font-medium transition-colors ${
                  selectedCategory === 'ALL'
                    ? 'bg-[#00ADB5] text-[#0B192C] border-[#00ADB5] font-bold'
                    : 'bg-[#102A43] text-slate-300 border-[#243B55]'
                }`}
              >
                Todos los grupos
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`text-xs px-3 py-2 rounded-xl whitespace-nowrap border font-medium transition-colors flex items-center gap-1.5 ${
                    selectedCategory === c.id
                      ? 'bg-[#00ADB5] text-[#0B192C] border-[#00ADB5] font-bold'
                      : 'bg-[#102A43] text-slate-300 border-[#243B55]'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: c.color }}
                  />
                  {c.name}
                </button>
              ))}
            </div>

            {/* Payment Method Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedPaymentMethod('ALL')}
                className={`text-xs px-2.5 py-1.5 rounded-xl whitespace-nowrap border font-medium transition-colors ${
                  selectedPaymentMethod === 'ALL'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                    : 'bg-[#102A43] text-slate-400 border-[#243B55]'
                }`}
              >
                Todos los medios
              </button>
              {paymentMethods.map((pm) => (
                <button
                  key={pm.id}
                  onClick={() => setSelectedPaymentMethod(pm.name)}
                  className={`text-xs px-2.5 py-1.5 rounded-xl whitespace-nowrap border font-medium transition-colors flex items-center gap-1.5 ${
                    selectedPaymentMethod === pm.name
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                      : 'bg-[#102A43] text-slate-400 border-[#243B55]'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: pm.color || '#00ADB5' }}
                  />
                  {pm.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Breakdown Card */}
        <div className="bg-[#102A43] border border-[#243B55] rounded-2xl p-4 grid grid-cols-3 gap-2 text-center">
          <div>
            <span className="block text-[10px] sm:text-[11px] font-semibold text-slate-400">Ingresos</span>
            <span className="text-xs sm:text-sm font-black text-emerald-400">
              +{formatCOP(totalIncomesAmount)}
            </span>
          </div>
          <div className="border-x border-[#243B55] px-2">
            <span className="block text-[10px] sm:text-[11px] font-semibold text-slate-400">Egresos</span>
            <span className="text-xs sm:text-sm font-black text-rose-400">
              -{formatCOP(totalExpensesAmount)}
            </span>
          </div>
          <div>
            <span className="block text-[10px] sm:text-[11px] font-semibold text-slate-400">Balance Neto</span>
            <span className={`text-xs sm:text-sm font-black ${netBalance >= 0 ? 'text-[#00ADB5]' : 'text-rose-400'}`}>
              {netBalance >= 0 ? `+${formatCOP(netBalance)}` : formatCOP(netBalance)}
            </span>
          </div>
        </div>

        {/* Expenses / Movements Table / Cards */}
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
              {filteredExpenses.map((exp) => {
                const isIncome = exp.type === 'INCOME';
                return (
                  <div
                    key={exp.id}
                    onClick={() => setSelectedMovement(exp)}
                    className="bg-[#102A43] hover:bg-[#152E4D] border border-[#243B55] hover:border-[#00ADB5]/50 rounded-2xl p-3.5 flex items-center justify-between gap-3 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: isIncome ? '#10B981' : (exp.category_color || '#00ADB5') }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white group-hover:text-[#00ADB5] transition-colors truncate">
                            {isIncome ? (exp.category_name || 'Ingreso de Dinero') : exp.category_name}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md border ${
                            isIncome
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold'
                              : 'bg-[#0B192C] text-slate-300 border-[#243B55]'
                          }`}>
                            {isIncome ? 'Ingreso (+)' : exp.payment_method}
                          </span>
                          {!isIncome && exp.is_fixed === 1 && (
                            <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider">Fijo</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {exp.notes ? <span className="text-slate-200">{exp.notes} • </span> : null}
                          <span className="text-slate-300 font-medium">{formatDateSpanish(exp.date)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <span className={`text-sm sm:text-base font-black ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isIncome ? `+${formatCOP(exp.amount)}` : `-${formatCOP(exp.amount)}`}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteExpense(exp.id);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
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
        onOpenQuickExpense={() => setIsQuickExpenseOpen(true)}
        userRole={user?.role}
      />

      <QuickExpenseModal
        isOpen={isQuickExpenseOpen}
        onClose={() => setIsQuickExpenseOpen(false)}
        onExpenseAdded={loadData}
        categories={categories}
      />

      <MovementDetailModal
        movement={selectedMovement}
        isOpen={!!selectedMovement}
        onClose={() => setSelectedMovement(null)}
        onMovementDeleted={loadData}
      />
    </div>
  );
}
