'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { BudgetCard, CategoryWithBudget } from '@/components/budgets/BudgetCard';
import { IncomeSourceCard } from '@/components/budgets/IncomeSourceCard';
import { QuickExpenseModal } from '@/components/expenses/QuickExpenseModal';
import { formatCOP } from '@/lib/utils';
import { 
  Plus, 
  ArrowLeft, 
  PlusCircle, 
  Check, 
  X, 
  TrendingUp, 
  Briefcase, 
  Wallet, 
  Tag, 
  Award,
  Layers
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

const COLOR_OPTIONS = [
  '#00ADB5', '#06B6D4', '#3B82F6', '#8B5CF6', 
  '#EC4899', '#EF4444', '#F59E0B', '#10B981'
];

export default function BudgetsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [loading, setLoading] = useState(true);
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);

  // New Category Form
  const [newCatType, setNewCatType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
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

  const handleOpenAdd = (type: 'EXPENSE' | 'INCOME') => {
    setNewCatType(type);
    setNewCatColor(type === 'INCOME' ? '#10B981' : '#00ADB5');
    setIsAddCategoryOpen(true);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    setIsSubmittingCat(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCatName.trim(),
          type: newCatType,
          monthly_budget: Number(newCatBudget) || 0,
          color: newCatColor,
          is_fixed: newCatType === 'EXPENSE' ? newCatIsFixed : false,
        }),
      });

      if (res.ok) {
        toast.success(newCatType === 'INCOME' ? `Fuente "${newCatName}" creada` : `Grupo "${newCatName}" creado`);
        setNewCatName('');
        setNewCatBudget('');
        setIsAddCategoryOpen(false);
        loadData();
      } else {
        toast.error('Error al crear');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setIsSubmittingCat(false);
    }
  };

  // Group separation
  const expenseCategories = categories.filter((c) => c.type !== 'INCOME');
  const incomeCategories = categories.filter((c) => c.type === 'INCOME');

  // Expense stats
  const fixedCategories = expenseCategories.filter((c) => c.is_fixed === 1);
  const variableCategories = expenseCategories.filter((c) => c.is_fixed !== 1);
  const totalFixedBudgeted = fixedCategories.reduce((acc, c) => acc + (c.monthly_budget || 0), 0);
  const totalVariableBudgeted = variableCategories.reduce((acc, c) => acc + (c.monthly_budget || 0), 0);
  const totalExpenseBudgeted = totalFixedBudgeted + totalVariableBudgeted;
  const totalSpent = expenseCategories.reduce((acc, c) => acc + (c.spent_this_month || 0), 0);

  // Income stats
  const totalIncomeThisMonth = incomeCategories.reduce((acc, c) => acc + (c.earned_this_month || 0), 0);
  const totalIncomeThisYear = incomeCategories.reduce((acc, c) => acc + (c.earned_this_year || 0), 0);

  // Sort income categories by month earnings descending
  const sortedIncomeCategories = [...incomeCategories].sort((a, b) => (b.earned_this_month || 0) - (a.earned_this_month || 0));
  const topIncomeSource = sortedIncomeCategories[0];

  const numericNewBudget = Number(newCatBudget) || 0;

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
              <h1 className="text-xl font-black text-white">Grupos & Fuentes de Dinero</h1>
              <p className="text-xs text-slate-400">Administra tus gastos fijos y conoce tus entradas más fuertes</p>
            </div>
          </div>

          <button
            onClick={() => handleOpenAdd(activeTab)}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#00ADB5] to-[#06B6D4] text-[#0B192C] font-extrabold text-xs shadow-md shadow-[#00ADB5]/20 flex items-center gap-1.5 self-start sm:self-center"
          >
            <Plus className="w-4 h-4 stroke-[3px]" />
            <span>{activeTab === 'INCOME' ? '+ Nueva Fuente' : '+ Nuevo Grupo'}</span>
          </button>
        </div>

        {/* Tab Switcher: Gastos & Fijos vs Fuentes de Ingreso */}
        <div className="flex items-center gap-2 bg-[#0B192C] border border-[#1E3A5F] p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab('EXPENSE')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'EXPENSE'
                ? 'bg-[#102A43] border border-[#00ADB5] text-[#00ADB5] shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Grupos de Gasto & Fijos ({expenseCategories.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('INCOME')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'INCOME'
                ? 'bg-[#102A43] border border-emerald-400 text-emerald-400 shadow-md'
                : 'text-slate-400 hover:text-emerald-400'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Fuentes de Ingreso ({incomeCategories.length})</span>
          </button>
        </div>

        {/* TAB 1: EXPENSE CONTENT */}
        {activeTab === 'EXPENSE' && (
          <div className="space-y-5">
            {/* Total Budget vs Actual Spend Banner */}
            <div className="bg-[#102A43] border border-[#243B55] rounded-3xl p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-4 gap-3 shadow-lg">
              <div className="p-2.5 rounded-xl bg-[#0B192C]/60 border border-[#1E3A5F]">
                <span className="text-[10px] sm:text-[11px] font-semibold text-cyan-400 block">Compromisos Fijos</span>
                <p className="text-sm sm:text-base font-black text-white mt-0.5">{formatCOP(totalFixedBudgeted)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-[#0B192C]/60 border border-[#1E3A5F]">
                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 block">Tope Variable</span>
                <p className="text-sm sm:text-base font-black text-white mt-0.5">{formatCOP(totalVariableBudgeted)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-[#0B192C]/60 border border-[#1E3A5F]">
                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 block">Total Gastado Mes</span>
                <p className="text-sm sm:text-base font-black text-rose-400 mt-0.5">{formatCOP(totalSpent)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-[#0B192C]/60 border border-[#1E3A5F]">
                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 block">Margen Restante</span>
                <p className={`text-sm sm:text-base font-black mt-0.5 ${totalExpenseBudgeted - totalSpent >= 0 ? 'text-[#00ADB5]' : 'text-rose-400'}`}>
                  {formatCOP(totalExpenseBudgeted - totalSpent)}
                </p>
              </div>
            </div>

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
          </div>
        )}

        {/* TAB 2: INCOME SOURCES CONTENT */}
        {activeTab === 'INCOME' && (
          <div className="space-y-5">
            {/* Income Summary Banner */}
            <div className="bg-gradient-to-r from-[#0B192C] to-[#102A43] border border-emerald-500/30 rounded-3xl p-5 shadow-xl grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-[#0B192C]/80 border border-[#243B55]">
                <span className="text-[11px] font-semibold text-slate-400 block">Total Entradas del Mes</span>
                <p className="text-xl font-black text-emerald-400 mt-0.5">+{formatCOP(totalIncomeThisMonth)}</p>
                <span className="text-[10px] text-slate-500 mt-1 block">Suma de todos tus ingresos</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#0B192C]/80 border border-[#243B55]">
                <span className="text-[11px] font-semibold text-slate-400 block">Total Acumulado Año</span>
                <p className="text-xl font-black text-white mt-0.5">+{formatCOP(totalIncomeThisYear)}</p>
                <span className="text-[10px] text-slate-500 mt-1 block">Histórico anual en vivo</span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-600/40">
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5" />
                  <span>Fuente Más Fuerte</span>
                </span>
                <p className="text-base font-black text-white mt-1 truncate">
                  {topIncomeSource ? topIncomeSource.name : 'Aún sin registros'}
                </p>
                <span className="text-[10px] text-emerald-300 block mt-0.5">
                  {topIncomeSource ? `Generó ${formatCOP(topIncomeSource.earned_this_month || 0)} este mes` : 'Registra tus ingresos'}
                </span>
              </div>
            </div>

            {/* Income Sources Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Tus Fuentes de Ingreso & Clientes</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Clasificación de quincenas, suscripciones de sistemas, servicios y freelance
                  </p>
                </div>
                <span className="text-xs font-black text-emerald-400">
                  {incomeCategories.length} {incomeCategories.length === 1 ? 'fuente' : 'fuentes'}
                </span>
              </div>

              {incomeCategories.length === 0 ? (
                <div className="p-6 rounded-3xl bg-[#0B192C] border border-[#1E3A5F] text-center text-xs text-slate-400">
                  <Briefcase className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-40" />
                  <p className="text-slate-300 font-bold">No tienes fuentes de ingreso creadas</p>
                  <button
                    onClick={() => handleOpenAdd('INCOME')}
                    className="mt-3 text-xs text-emerald-400 underline font-bold"
                  >
                    Crear tu primera fuente (ej: Quincena, Suscripciones)
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {sortedIncomeCategories.map((cat, idx) => (
                    <IncomeSourceCard
                      key={cat.id}
                      category={cat}
                      totalMonthlyIncome={totalIncomeThisMonth}
                      isTopSource={idx === 0 && (cat.earned_this_month || 0) > 0}
                      onUpdated={loadData}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal / Inline Drawer for New Category / Source */}
        {isAddCategoryOpen && (
          <div className="bg-[#0B192C] border border-[#00ADB5] rounded-3xl p-5 shadow-2xl animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E3A5F]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4 text-[#00ADB5]" />
                  <span>Crear Nuevo Rubro:</span>
                </span>
                <div className="flex items-center bg-[#102A43] p-0.5 rounded-lg border border-[#243B55]">
                  <button
                    type="button"
                    onClick={() => setNewCatType('EXPENSE')}
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-md transition-all ${
                      newCatType === 'EXPENSE' ? 'bg-rose-500 text-white' : 'text-slate-400'
                    }`}
                  >
                    Grupo de Gasto
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCatType('INCOME')}
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-md transition-all ${
                      newCatType === 'INCOME' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
                    }`}
                  >
                    Fuente de Ingreso
                  </button>
                </div>
              </div>

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
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {newCatType === 'INCOME' ? 'Nombre de la Fuente de Ingreso' : 'Nombre del Grupo de Gasto'}
                  </label>
                  <input
                    type="text"
                    placeholder={newCatType === 'INCOME' ? 'Ej: Suscripciones Sistemas, Quincenas' : 'Ej: Mascotas, Gimnasio'}
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full bg-[#102A43] border border-[#243B55] text-white text-xs px-3 py-2 rounded-xl focus:border-[#00ADB5] focus:outline-none"
                    required
                  />
                </div>

                {newCatType === 'EXPENSE' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-300">
                        Presupuesto Estimado Mensual ($ COP)
                      </label>
                      {numericNewBudget > 0 && (
                        <span className="text-[11px] text-[#00ADB5] font-bold">
                          {formatCOP(numericNewBudget)}
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      placeholder="Ej: 150000"
                      value={newCatBudget}
                      onChange={(e) => setNewCatBudget(e.target.value)}
                      className="w-full bg-[#102A43] border border-[#243B55] text-white text-xs px-3 py-2 rounded-xl focus:border-[#00ADB5] focus:outline-none"
                    />
                  </div>
                )}
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

                {newCatType === 'EXPENSE' && (
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={newCatIsFixed}
                      onChange={(e) => setNewCatIsFixed(e.target.checked)}
                      className="rounded border-[#243B55] text-[#00ADB5] focus:ring-0"
                    />
                    <span>¿Es un compromiso fijo mensual? (Ej: papás, arriendo)</span>
                  </label>
                )}
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
                  <span>Guardar</span>
                </button>
              </div>
            </form>
          </div>
        )}
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
