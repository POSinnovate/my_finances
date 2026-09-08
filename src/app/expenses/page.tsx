'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { QuickExpenseModal } from '@/components/expenses/QuickExpenseModal';
import { formatCOP } from '@/lib/utils';
import { Receipt, Trash2, Filter, Search, PlusCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function ExpensesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);
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

      let expUrl = `/api/expenses?month=${selectedMonth}`;
      if (selectedCategory !== 'ALL') {
        expUrl += `&categoryId=${selectedCategory}`;
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
  }, [router, selectedMonth, selectedCategory]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('¿Eliminar este gasto y restaurar el saldo?')) return;
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Gasto eliminado');
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

  const totalFiltered = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);

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
              <h1 className="text-xl font-black text-white">Historial de Gastos</h1>
              <p className="text-xs text-slate-400">Consulta y audita todos tus movimientos</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-[#102A43] border border-[#243B55] text-white text-xs px-3 py-2 rounded-xl focus:outline-none"
            />
            <button
              onClick={() => setIsQuickExpenseOpen(true)}
              className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-[#00ADB5] to-[#06B6D4] text-[#0B192C] font-extrabold text-xs shadow-md shadow-[#00ADB5]/20 flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Gasto</span>
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nota, categoría o método..."
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
        </div>

        {/* Summary Card of Filtered Result */}
        <div className="bg-[#102A43] border border-[#243B55] rounded-2xl p-4 flex items-center justify-between">
          <span className="text-xs text-slate-300">
            Total en esta selección: <strong className="text-white font-bold">{filteredExpenses.length} movimientos</strong>
          </span>
          <span className="text-base font-black text-rose-400">
            {formatCOP(totalFiltered)}
          </span>
        </div>

        {/* Expenses Table / Cards */}
        <div className="bg-[#0B192C] border border-[#1E3A5F] rounded-3xl p-5 shadow-xl">
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30 text-[#00ADB5]" />
              <p className="text-xs">No hay gastos que coincidan con estos filtros.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredExpenses.map((exp) => (
                <div
                  key={exp.id}
                  className="bg-[#102A43] hover:bg-[#152E4D] border border-[#243B55] rounded-2xl p-3.5 flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: exp.category_color || '#00ADB5' }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">{exp.category_name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#0B192C] text-slate-300 border border-[#243B55]">
                          {exp.payment_method}
                        </span>
                        {exp.is_fixed === 1 && (
                          <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider">Fijo</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {exp.notes ? <span className="text-slate-200">{exp.notes} • </span> : null}
                        <span className="text-slate-500">{exp.date}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm sm:text-base font-black text-rose-400">
                      -{formatCOP(exp.amount)}
                    </span>
                    <button
                      onClick={() => handleDeleteExpense(exp.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Eliminar gasto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
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
    </div>
  );
}
