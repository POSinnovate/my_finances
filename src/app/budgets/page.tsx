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
  Edit3,
  Calendar,
  Clock
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
  const [newCatFrequency, setNewCatFrequency] = useState<'MONTHLY' | 'ONCE' | 'NONE'>('MONTHLY');
  const [newCatDueDay, setNewCatDueDay] = useState('');
  const [newCatSpecificDate, setNewCatSpecificDate] = useState('');
  const [newCatHasMultiple, setNewCatHasMultiple] = useState(false);
  const [newCatItems, setNewCatItems] = useState<Array<{ amount: string; due_day: string; specific_date?: string; frequency: 'MONTHLY' | 'ONCE' }>>([
    { amount: '', due_day: '15', frequency: 'MONTHLY' },
    { amount: '', due_day: '30', frequency: 'MONTHLY' },
  ]);
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

  // Edit Category Modal (Grupos de Gasto y Fuentes de Ingreso)
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryBudget, setEditCategoryBudget] = useState('');
  const [editCategoryColor, setEditCategoryColor] = useState(COLOR_OPTIONS[0]);
  const [editCategoryIsFixed, setEditCategoryIsFixed] = useState(false);
  const [editCategoryFrequency, setEditCategoryFrequency] = useState<'MONTHLY' | 'ONCE' | 'NONE'>('MONTHLY');
  const [editCategoryDueDay, setEditCategoryDueDay] = useState('');
  const [editCategorySpecificDate, setEditCategorySpecificDate] = useState('');
  const [editCategoryHasMultiple, setEditCategoryHasMultiple] = useState(false);
  const [editCategoryItems, setEditCategoryItems] = useState<Array<{ id?: string; amount: string; due_day: string; specific_date?: string; frequency: 'MONTHLY' | 'ONCE' }>>([]);
  const [isSavingEditCategory, setIsSavingEditCategory] = useState(false);

  const handleOpenAdd = () => {
    if (activeTab === 'PAYMENT_METHODS') {
      setIsAddMethodOpen(true);
    } else {
      setNewCatType(activeTab);
      setNewCatColor(activeTab === 'INCOME' ? '#10B981' : '#00ADB5');
      setNewCatFrequency('MONTHLY');
      setNewCatDueDay(activeTab === 'INCOME' ? '15' : '');
      setNewCatSpecificDate('');
      setNewCatHasMultiple(false);
      setNewCatItems([
        { amount: '', due_day: '15', frequency: 'MONTHLY' },
        { amount: '', due_day: '30', frequency: 'MONTHLY' },
      ]);
      setIsAddCategoryOpen(true);
    }
  };

  const handleAddNewCatItem = () => {
    setNewCatItems(prev => [
      ...prev,
      { amount: '', due_day: '15', frequency: 'MONTHLY' }
    ]);
  };

  const handleUpdateNewCatItem = (index: number, field: string, value: any) => {
    setNewCatItems(prev => prev.map((it, idx) => idx === index ? { ...it, [field]: value } : it));
  };

  const handleRemoveNewCatItem = (index: number) => {
    setNewCatItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleAddEditCatItem = () => {
    setEditCategoryItems(prev => [
      ...prev,
      { amount: '', due_day: '15', frequency: 'MONTHLY' }
    ]);
  };

  const handleUpdateEditCatItem = (index: number, field: string, value: any) => {
    setEditCategoryItems(prev => prev.map((it, idx) => idx === index ? { ...it, [field]: value } : it));
  };

  const handleRemoveEditCatItem = (index: number) => {
    setEditCategoryItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    if (newCatHasMultiple) {
      const validItems = newCatItems.filter(it => Number(it.amount) > 0);
      if (validItems.length === 0) {
        toast.error('Debes agregar al menos una fecha con monto mayor a 0');
        return;
      }
    }

    setIsSubmittingCat(true);
    try {
      const itemsPayload = newCatHasMultiple
        ? newCatItems
            .filter(it => Number(it.amount) > 0)
            .map(it => ({
              amount: Number(it.amount),
              due_day: it.frequency === 'MONTHLY' && it.due_day ? Number(it.due_day) : null,
              specific_date: it.frequency === 'ONCE' && it.specific_date ? it.specific_date : null,
              frequency: it.frequency,
            }))
        : [];

      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCatName.trim(),
          type: newCatType,
          monthly_budget: newCatHasMultiple ? undefined : (Number(newCatBudget) || 0),
          color: newCatColor,
          is_fixed: newCatType === 'EXPENSE' ? newCatIsFixed : false,
          frequency: newCatFrequency,
          due_day: newCatFrequency === 'MONTHLY' && newCatDueDay ? Number(newCatDueDay) : null,
          specific_date: newCatFrequency === 'ONCE' && newCatSpecificDate ? newCatSpecificDate : null,
          has_multiple_items: newCatHasMultiple ? 1 : 0,
          items: itemsPayload,
        }),
      });

      if (res.ok) {
        toast.success(newCatType === 'INCOME' ? `Fuente "${newCatName}" creada` : `Grupo "${newCatName}" creado`);
        setNewCatName('');
        setNewCatBudget('');
        setNewCatDueDay('');
        setNewCatSpecificDate('');
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

  const handleOpenEditCategory = (cat: any) => {
    setEditingCategory(cat);
    setEditCategoryName(cat.name);
    setEditCategoryBudget(cat.monthly_budget ? cat.monthly_budget.toString() : '');
    setEditCategoryColor(cat.color || (cat.type === 'INCOME' ? '#10B981' : '#00ADB5'));
    setEditCategoryIsFixed(cat.is_fixed === 1);
    setEditCategoryFrequency(cat.frequency || (cat.specific_date ? 'ONCE' : (cat.due_day ? 'MONTHLY' : 'MONTHLY')));
    setEditCategoryDueDay(cat.due_day ? String(cat.due_day) : '');
    setEditCategorySpecificDate(cat.specific_date ? String(cat.specific_date).slice(0, 10) : '');

    const hasMultiple = cat.has_multiple_items === 1 || (Array.isArray(cat.items) && cat.items.length > 0);
    setEditCategoryHasMultiple(hasMultiple);

    if (Array.isArray(cat.items) && cat.items.length > 0) {
      setEditCategoryItems(cat.items.map((it: any) => ({
        id: it.id,
        amount: it.amount ? String(it.amount) : '',
        due_day: it.due_day ? String(it.due_day) : '',
        specific_date: it.specific_date ? String(it.specific_date).slice(0, 10) : '',
        frequency: it.frequency || (it.specific_date ? 'ONCE' : 'MONTHLY'),
      })));
    } else {
      setEditCategoryItems([
        { amount: cat.monthly_budget ? String(cat.monthly_budget) : '', due_day: cat.due_day ? String(cat.due_day) : '15', frequency: 'MONTHLY' }
      ]);
    }
  };

  const handleSaveEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    if (!editCategoryName.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    if (editCategoryHasMultiple) {
      const validItems = editCategoryItems.filter(it => Number(it.amount) > 0);
      if (validItems.length === 0) {
        toast.error('Debes tener al menos una fecha con monto mayor a 0');
        return;
      }
    }

    setIsSavingEditCategory(true);
    try {
      const itemsPayload = editCategoryHasMultiple
        ? editCategoryItems
            .filter(it => Number(it.amount) > 0)
            .map(it => ({
              id: it.id,
              amount: Number(it.amount),
              due_day: it.frequency === 'MONTHLY' && it.due_day ? Number(it.due_day) : null,
              specific_date: it.frequency === 'ONCE' && it.specific_date ? it.specific_date : null,
              frequency: it.frequency,
            }))
        : [];

      const res = await fetch('/api/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingCategory.id,
          name: editCategoryName.trim(),
          color: editCategoryColor,
          monthly_budget: editCategoryHasMultiple ? undefined : (Number(editCategoryBudget) || 0),
          is_fixed: editingCategory.type === 'INCOME' ? 0 : (editCategoryIsFixed ? 1 : 0),
          frequency: editCategoryFrequency,
          due_day: editCategoryFrequency === 'MONTHLY' && editCategoryDueDay ? Number(editCategoryDueDay) : null,
          specific_date: editCategoryFrequency === 'ONCE' && editCategorySpecificDate ? editCategorySpecificDate : null,
          has_multiple_items: editCategoryHasMultiple ? 1 : 0,
          items: itemsPayload,
        }),
      });

      if (res.ok) {
        toast.success(
          editingCategory.type === 'INCOME'
            ? `Fuente "${editCategoryName.trim()}" actualizada`
            : `Grupo "${editCategoryName.trim()}" actualizado`
        );
        setEditingCategory(null);
        invalidateFinance();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Error al actualizar');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setIsSavingEditCategory(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string, type: string) => {
    const isIncome = type === 'INCOME';
    const msg = isIncome
      ? `¿Eliminar la fuente de ingreso "${name}"? Los movimientos ya registrados se conservarán.`
      : `¿Eliminar el grupo de gasto "${name}"? Los movimientos registrados no se borrarán.`;
    if (!confirm(msg)) return;

    try {
      const res = await fetch(`/api/categories?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(isIncome ? `Fuente "${name}" eliminada` : `Grupo "${name}" eliminado`);
        invalidateFinance();
      } else {
        toast.error('Error al eliminar');
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
            className="py-2.5 px-4 rounded-xl bg-linear-to-r from-[#00ADB5] to-[#06B6D4] text-[#0B192C] font-extrabold text-xs shadow-md shadow-[#00ADB5]/20 flex items-center gap-1.5 self-start sm:self-center hover:opacity-95 active:scale-95 transition-all whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3px]" />
            <span>
              {activeTab === 'INCOME'
                ? 'Nueva Fuente'
                : activeTab === 'PAYMENT_METHODS'
                ? 'Nuevo Método'
                : 'Nuevo Grupo'}
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
                      onEdit={handleOpenEditCategory}
                      onDelete={(id, name) => handleDeleteCategory(id, name, 'EXPENSE')}
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
                      onEdit={handleOpenEditCategory}
                      onDelete={(id, name) => handleDeleteCategory(id, name, 'EXPENSE')}
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
            <div className="bg-linear-to-r from-[#0B192C] to-[#102A43] border border-emerald-500/30 rounded-3xl p-5 shadow-xl grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-[#0B192C]/80 border border-[#243B55]">
                <span className="text-[11px] font-semibold text-slate-400 block whitespace-nowrap">Total Entradas del Mes</span>
                <p className="text-xl font-black text-emerald-400 mt-0.5 whitespace-nowrap">{formatCOP(totalIncomeThisMonth)}</p>
                <span className="text-[10px] text-slate-500 mt-1 block">Suma de todos tus ingresos</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#0B192C]/80 border border-[#243B55]">
                <span className="text-[11px] font-semibold text-slate-400 block whitespace-nowrap">Total Acumulado Año</span>
                <p className="text-xl font-black text-white mt-0.5 whitespace-nowrap">{formatCOP(totalIncomeThisYear)}</p>
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
                      onEdit={handleOpenEditCategory}
                      onDelete={(id, name) => handleDeleteCategory(id, name, 'INCOME')}
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
                <span>Agregar Cuenta / Medio</span>
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
                        {pm.transfers_in > 0 && (
                          <span className="text-[9px] text-cyan-300 font-medium block mt-0.5 truncate">
                            +{formatCOP(pm.transfers_in)} recibidos
                          </span>
                        )}
                      </div>

                      <div className="p-2 rounded-xl bg-[#102A43]/60">
                        <span className="text-[10px] text-rose-400 font-bold flex items-center gap-1 whitespace-nowrap">
                          <ArrowUpRight className="w-3 h-3 shrink-0" />
                          <span>Salió</span>
                        </span>
                        <p className="text-xs font-black text-white mt-0.5 whitespace-nowrap">
                          {formatCOP(pm.expense_this_month || 0)}
                        </p>
                        {pm.transfers_out > 0 && (
                          <span className="text-[9px] text-cyan-300 font-medium block mt-0.5 truncate">
                            -{formatCOP(pm.transfers_out)} enviados
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Account Net Balance */}
                    <div className="p-2 rounded-xl bg-[#070F1E] border border-[#1E3A5F] flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-medium">Balance en cuenta:</span>
                      <span className={`text-xs font-extrabold font-mono ${
                        (pm.net_balance ?? 0) >= 0 ? 'text-cyan-400' : 'text-rose-400'
                      }`}>
                        {formatCOP(pm.net_balance ?? 0)}
                      </span>
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

        {/* Modal: Edit Category (Expense or Income) */}
        {editingCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className={`w-full max-w-md bg-[#0B192C] border rounded-3xl p-6 shadow-2xl relative ${
              editingCategory.type === 'INCOME' ? 'border-emerald-500' : 'border-[#00ADB5]'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-[#1E3A5F]">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  {editingCategory.type === 'INCOME' ? (
                    <>
                      <Briefcase className="w-4 h-4 text-emerald-400" />
                      <span>Editar Fuente de Ingreso</span>
                    </>
                  ) : (
                    <>
                      <Layers className="w-4 h-4 text-[#00ADB5]" />
                      <span>Editar Grupo de Gasto</span>
                    </>
                  )}
                </span>
                <button
                  onClick={() => setEditingCategory(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEditCategory} className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {editingCategory.type === 'INCOME' ? 'Nombre de la Fuente' : 'Nombre del Grupo'}
                  </label>
                  <input
                    type="text"
                    value={editCategoryName}
                    onChange={(e) => setEditCategoryName(e.target.value)}
                    className="w-full bg-[#102A43] border border-[#243B55] text-white text-xs px-3 py-2.5 rounded-xl focus:border-[#00ADB5] focus:outline-none"
                    required
                    autoFocus
                  />
                </div>

                {/* Selector de Modalidad */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Modalidad de Programación
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-[#102A43] rounded-2xl border border-[#243B55]">
                    <button
                      type="button"
                      onClick={() => setEditCategoryHasMultiple(false)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        !editCategoryHasMultiple
                          ? 'bg-[#00ADB5] text-[#0B192C] shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Fecha Única</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditCategoryHasMultiple(true);
                        if (editCategoryItems.length === 0) {
                          setEditCategoryItems([
                            { amount: editCategoryBudget || '', due_day: editCategoryDueDay || '15', frequency: 'MONTHLY' },
                            { amount: '', due_day: '30', frequency: 'MONTHLY' },
                          ]);
                        }
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        editCategoryHasMultiple
                          ? 'bg-[#00ADB5] text-[#0B192C] shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Múltiples Fechas</span>
                    </button>
                  </div>
                </div>

                {!editCategoryHasMultiple ? (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-300">
                          {editingCategory.type === 'INCOME' ? 'Monto Mensual Estimado ($ COP)' : 'Presupuesto Mensual Estimado ($ COP)'}
                        </label>
                        {Number(editCategoryBudget) > 0 && (
                          <span className="text-[11px] text-[#00ADB5] font-bold">
                            {formatCOP(Number(editCategoryBudget))}
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        value={editCategoryBudget}
                        onChange={(e) => setEditCategoryBudget(e.target.value)}
                        placeholder={editingCategory.type === 'INCOME' ? 'Ej: 1500000' : 'Ej: 500000'}
                        className="w-full bg-[#102A43] border border-[#243B55] text-white text-xs px-3 py-2.5 rounded-xl focus:border-[#00ADB5] focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {editingCategory.type === 'INCOME'
                          ? 'Este valor alimentará tu verdadero ingreso mensual de manera dinámica.'
                          : 'Tope máximo o compromiso para este grupo.'}
                      </span>
                    </div>

                    {/* Programación y Fechas Clave */}
                    <div className="p-3 rounded-2xl bg-[#102A43]/70 border border-[#243B55] space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                        <Calendar className="w-4 h-4 text-[#00ADB5]" />
                        <span>Programación y Fecha Clave</span>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditCategoryFrequency('MONTHLY')}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all ${
                            editCategoryFrequency === 'MONTHLY'
                              ? 'bg-[#00ADB5] text-[#0B192C]'
                              : 'bg-[#0B192C] text-slate-400 hover:text-white border border-[#243B55]'
                          }`}
                        >
                          Día Fijo Mes
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditCategoryFrequency('ONCE')}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all ${
                            editCategoryFrequency === 'ONCE'
                              ? 'bg-[#00ADB5] text-[#0B192C]'
                              : 'bg-[#0B192C] text-slate-400 hover:text-white border border-[#243B55]'
                          }`}
                        >
                          Fecha Única
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditCategoryFrequency('NONE')}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all ${
                            editCategoryFrequency === 'NONE'
                              ? 'bg-[#00ADB5] text-[#0B192C]'
                              : 'bg-[#0B192C] text-slate-400 hover:text-white border border-[#243B55]'
                          }`}
                        >
                          Sin Fecha
                        </button>
                      </div>

                      {editCategoryFrequency === 'MONTHLY' && (
                        <div>
                          <label className="block text-[11px] font-medium text-slate-300 mb-1">
                            Día del mes (1 al 31)
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={31}
                            value={editCategoryDueDay}
                            onChange={(e) => setEditCategoryDueDay(e.target.value)}
                            placeholder="Ej: 15 (quincena), 30 (fin de mes), 27 (plan)"
                            className="w-full bg-[#0B192C] border border-[#243B55] text-white text-xs px-3 py-2 rounded-xl focus:border-[#00ADB5] focus:outline-none"
                          />
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            Se proyectará cada mes en este día para calcular tu gasto diario inteligente.
                          </span>
                        </div>
                      )}

                      {editCategoryFrequency === 'ONCE' && (
                        <div>
                          <label className="block text-[11px] font-medium text-slate-300 mb-1">
                            Fecha exacta (Año-Mes-Día)
                          </label>
                          <input
                            type="date"
                            value={editCategorySpecificDate}
                            onChange={(e) => setEditCategorySpecificDate(e.target.value)}
                            className="w-full bg-[#0B192C] border border-[#243B55] text-white text-xs px-3 py-2 rounded-xl focus:border-[#00ADB5] focus:outline-none"
                          />
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            Para salidas, seguros, viajes o gastos puntuales con fecha definida.
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  /* Múltiples Fechas / Quincenas */
                  <div className="space-y-3 p-3.5 rounded-2xl bg-[#102A43]/50 border border-[#243B55]">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#00ADB5]" />
                          <span>Fechas del Grupo</span>
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Monto y día de cada cobro o quincena. El total se calcula sumando los items.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddEditCatItem}
                        className="px-2.5 py-1 rounded-lg bg-[#00ADB5]/15 text-[#00ADB5] hover:bg-[#00ADB5]/25 text-[11px] font-bold flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-6 h-6" />
                      </button>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {editCategoryItems.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-[#0B192C] p-2 rounded-xl border border-[#1E3A5F]">
                          <div className="flex-1 min-w-0">
                            <label className="text-[9px] text-slate-400 font-bold block mb-0.5">Monto ($ COP)</label>
                            <input
                              type="number"
                              placeholder="Ej: 1200000"
                              value={item.amount}
                              onChange={(e) => handleUpdateEditCatItem(idx, 'amount', e.target.value)}
                              className="w-full bg-[#102A43] border border-[#243B55] text-white text-xs px-2.5 py-1.5 rounded-lg focus:border-[#00ADB5] focus:outline-none"
                            />
                          </div>

                          <div className="w-24 shrink-0">
                            <label className="text-[9px] text-slate-400 font-bold block mb-0.5">Día del mes</label>
                            <input
                              type="number"
                              min={1}
                              max={31}
                              placeholder="1-31"
                              value={item.due_day}
                              onChange={(e) => handleUpdateEditCatItem(idx, 'due_day', e.target.value)}
                              className="w-full bg-[#102A43] border border-[#243B55] text-white text-xs px-2.5 py-1.5 rounded-lg focus:border-[#00ADB5] focus:outline-none text-center font-bold"
                            />
                          </div>

                          {editCategoryItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveEditCatItem(idx)}
                              className="p-1.5 mt-3 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                              title="Eliminar fecha"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Live Total */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#1E3A5F] text-xs">
                      <span className="text-slate-400 font-medium">Total mensual calculado:</span>
                      <span className="text-emerald-400 font-mono font-black text-sm">
                        {formatCOP(editCategoryItems.reduce((sum, it) => sum + (Number(it.amount) || 0), 0))}
                      </span>
                    </div>
                  </div>
                )}

                {editingCategory.type !== 'INCOME' && (
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 pt-1">
                    <input
                      type="checkbox"
                      checked={editCategoryIsFixed}
                      onChange={(e) => setEditCategoryIsFixed(e.target.checked)}
                      className="rounded border-[#243B55] text-[#00ADB5] focus:ring-0"
                    />
                    <span>¿Es un compromiso fijo mensual obligatorio? (Ej: papás, arriendo)</span>
                  </label>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Color Distintivo</label>
                  <div className="flex items-center gap-2 pt-1">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditCategoryColor(c)}
                        className={`w-7 h-7 rounded-full border-2 transition-transform ${
                          editCategoryColor === c ? 'scale-110 border-white' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[#1E3A5F]">
                  <button
                    type="button"
                    onClick={() => setEditingCategory(null)}
                    className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEditCategory}
                    className={`px-4 py-2 rounded-xl font-extrabold text-xs shadow-md flex items-center gap-1.5 transition-colors ${
                      editingCategory.type === 'INCOME'
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                        : 'bg-[#00ADB5] hover:opacity-90 text-[#0B192C]'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3px]" />
                    <span>{isSavingEditCategory ? 'Guardando...' : 'Guardar Cambios'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Crear Nueva Categoría / Fuente */}
        {isAddCategoryOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className={`w-full max-w-md bg-[#0B192C] border rounded-3xl p-6 shadow-2xl relative ${
              newCatType === 'INCOME' ? 'border-emerald-500' : 'border-[#00ADB5]'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-[#1E3A5F]">
                <div className="flex items-center gap-2 whitespace-nowrap">
                  {newCatType === 'INCOME' ? (
                    <Briefcase className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Layers className="w-4 h-4 text-[#00ADB5]" />
                  )}

                  <div className="flex items-center bg-[#102A43] py-1.5 px-4 rounded-lg border border-[#243B55]">
                    <button
                      type="button"
                      onClick={() => {
                        setNewCatType('EXPENSE');
                        setNewCatColor('#00ADB5');
                      }}
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-md transition-all ${
                        newCatType === 'EXPENSE' ? 'bg-[#00ADB5] text-[#0B192C]' : 'text-slate-400'
                      }`}
                    >
                      Grupo de Gasto
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewCatType('INCOME');
                        setNewCatColor('#10B981');
                      }}
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

              <form onSubmit={handleCreateCategory} className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {newCatType === 'INCOME' ? 'Nombre de la Fuente de Ingreso' : 'Nombre del Grupo de Gasto'}
                  </label>
                  <input
                    type="text"
                    placeholder={newCatType === 'INCOME' ? 'Ej: Suscripciones Sistemas, Quincenas' : 'Ej: Mascotas, Gimnasio, Arriendo'}
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full bg-[#102A43] border border-[#243B55] text-white text-xs px-3 py-2.5 rounded-xl focus:border-[#00ADB5] focus:outline-none"
                    required
                    autoFocus
                  />
                </div>

                {/* Selector de Modalidad */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Modalidad de Programación
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-[#102A43] rounded-2xl border border-[#243B55]">
                    <button
                      type="button"
                      onClick={() => setNewCatHasMultiple(false)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        !newCatHasMultiple
                          ? 'bg-[#00ADB5] text-[#0B192C] shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Fecha Única</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewCatHasMultiple(true)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        newCatHasMultiple
                          ? 'bg-[#00ADB5] text-[#0B192C] shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Múltiples Fechas / Quincenas</span>
                    </button>
                  </div>
                </div>

                {!newCatHasMultiple ? (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-300">
                          {newCatType === 'INCOME' ? 'Monto Estimado por Ingreso / Mes ($ COP)' : 'Presupuesto Estimado Mensual ($ COP)'}
                        </label>
                        {Number(newCatBudget) > 0 && (
                          <span className="text-[11px] text-[#00ADB5] font-bold">
                            {formatCOP(Number(newCatBudget))}
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        placeholder={newCatType === 'INCOME' ? 'Ej: 1500000' : 'Ej: 150000'}
                        value={newCatBudget}
                        onChange={(e) => setNewCatBudget(e.target.value)}
                        className="w-full bg-[#102A43] border border-[#243B55] text-white text-xs px-3 py-2.5 rounded-xl focus:border-[#00ADB5] focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {newCatType === 'INCOME'
                          ? 'Calculará tu ingreso mensual proyectado de forma dinámica.'
                          : 'Tope máximo o compromiso para este grupo.'}
                      </span>
                    </div>

                    {/* Programación y Fechas Clave */}
                    <div className="p-3 rounded-2xl bg-[#102A43]/70 border border-[#243B55] space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                        <Calendar className="w-4 h-4 text-[#00ADB5]" />
                        <span>Programación y Fecha Clave</span>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setNewCatFrequency('MONTHLY')}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all ${
                            newCatFrequency === 'MONTHLY'
                              ? 'bg-[#00ADB5] text-[#0B192C]'
                              : 'bg-[#0B192C] text-slate-400 hover:text-white border border-[#243B55]'
                          }`}
                        >
                          Día Fijo Mes
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewCatFrequency('ONCE')}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all ${
                            newCatFrequency === 'ONCE'
                              ? 'bg-[#00ADB5] text-[#0B192C]'
                              : 'bg-[#0B192C] text-slate-400 hover:text-white border border-[#243B55]'
                          }`}
                        >
                          Fecha Única
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewCatFrequency('NONE')}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all ${
                            newCatFrequency === 'NONE'
                              ? 'bg-[#00ADB5] text-[#0B192C]'
                              : 'bg-[#0B192C] text-slate-400 hover:text-white border border-[#243B55]'
                          }`}
                        >
                          Sin Fecha
                        </button>
                      </div>

                      {newCatFrequency === 'MONTHLY' && (
                        <div>
                          <label className="block text-[11px] font-medium text-slate-300 mb-1">
                            Día del mes (1 al 31)
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={31}
                            value={newCatDueDay}
                            onChange={(e) => setNewCatDueDay(e.target.value)}
                            placeholder="Ej: 15 (quincena), 30 (fin de mes), 27 (plan)"
                            className="w-full bg-[#0B192C] border border-[#243B55] text-white text-xs px-3 py-2 rounded-xl focus:border-[#00ADB5] focus:outline-none"
                          />
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            Se proyectará cada mes en este día para calcular tu gasto diario inteligente.
                          </span>
                        </div>
                      )}

                      {newCatFrequency === 'ONCE' && (
                        <div>
                          <label className="block text-[11px] font-medium text-slate-300 mb-1">
                            Fecha exacta (Año-Mes-Día)
                          </label>
                          <input
                            type="date"
                            value={newCatSpecificDate}
                            onChange={(e) => setNewCatSpecificDate(e.target.value)}
                            className="w-full bg-[#0B192C] border border-[#243B55] text-white text-xs px-3 py-2 rounded-xl focus:border-[#00ADB5] focus:outline-none"
                          />
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            Para salidas, seguros, viajes o gastos puntuales con fecha definida.
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  /* Múltiples Fechas / Quincenas */
                  <div className="space-y-3 p-3.5 rounded-2xl bg-[#102A43]/50 border border-[#243B55]">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#00ADB5]" />
                          <span>Fechas o Quincenas del Grupo</span>
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Monto y día de cada cobro o quincena. El total se calcula sumando los items.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddNewCatItem}
                        className="px-2.5 py-1 rounded-lg bg-[#00ADB5]/15 text-[#00ADB5] hover:bg-[#00ADB5]/25 text-[11px] font-bold flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Agregar Fecha</span>
                      </button>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {newCatItems.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-[#0B192C] p-2 rounded-xl border border-[#1E3A5F]">
                          <div className="flex-1 min-w-0">
                            <label className="text-[9px] text-slate-400 font-bold block mb-0.5">Monto ($ COP)</label>
                            <input
                              type="number"
                              placeholder="Ej: 1200000"
                              value={item.amount}
                              onChange={(e) => handleUpdateNewCatItem(idx, 'amount', e.target.value)}
                              className="w-full bg-[#102A43] border border-[#243B55] text-white text-xs px-2.5 py-1.5 rounded-lg focus:border-[#00ADB5] focus:outline-none"
                            />
                          </div>

                          <div className="w-24 shrink-0">
                            <label className="text-[9px] text-slate-400 font-bold block mb-0.5">Día del mes</label>
                            <input
                              type="number"
                              min={1}
                              max={31}
                              placeholder="1-31"
                              value={item.due_day}
                              onChange={(e) => handleUpdateNewCatItem(idx, 'due_day', e.target.value)}
                              className="w-full bg-[#102A43] border border-[#243B55] text-white text-xs px-2.5 py-1.5 rounded-lg focus:border-[#00ADB5] focus:outline-none text-center font-bold"
                            />
                          </div>

                          {newCatItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveNewCatItem(idx)}
                              className="p-1.5 mt-3 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                              title="Eliminar fecha"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Live Total */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#1E3A5F] text-xs">
                      <span className="text-slate-400 font-medium">Total mensual calculado:</span>
                      <span className="text-emerald-400 font-mono font-black text-sm">
                        {formatCOP(newCatItems.reduce((sum, it) => sum + (Number(it.amount) || 0), 0))}
                      </span>
                    </div>
                  </div>
                )}

                {newCatType === 'EXPENSE' && (
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 pt-1">
                    <input
                      type="checkbox"
                      checked={newCatIsFixed}
                      onChange={(e) => setNewCatIsFixed(e.target.checked)}
                      className="rounded border-[#243B55] text-[#00ADB5] focus:ring-0"
                    />
                    <span>¿Es un compromiso fijo mensual? (Ej: papás, arriendo)</span>
                  </label>
                )}

                {/* Color selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Color Distintivo</label>
                  <div className="flex items-center gap-2 pt-1">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewCatColor(c)}
                        className={`w-7 h-7 rounded-full border-2 transition-transform ${
                          newCatColor === c ? 'scale-110 border-white' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[#1E3A5F]">
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
                    className={`px-4 py-2 rounded-xl font-extrabold text-xs shadow-md flex items-center gap-1.5 transition-colors ${
                      newCatType === 'INCOME'
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                        : 'bg-[#00ADB5] hover:opacity-90 text-[#0B192C]'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3px]" />
                    <span>{isSubmittingCat ? 'Guardando...' : 'Crear Rubro'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Crear Nuevo Método de Pago / Cuenta */}
        {isAddMethodOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-[#0B192C] border border-cyan-400 rounded-3xl p-6 shadow-2xl relative">
              <div className="flex items-center justify-between pb-3 border-b border-[#1E3A5F]">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-cyan-400" />
                  <span>Agregar Nuevo Método / Cuenta</span>
                </span>

                <button
                  onClick={() => setIsAddMethodOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreatePaymentMethod} className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nombre del Medio o Cuenta
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Nu Colombia, Dale, Davivienda, Caja Oficina"
                    value={newMethodName}
                    onChange={(e) => setNewMethodName(e.target.value)}
                    className="w-full bg-[#102A43] border border-[#243B55] text-white text-xs px-3 py-2.5 rounded-xl focus:border-cyan-400 focus:outline-none"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tipo de Cuenta / Medio
                  </label>
                  <select
                    value={newMethodType}
                    onChange={(e) => setNewMethodType(e.target.value)}
                    className="w-full bg-[#102A43] border border-[#243B55] text-white text-xs px-3 py-2.5 rounded-xl focus:border-cyan-400 focus:outline-none"
                  >
                    {METHOD_TYPES.map((mt) => (
                      <option key={mt.id} value={mt.id}>
                        {mt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Color selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Color Distintivo</label>
                  <div className="flex items-center gap-2 pt-1">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewMethodColor(c)}
                        className={`w-7 h-7 rounded-full border-2 transition-transform ${
                          newMethodColor === c ? 'scale-110 border-white' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[#1E3A5F]">
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
                    <span>{isSubmittingMethod ? 'Guardando...' : 'Guardar Método'}</span>
                  </button>
                </div>
              </form>
            </div>
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
