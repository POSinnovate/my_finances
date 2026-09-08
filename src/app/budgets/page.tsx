'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { BudgetCard, CategoryWithBudget } from '@/components/budgets/BudgetCard';
import { QuickExpenseModal } from '@/components/expenses/QuickExpenseModal';
import { formatCOP } from '@/lib/utils';
import { PieChart, Plus, ArrowLeft, PlusCircle, Check, X, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

const COLOR_OPTIONS = [
  '#00ADB5', '#06B6D4', '#3B82F6', '#8B5CF6', 
  '#EC4899', '#EF4444', '#F59E0B', '#10B981'
];

export default function BudgetsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [categories, setCategories] = useState<CategoryWithBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);

  // New Category Form
  const [newCatName, setNewCatName] = useState('');
  const [newCatBudget, setNewCatBudget] = useState('');
  const [newCatColor, setNewCatColor] = useState(COLOR_OPTIONS[0]);
  const [newCatIsFixed, setNewCatIsFixed] = useState(false);
  const [isSubmittingCat, setIsSubmittingCat] = useState(false);

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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      toast.error('El nombre del grupo es obligatorio');
      return;
    }

    setIsSubmittingCat(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCatName.trim(),
          monthly_budget: Number(newCatBudget) || 0,
          color: newCatColor,
          is_fixed: newCatIsFixed,
        }),
      });

      if (res.ok) {
        toast.success(`Grupo "${newCatName}" creado`);
        setNewCatName('');
        setNewCatBudget('');
        setIsAddCategoryOpen(false);
        loadData();
      } else {
        toast.error('Error al crear categoría');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setIsSubmittingCat(false);
    }
  };

  const fixedCategories = categories.filter((c) => c.is_fixed === 1);
  const variableCategories = categories.filter((c) => c.is_fixed !== 1);

  const totalFixedBudgeted = fixedCategories.reduce((acc, c) => acc + (c.monthly_budget || 0), 0);
  const totalVariableBudgeted = variableCategories.reduce((acc, c) => acc + (c.monthly_budget || 0), 0);
  const totalBudgeted = totalFixedBudgeted + totalVariableBudgeted;
  const totalSpent = categories.reduce((acc, c) => acc + (c.spent_this_month || 0), 0);

  return (
    <div className="min-h-screen bg-[#070F1E] flex flex-col">
      <Header user={user} onUserUpdate={loadData} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-5 space-y-5">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0B192C] border border-[#1E3A5F] rounded-3xl p-5 shadow-xl">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-[#102A43] border border-[#243B55] text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-black text-white">Grupos & Gastos Fijos</h1>
              <p className="text-xs text-slate-400">Define tus compromisos fijos y topes de gastos variables</p>
            </div>
          </div>

          <button
            onClick={() => setIsAddCategoryOpen(true)}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#00ADB5] to-[#06B6D4] text-[#0B192C] font-extrabold text-xs shadow-md shadow-[#00ADB5]/20 flex items-center gap-1.5 self-start sm:self-center"
          >
            <Plus className="w-4 h-4 stroke-[3px]" />
            <span>+ Nuevo Grupo</span>
          </button>
        </div>

        {/* Total Budget vs Actual Spend Banner */}
        <div className="bg-[#102A43] border border-[#243B55] rounded-3xl p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-4 gap-3 shadow-lg">
          <div className="p-2 rounded-xl bg-[#0B192C]/50 border border-[#1E3A5F]">
            <span className="text-[10px] sm:text-[11px] font-semibold text-cyan-400 block">Compromisos Fijos</span>
            <p className="text-sm sm:text-base font-black text-white mt-0.5">{formatCOP(totalFixedBudgeted)}</p>
          </div>
          <div className="p-2 rounded-xl bg-[#0B192C]/50 border border-[#1E3A5F]">
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 block">Tope Variable</span>
            <p className="text-sm sm:text-base font-black text-white mt-0.5">{formatCOP(totalVariableBudgeted)}</p>
          </div>
          <div className="p-2 rounded-xl bg-[#0B192C]/50 border border-[#1E3A5F]">
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 block">Total Gastado Mes</span>
            <p className="text-sm sm:text-base font-black text-rose-400 mt-0.5">{formatCOP(totalSpent)}</p>
          </div>
          <div className="p-2 rounded-xl bg-[#0B192C]/50 border border-[#1E3A5F]">
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 block">Margen Restante</span>
            <p className={`text-sm sm:text-base font-black mt-0.5 ${totalBudgeted - totalSpent >= 0 ? 'text-[#00ADB5]' : 'text-rose-400'}`}>
              {formatCOP(totalBudgeted - totalSpent)}
            </p>
          </div>
        </div>

        {/* Modal / Inline Drawer for New Category */}
        {isAddCategoryOpen && (
          <div className="bg-[#0B192C] border border-[#00ADB5] rounded-3xl p-5 shadow-2xl animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E3A5F]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-[#00ADB5]" />
                <span>Crear Nuevo Grupo de Gasto</span>
              </h3>
              <button
                onClick={() => setIsAddCategoryOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="mt-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre del Grupo</label>
                  <input
                    type="text"
                    placeholder="Ej: Mascotas, Gimnasio, Libros"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full bg-[#102A43] border border-[#243B55] text-white text-xs px-3 py-2 rounded-xl focus:border-[#00ADB5] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Presupuesto Estimado Mensual ($ COP)</label>
                  <input
                    type="number"
                    placeholder="Ej: 100000"
                    value={newCatBudget}
                    onChange={(e) => setNewCatBudget(e.target.value)}
                    className="w-full bg-[#102A43] border border-[#243B55] text-white text-xs px-3 py-2 rounded-xl focus:border-[#00ADB5] focus:outline-none"
                  />
                </div>
              </div>

              {/* Color selector & Fixed checkbox */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-400 mr-1">Color:</span>
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewCatColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        newCatColor === c ? 'scale-110 border-white' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={newCatIsFixed}
                    onChange={(e) => setNewCatIsFixed(e.target.checked)}
                    className="rounded border-[#243B55] text-[#00ADB5] focus:ring-0"
                  />
                  <span>¿Es un compromiso fijo mensual? (Ej: papás, arriendo)</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddCategoryOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCat}
                  className="px-4 py-2 rounded-xl bg-[#00ADB5] text-[#0B192C] font-extrabold text-xs shadow-md hover:opacity-90 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3px]" />
                  <span>Guardar Grupo</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Fixed Commitments Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>Compromisos Fijos Mensuales</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Gastos ineludibles al mes (apoyo familiar a papás, suscripciones fijas, servicios)
              </p>
            </div>
            <span className="text-xs font-black text-cyan-400">
              {fixedCategories.length} {fixedCategories.length === 1 ? 'fijo' : 'fijos'}
            </span>
          </div>

          {fixedCategories.length === 0 ? (
            <div className="p-4 rounded-2xl bg-[#0B192C] border border-[#1E3A5F] text-center text-xs text-slate-400">
              No tienes ningún grupo marcado como gasto fijo. Crea uno o edita un grupo existente.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {fixedCategories.map((cat) => (
                <BudgetCard
                  key={cat.id}
                  category={cat}
                  onBudgetUpdated={loadData}
                />
              ))}
            </div>
          )}
        </div>

        {/* Variable Categories Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00ADB5]" />
                <span>Presupuestos de Gastos Variables</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Topes recomendados para frenar fugas diarias de dinero y compras hormiga
              </p>
            </div>
            <span className="text-xs font-black text-[#00ADB5]">
              {variableCategories.length} {variableCategories.length === 1 ? 'grupo' : 'grupos'}
            </span>
          </div>

          {variableCategories.length === 0 ? (
            <div className="p-4 rounded-2xl bg-[#0B192C] border border-[#1E3A5F] text-center text-xs text-slate-400">
              No tienes grupos de gastos variables registrados.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {variableCategories.map((cat) => (
                <BudgetCard
                  key={cat.id}
                  category={cat}
                  onBudgetUpdated={loadData}
                />
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
