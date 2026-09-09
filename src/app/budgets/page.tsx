'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { BudgetCard } from '@/components/budgets/BudgetCard';
import { IncomeSourceCard } from '@/components/budgets/IncomeSourceCard';
import { QuickExpenseModal } from '@/components/expenses/QuickExpenseModal';
import { formatCOP } from '@/lib/utils';
import { 
  useUser, 
  useCategories, 
  usePaymentMethods, 
  useInvalidateFinance 
} from '@/lib/api-hooks';
import { 
  Plus, 
  ArrowLeft, 
  PlusCircle, 
  Check, 
  X, 
  Briefcase, 
  Wallet, 
  Award,
  Layers,
  CreditCard,
  Building2,
  Smartphone,
  Banknote,
  Trash2,
  ArrowDownRight,
  ArrowUpRight,
  Edit3
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

const COLOR_OPTIONS = [
  '#00ADB5', '#06B6D4', '#3B82F6', '#8B5CF6', 
  '#EC4899', '#EF4444', '#F59E0B', '#10B981'
];

const METHOD_TYPES = [
  { id: 'WALLET', label: 'Billetera Digital (Nequi, Daviplata, etc.)', icon: Smartphone },
  { id: 'BANK', label: 'Cuenta Bancaria (Bancolombia, etc.)', icon: Building2 },
  { id: 'CASH', label: 'Efectivo en Mano', icon: Banknote },
  { id: 'CARD', label: 'Tarjeta de Crédito', icon: CreditCard },
  { id: 'OTHER', label: 'Otro Medio', icon: Wallet },
];

export default function BudgetsPage() {
  const router = useRouter();
  const invalidateFinance = useInvalidateFinance();

  // TanStack React Query hooks with automatic caching
  const { data: user } = useUser();
  const { data: categories = [], refetch: refetchCategories } = useCategories();
  const { data: paymentMethods = [], refetch: refetchPaymentMethods } = usePaymentMethods();

  const [activeTab, setActiveTab] = useState<'EXPENSE' | 'INCOME' | 'PAYMENT_METHODS'>('EXPENSE');
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);

  // New Category Form Modal
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCatType, setNewCatType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [newCatName, setNewCatName] = useState('');
  const [newCatBudget, setNewCatBudget] = useState('');
  const [newCatColor, setNewCatColor] = useState(COLOR_OPTIONS[0]);
  const [newCatIsFixed, setNewCatIsFixed] = useState(false);
  const [isSubmittingCat, setIsSubmittingCat] = useState(false);

  // New Payment Method Form Modal
  const [isAddMethodOpen, setIsAddMethodOpen] = useState(false);
  const [newMethodName, setNewMethodName] = useState('');
  const [newMethodType, setNewMethodType] = useState('BANK');
  const [newMethodColor, setNewMethodColor] = useState(COLOR_OPTIONS[0]);
  const [isSubmittingMethod, setIsSubmittingMethod] = useState(false);

  // Edit Payment Method Modal
  const [editingMethod, setEditingMethod] = useState<any | null>(null);
  const [editMethodName, setEditMethodName] = useState('');
  const [editMethodType, setEditMethodType] = useState('BANK');
  const [editMethodColor, setEditMethodColor] = useState(COLOR_OPTIONS[0]);
  const [isSavingEditMethod, setIsSavingEditMethod] = useState(false);

  const handleOpenAdd = () => {
    if (activeTab === 'PAYMENT_METHODS') {
      setIsAddMethodOpen(true);
    } else {
      setNewCatType(activeTab);
      setNewCatColor(activeTab === 'INCOME' ? '#10B981' : '#00ADB5');
      setIsAddCategoryOpen(true);
    }
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
        invalidateFinance();
      } else {
        toast.error('Error al crear el grupo');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setIsSubmittingCat(false);
    }
  };

  const handleCreatePaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMethodName.trim()) {
      toast.error('El nombre del método es obligatorio');
      return;
    }

    setIsSubmittingMethod(true);
    try {
      const res = await fetch('/api/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newMethodName.trim(),
          type: newMethodType,
          color: newMethodColor,
          icon: newMethodType === 'WALLET' ? 'Smartphone' : newMethodType === 'CASH' ? 'Banknote' : newMethodType === 'CARD' ? 'CreditCard' : 'Building2',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Método "${newMethodName.trim()}" creado`);
        setNewMethodName('');
        setIsAddMethodOpen(false);
        invalidateFinance();
      } else {
        toast.error(data.error || 'Error al crear método');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setIsSubmittingMethod(false);
    }
  };

  const handleOpenEditMethod = (pm: any) => {
    setEditingMethod(pm);
    setEditMethodName(pm.name);
    setEditMethodType(pm.type || 'BANK');
    setEditMethodColor(pm.color || '#00ADB5');
  };

  const handleSaveEditMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMethod) return;
    if (!editMethodName.trim()) {
      toast.error('El nombre del método es obligatorio');
      return;
    }

    setIsSavingEditMethod(true);
    try {
      const res = await fetch('/api/payment-methods', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingMethod.id,
          name: editMethodName.trim(),
          type: editMethodType,
          color: editMethodColor,
          icon: editMethodType === 'WALLET' ? 'Smartphone' : editMethodType === 'CASH' ? 'Banknote' : editMethodType === 'CARD' ? 'CreditCard' : 'Building2',
        }),
      });

      if (res.ok) {
        toast.success(`Método "${editMethodName.trim()}" actualizado`);
        setEditingMethod(null);
        invalidateFinance();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Error al actualizar método');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setIsSavingEditMethod(false);
    }
  };

  const handleDeleteMethod = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar el método de pago "${name}"? Los movimientos asociados pasarán a Efectivo.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/payment-methods?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Método "${name}" eliminado`);
        invalidateFinance();
      } else {
        toast.error(data.error || 'No se pudo eliminar el método');
      }
    } catch {
      toast.error('Error de conexión');
    }
  };

  // Group separation
  const expenseCategories = categories.filter((c: any) => c.type !== 'INCOME');
  const incomeCategories = categories.filter((c: any) => c.type === 'INCOME');

  // Expense stats
  const fixedCategories = expenseCategories.filter((c: any) => c.is_fixed === 1);
  const variableCategories = expenseCategories.filter((c: any) => c.is_fixed !== 1);
  const totalFixedBudgeted = fixedCategories.reduce((acc: number, c: any) => acc + (c.monthly_budget || 0), 0);
  const totalVariableBudgeted = variableCategories.reduce((acc: number, c: any) => acc + (c.monthly_budget || 0), 0);
  const totalExpenseBudgeted = totalFixedBudgeted + totalVariableBudgeted;
  const totalSpent = expenseCategories.reduce((acc: number, c: any) => acc + (c.spent_this_month || 0), 0);

  // Income stats
  const totalIncomeThisMonth = incomeCategories.reduce((acc: number, c: any) => acc + (c.earned_this_month || 0), 0);
  const totalIncomeThisYear = incomeCategories.reduce((acc: number, c: any) => acc + (c.earned_this_year || 0), 0);

  // Sort income categories by month earnings descending
  const sortedIncomeCategories = [...incomeCategories].sort((a: any, b: any) => (b.earned_this_month || 0) - (a.earned_this_month || 0));
  const topIncomeSource = sortedIncomeCategories[0];

  const numericNewBudget = Number(newCatBudget) || 0;

  return (
    <div className="min-h-screen bg-[#070F1E] flex flex-col">
      <Header user={user} onUserUpdate={invalidateFinance} />

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
              <h1 className="text-xl font-black text-white">Grupos, Fuentes & Métodos</h1>
              <p className="text-xs text-slate-400">Controla tus gastos fijos, entradas más fuertes y medios de pago</p>
            </div>
          </div>

          <button
            onClick={handleOpenAdd}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#00ADB5] to-[#06B6D4] text-[#0B192C] font-extrabold text-xs shadow-md shadow-[#00ADB5]/20 flex items-center gap-1.5 self-start sm:self-center hover:opacity-95 active:scale-95 transition-all whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3px]" />
            <span>
              {activeTab === 'INCOME'
                ? '+ Nueva Fuente'
                : activeTab === 'PAYMENT_METHODS'
                ? '+ Nuevo Método'
                : '+ Nuevo Grupo'}
            </span>
          </button>
        </div>

        {/* Tab Switcher: Gastos vs Ingresos vs Métodos de Pago (Responsive Horizontal Scroll) */}
        <div className="flex items-center gap-2 bg-[#0B192C] border border-[#1E3A5F] p-1.5 rounded-2xl overflow-x-auto scrollbar-none whitespace-nowrap">
          <button
            onClick={() => setActiveTab('EXPENSE')}
            className={`shrink-0 py-2.5 px-4 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'EXPENSE'
                ? 'bg-[#102A43] border border-[#00ADB5] text-[#00ADB5] shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Grupos de Gasto</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#0B192C] border border-[#1E3A5F] text-slate-300 shrink-0 font-mono">
              {expenseCategories.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('INCOME')}
            className={`shrink-0 py-2.5 px-4 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'INCOME'
                ? 'bg-[#102A43] border border-emerald-400 text-emerald-400 shadow-md'
                : 'text-slate-400 hover:text-emerald-400'
            }`}
          >
            <Briefcase className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Fuentes de Ingreso</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#0B192C] border border-emerald-900/40 text-emerald-400 shrink-0 font-mono">
              {incomeCategories.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('PAYMENT_METHODS')}
            className={`shrink-0 py-2.5 px-4 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'PAYMENT_METHODS'
                ? 'bg-[#102A43] border border-cyan-400 text-cyan-400 shadow-md'
                : 'text-slate-400 hover:text-cyan-400'
            }`}
          >
            <Wallet className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Métodos de Pago</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#0B192C] border border-cyan-900/40 text-cyan-400 shrink-0 font-mono">
              {paymentMethods.length}
            </span>
          </button>
        </div>

        {/* TAB 1: EXPENSE CONTENT */}
        {activeTab === 'EXPENSE' && (
          <div className="space-y-5">
            {/* Total Budget vs Actual Spend Banner */}
            <div className="bg-[#102A43] border border-[#243B55] rounded-3xl p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-4 gap-3 shadow-lg">
              <div className="p-2.5 rounded-xl bg-[#0B192C]/60 border border-[#1E3A5F]">
                <span className="text-[10px] sm:text-[11px] font-semibold text-cyan-400 block whitespace-nowrap">Compromisos Fijos</span>
                <p className="text-sm sm:text-base font-black text-white mt-0.5 whitespace-nowrap">{formatCOP(totalFixedBudgeted)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-[#0B192C]/60 border border-[#1E3A5F]">
                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 block whitespace-nowrap">Tope Variable</span>
                <p className="text-sm sm:text-base font-black text-white mt-0.5 whitespace-nowrap">{formatCOP(totalVariableBudgeted)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-[#0B192C]/60 border border-[#1E3A5F]">
                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 block whitespace-nowrap">Total Gastado Mes</span>
                <p className="text-sm sm:text-base font-black text-rose-400 mt-0.5 whitespace-nowrap">{formatCOP(totalSpent)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-[#0B192C]/60 border border-[#1E3A5F]">
                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 block whitespace-nowrap">Margen Restante</span>
                <p className={`text-sm sm:text-base font-black mt-0.5 whitespace-nowrap ${totalExpenseBudgeted - totalSpent >= 0 ? 'text-[#00ADB5]' : 'text-rose-400'}`}>
                  {formatCOP(totalExpenseBudgeted - totalSpent)}
                </p>
              </div>
            </div>

            {/* Fixed Commitments Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                    <span className="truncate">Compromisos Fijos Mensuales</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate">
                    Gastos ineludibles al mes (apoyo familiar a papás, suscripciones fijas, servicios)
                  </p>
                </div>
                <span className="text-xs font-black text-cyan-400 whitespace-nowrap shrink-0 px-2 py-0.5 rounded-md bg-cyan-950/40 border border-cyan-800/40">
                  {fixedCategories.length} {fixedCategories.length === 1 ? 'fijo' : 'fijos'}
                </span>
              </div>

              {fixedCategories.length === 0 ? (
                <div className="p-4 rounded-2xl bg-[#0B192C] border border-[#1E3A5F] text-center text-xs text-slate-400">
                  No tienes ningún grupo marcado como gasto fijo. Crea uno o edita un grupo existente.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {fixedCategories.map((cat: any) => (
                    <BudgetCard
                      key={cat.id}
                      category={cat}
                      onBudgetUpdated={invalidateFinance}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Variable Categories Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#00ADB5] shrink-0" />
                    <span className="truncate">Presupuestos de Gastos Variables</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate">
                    Topes recomendados para frenar fugas diarias de dinero y compras hormiga
                  </p>
                </div>
                <span className="text-xs font-black text-[#00ADB5] whitespace-nowrap shrink-0 px-2 py-0.5 rounded-md bg-teal-950/40 border border-teal-800/40">
                  {variableCategories.length} {variableCategories.length === 1 ? 'grupo' : 'grupos'}
                </span>
              </div>

              {variableCategories.length === 0 ? (
                <div className="p-4 rounded-2xl bg-[#0B192C] border border-[#1E3A5F] text-center text-xs text-slate-400">
                  No tienes grupos de gastos variables registrados.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {variableCategories.map((cat: any) => (
                    <BudgetCard
                      key={cat.id}
                      category={cat}
                      onBudgetUpdated={invalidateFinance}
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
                <span className="text-[11px] font-semibold text-slate-400 block whitespace-nowrap">Total Entradas del Mes</span>
                <p className="text-xl font-black text-emerald-400 mt-0.5 whitespace-nowrap">+{formatCOP(totalIncomeThisMonth)}</p>
                <span className="text-[10px] text-slate-500 mt-1 block">Suma de todos tus ingresos</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#0B192C]/80 border border-[#243B55]">
                <span className="text-[11px] font-semibold text-slate-400 block whitespace-nowrap">Total Acumulado Año</span>
                <p className="text-xl font-black text-white mt-0.5 whitespace-nowrap">+{formatCOP(totalIncomeThisYear)}</p>
                <span className="text-[10px] text-slate-500 mt-1 block">Histórico anual en vivo</span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-600/40">
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5 whitespace-nowrap">
                  <Award className="w-3.5 h-3.5 shrink-0" />
                  <span>Fuente Más Fuerte</span>
                </span>
                <p className="text-base font-black text-white mt-1 truncate">
                  {topIncomeSource ? topIncomeSource.name : 'Aún sin registros'}
                </p>
                <span className="text-[10px] text-emerald-300 block mt-0.5 whitespace-nowrap">
                  {topIncomeSource ? `Generó ${formatCOP(topIncomeSource.earned_this_month || 0)} este mes` : 'Registra tus ingresos'}
                </span>
              </div>
            </div>

            {/* Income Sources Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="truncate">Tus Fuentes de Ingreso & Clientes</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate">
                    Clasificación de quincenas, suscripciones de sistemas, servicios y freelance
                  </p>
                </div>
                <span className="text-xs font-black text-emerald-400 whitespace-nowrap shrink-0 px-2 py-0.5 rounded-md bg-emerald-950/40 border border-emerald-800/40">
                  {incomeCategories.length} {incomeCategories.length === 1 ? 'fuente' : 'fuentes'}
                </span>
              </div>

              {incomeCategories.length === 0 ? (
                <div className="p-6 rounded-3xl bg-[#0B192C] border border-[#1E3A5F] text-center text-xs text-slate-400">
                  <Briefcase className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-40" />
                  <p className="text-slate-300 font-bold">No tienes fuentes de ingreso creadas</p>
                  <button
                    onClick={handleOpenAdd}
                    className="mt-3 text-xs text-emerald-400 underline font-bold"
                  >
                    Crear tu primera fuente (ej: Quincena, Suscripciones)
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {sortedIncomeCategories.map((cat: any, idx: number) => (
                    <IncomeSourceCard
                      key={cat.id}
                      category={cat}
                      totalMonthlyIncome={totalIncomeThisMonth}
                      isTopSource={idx === 0 && (cat.earned_this_month || 0) > 0}
                      onUpdated={invalidateFinance}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PAYMENT METHODS CONTENT */}
        {activeTab === 'PAYMENT_METHODS' && (
          <div className="space-y-5">
            {/* Payment Methods Banner */}
            <div className="bg-[#102A43] border border-[#243B55] rounded-3xl p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-cyan-400" />
                  <span>Control de Cuentas & Métodos de Pago</span>
                </h2>
                <p className="text-xs text-slate-300 mt-1 max-w-xl">
                  Cada usuario tiene sus propios métodos de pago aislados. Puedes crear, editar o eliminar tus cuentas bancarias, billeteras (Nequi, Daviplata) o tarjetas para saber por dónde se mueve cada peso.
                </p>
              </div>

              <button
                onClick={() => setIsAddMethodOpen(true)}
                className="py-2.5 px-4 rounded-xl bg-cyan-400 text-slate-950 font-black text-xs hover:bg-cyan-300 flex items-center gap-1.5 shadow-md shadow-cyan-400/20 shrink-0 whitespace-nowrap"
              >
                <Plus className="w-4 h-4 stroke-[3px]" />
                <span>+ Agregar Cuenta / Medio</span>
              </button>
            </div>

            {/* Payment Methods Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {paymentMethods.map((pm: any) => {
                const IconComponent =
                  pm.type === 'WALLET'
                    ? Smartphone
                    : pm.type === 'CASH'
                    ? Banknote
                    : pm.type === 'CARD'
                    ? CreditCard
                    : Building2;

                return (
                  <div
                    key={pm.id}
                    className="p-4 rounded-2xl bg-[#0B192C] border border-[#1E3A5F] hover:border-[#243B55] transition-all space-y-3 shadow-lg"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0"
                          style={{ backgroundColor: pm.color || '#00ADB5' }}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-black text-white truncate">{pm.name}</h4>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold whitespace-nowrap">
                            {pm.type === 'WALLET'
                              ? 'Billetera'
                              : pm.type === 'CASH'
                              ? 'Efectivo'
                              : pm.type === 'CARD'
                              ? 'Tarjeta'
                              : 'Banco / PSE'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenEditMethod(pm)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
                          title="Editar método de pago"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {paymentMethods.length > 1 && (
                          <button
                            onClick={() => handleDeleteMethod(pm.id, pm.name)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                            title="Eliminar método"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#1E3A5F]/60">
                      <div className="p-2 rounded-xl bg-[#102A43]/60">
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 whitespace-nowrap">
                          <ArrowDownRight className="w-3 h-3 shrink-0" />
                          <span>Ingresó</span>
                        </span>
                        <p className="text-xs font-black text-white mt-0.5 whitespace-nowrap">
                          {formatCOP(pm.income_this_month || 0)}
                        </p>
                      </div>

                      <div className="p-2 rounded-xl bg-[#102A43]/60">
                        <span className="text-[10px] text-rose-400 font-bold flex items-center gap-1 whitespace-nowrap">
                          <ArrowUpRight className="w-3 h-3 shrink-0" />
                          <span>Salió</span>
                        </span>
                        <p className="text-xs font-black text-white mt-0.5 whitespace-nowrap">
                          {formatCOP(pm.expense_this_month || 0)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                      <span className="whitespace-nowrap">Movimientos registrados:</span>
                      <span className="font-extrabold text-white whitespace-nowrap font-mono">{pm.movement_count || 0}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal: Edit Payment Method */}
        {editingMethod && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-[#0B192C] border border-cyan-400 rounded-3xl p-6 shadow-2xl relative">
              <div className="flex items-center justify-between pb-3 border-b border-[#1E3A5F]">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-cyan-400" />
                  <span>Editar Método de Pago</span>
                </span>
                <button
                  onClick={() => setEditingMethod(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEditMethod} className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre del Método</label>
                  <input
                    type="text"
                    value={editMethodName}
                    onChange={(e) => setEditMethodName(e.target.value)}
                    className="w-full bg-[#102A43] border border-[#243B55] text-white text-xs px-3 py-2.5 rounded-xl focus:border-cyan-400 focus:outline-none"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tipo de Medio</label>
                  <select
                    value={editMethodType}
                    onChange={(e) => setEditMethodType(e.target.value)}
                    className="w-full bg-[#102A43] border border-[#243B55] text-white text-xs px-3 py-2.5 rounded-xl focus:border-cyan-400 focus:outline-none"
                  >
                    {METHOD_TYPES.map((mt) => (
                      <option key={mt.id} value={mt.id}>
                        {mt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Color Distintivo</label>
                  <div className="flex items-center gap-2 pt-1">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditMethodColor(c)}
                        className={`w-7 h-7 rounded-full border-2 transition-transform ${
                          editMethodColor === c ? 'scale-110 border-white' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[#1E3A5F]">
                  <button
                    type="button"
                    onClick={() => setEditingMethod(null)}
                    className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEditMethod}
                    className="px-4 py-2 rounded-xl bg-cyan-400 text-slate-950 font-extrabold text-xs shadow-md hover:bg-cyan-300 flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3px]" />
                    <span>Guardar Cambios</span>
                  </button>
                </div>
              </form>
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

        {/* Modal / Inline Drawer for New Payment Method */}
        {isAddMethodOpen && (
          <div className="bg-[#0B192C] border border-cyan-400 rounded-3xl p-5 shadow-2xl animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E3A5F]">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-cyan-400" />
                <span>Agregar Nuevo Método / Cuenta de Pago</span>
              </span>

              <button
                onClick={() => setIsAddMethodOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePaymentMethod} className="mt-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nombre del Medio o Cuenta
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Nu Colombia, Dale, Davivienda, Caja Oficina"
                    value={newMethodName}
                    onChange={(e) => setNewMethodName(e.target.value)}
                    className="w-full bg-[#102A43] border border-[#243B55] text-white text-xs px-3 py-2 rounded-xl focus:border-cyan-400 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tipo de Cuenta / Medio
                  </label>
                  <select
                    value={newMethodType}
                    onChange={(e) => setNewMethodType(e.target.value)}
                    className="w-full bg-[#102A43] border border-[#243B55] text-white text-xs px-3 py-2 rounded-xl focus:border-cyan-400 focus:outline-none"
                  >
                    {METHOD_TYPES.map((mt) => (
                      <option key={mt.id} value={mt.id}>
                        {mt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Color selector */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs font-semibold text-slate-400 mr-1">Color Distintivo:</span>
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewMethodColor(c)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      newMethodColor === c ? 'scale-110 border-white' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddMethodOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMethod}
                  className="px-4 py-2 rounded-xl bg-cyan-400 text-slate-950 font-extrabold text-xs shadow-md hover:bg-cyan-300 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3px]" />
                  <span>Guardar Método</span>
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
        onExpenseAdded={invalidateFinance}
        categories={categories}
      />
    </div>
  );
}
