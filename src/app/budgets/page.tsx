'use client';

import React, { useState, useEffect } from 'react';
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
  Layers,
  Award,
  Trash2, 
  ArrowDownRight, 
  ArrowUpRight, 
  Edit3, 
  Calendar, 
  Clock 
} from 'lucide-react';
import { toast } from 'sonner';
import { PageBanner, Button, Badge, Modal, Input } from '@/components/ui';

const COLOR_OPTIONS = [
  '#00ADB5', '#06B6D4', '#3B82F6', '#8B5CF6', 
  '#EC4899', '#EF4444', '#F59E0B', '#10B981'
];

export default function BudgetsPage() {
  const router = useRouter();
  const invalidateFinance = useInvalidateFinance();

  // TanStack React Query hooks with automatic caching
  const { data: user } = useUser();
  const { data: categories = [], refetch: refetchCategories } = useCategories();
  const { data: paymentMethods = [], refetch: refetchPaymentMethods } = usePaymentMethods();

  const [activeTab, setActiveTab] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);

  // Sync tab with URL query parameter dynamically
  useEffect(() => {
    const syncTab = () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab === 'INCOME') setActiveTab('INCOME');
        else setActiveTab('EXPENSE');
      }
    };
    syncTab();
    window.addEventListener('popstate', syncTab);
    return () => window.removeEventListener('popstate', syncTab);
  }, []);

  const handleTabChange = (tab: 'EXPENSE' | 'INCOME') => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const url = tab === 'EXPENSE' ? '/budgets' : `/budgets?tab=${tab}`;
      window.history.replaceState(null, '', url);
      window.dispatchEvent(new Event('popstate'));
    }
  };

  // Unified Category Modal (Crear / Editar Grupos de Gasto y Fuentes de Ingreso)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [catType, setCatType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [catName, setCatName] = useState('');
  const [catBudget, setCatBudget] = useState('');
  const [catColor, setCatColor] = useState(COLOR_OPTIONS[0]);
  const [catIsFixed, setCatIsFixed] = useState(false);
  const [catFrequency, setCatFrequency] = useState<'MONTHLY' | 'ONCE' | 'NONE'>('MONTHLY');
  const [catDueDay, setCatDueDay] = useState('');
  const [catSpecificDate, setCatSpecificDate] = useState('');
  const [catHasMultiple, setCatHasMultiple] = useState(false);
  const [catItems, setCatItems] = useState<Array<{ id?: string; amount: string; due_day: string; specific_date?: string; frequency: 'MONTHLY' | 'ONCE' }>>([]);
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setCatType(activeTab);
    setCatName('');
    setCatBudget('');
    setCatColor(activeTab === 'INCOME' ? '#10B981' : '#00ADB5');
    setCatIsFixed(false);
    setCatFrequency('MONTHLY');
    setCatDueDay(activeTab === 'INCOME' ? '15' : '');
    setCatSpecificDate('');
    setCatHasMultiple(false);
    setCatItems([
      { amount: '', due_day: '15', frequency: 'MONTHLY' },
      { amount: '', due_day: '30', frequency: 'MONTHLY' },
    ]);
    setIsCategoryModalOpen(true);
  };

  const handleAddCatItem = () => {
    setCatItems(prev => [
      ...prev,
      { amount: '', due_day: '15', frequency: 'MONTHLY' }
    ]);
  };

  const handleUpdateCatItem = (index: number, field: string, value: any) => {
    setCatItems(prev => prev.map((it, idx) => idx === index ? { ...it, [field]: value } : it));
  };

  const handleRemoveCatItem = (index: number) => {
    setCatItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleOpenEditCategory = (cat: any) => {
    setEditingCategory(cat);
    setCatType(cat.type);
    setCatName(cat.name);
    setCatBudget(cat.monthly_budget ? cat.monthly_budget.toString() : '');
    setCatColor(cat.color || (cat.type === 'INCOME' ? '#10B981' : '#00ADB5'));
    setCatIsFixed(cat.is_fixed === 1);
    setCatFrequency(cat.frequency || (cat.specific_date ? 'ONCE' : (cat.due_day ? 'MONTHLY' : 'MONTHLY')));
    setCatDueDay(cat.due_day ? String(cat.due_day) : '');
    setCatSpecificDate(cat.specific_date ? String(cat.specific_date).slice(0, 10) : '');

    const hasMultiple = cat.has_multiple_items === 1 || (Array.isArray(cat.items) && cat.items.length > 0);
    setCatHasMultiple(hasMultiple);

    if (Array.isArray(cat.items) && cat.items.length > 0) {
      setCatItems(cat.items.map((it: any) => ({
        id: it.id,
        amount: it.amount ? String(it.amount) : '',
        due_day: it.due_day ? String(it.due_day) : '',
        specific_date: it.specific_date ? String(it.specific_date).slice(0, 10) : '',
        frequency: it.frequency || (it.specific_date ? 'ONCE' : 'MONTHLY'),
      })));
    } else {
      setCatItems([
        { amount: cat.monthly_budget ? String(cat.monthly_budget) : '', due_day: cat.due_day ? String(cat.due_day) : '15', frequency: 'MONTHLY' }
      ]);
    }
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    if (catHasMultiple) {
      const validItems = catItems.filter(it => Number(it.amount) > 0);
      if (validItems.length === 0) {
        toast.error('Debes tener al menos una fecha con monto mayor a 0');
        return;
      }
    }

    setIsSavingCategory(true);
    try {
      const isEdit = Boolean(editingCategory);
      const isVariableExpense = catType === 'EXPENSE' && !catIsFixed;

      const itemsPayload = (catHasMultiple && !isVariableExpense)
        ? catItems
            .filter(it => Number(it.amount) > 0)
            .map(it => ({
              ...(it.id ? { id: it.id } : {}),
              amount: Number(it.amount),
              due_day: it.frequency === 'MONTHLY' && it.due_day ? Number(it.due_day) : null,
              specific_date: it.frequency === 'ONCE' && it.specific_date ? it.specific_date : null,
              frequency: it.frequency,
            }))
        : [];

      const payload: any = {
        name: catName.trim(),
        type: catType,
        color: catColor,
        monthly_budget: isVariableExpense ? 0 : (catHasMultiple ? undefined : (Number(catBudget) || 0)),
        is_fixed: catType === 'INCOME' ? 0 : (catIsFixed ? 1 : 0),
        frequency: isVariableExpense ? 'NONE' : catFrequency,
        due_day: isVariableExpense ? null : (catFrequency === 'MONTHLY' && catDueDay ? Number(catDueDay) : null),
        specific_date: isVariableExpense ? null : (catFrequency === 'ONCE' && catSpecificDate ? catSpecificDate : null),
        has_multiple_items: isVariableExpense ? 0 : (catHasMultiple ? 1 : 0),
        items: isVariableExpense ? [] : itemsPayload,
      };

      if (isEdit) {
        payload.id = editingCategory.id;
      }

      const res = await fetch('/api/categories', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const noun = catType === 'INCOME' ? 'Fuente' : 'Grupo';
        const actionVerb = isEdit ? 'actualizado' : 'creado';
        toast.success(
          catType === 'INCOME'
            ? `${noun} "${catName.trim()}" ${isEdit ? 'actualizada' : 'creada'}`
            : `${noun} "${catName.trim()}" ${actionVerb}`
        );
        setIsCategoryModalOpen(false);
        setEditingCategory(null);
        invalidateFinance();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || `Error al ${isEdit ? 'actualizar' : 'crear'}`);
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setIsSavingCategory(false);
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
  const totalEstimatedMonthlyIncome = incomeCategories.reduce((acc: number, c: any) => acc + (c.monthly_budget || 0), 0);
  const totalActualIncomeThisMonth = incomeCategories.reduce((acc: number, c: any) => acc + (c.earned_this_month || 0), 0);
  const totalIncomeThisYear = incomeCategories.reduce((acc: number, c: any) => acc + (c.earned_this_year || 0), 0);

  // Sort income categories by month earnings descending
  const sortedIncomeCategories = [...incomeCategories].sort((a: any, b: any) => (b.earned_this_month || 0) - (a.earned_this_month || 0));
  const topIncomeSource = sortedIncomeCategories[0];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header user={user} onUserUpdate={invalidateFinance} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 pt-5 pb-28 sm:pb-32 space-y-5">
        {/* Tab Switcher: Gastos vs Ingresos */}
        <div className="flex items-center gap-2 bg-surface border border-border p-1.5 rounded-2xl overflow-x-auto scrollbar-none whitespace-nowrap">
          <Button
            type="button"
            variant={activeTab === 'EXPENSE' ? 'primary' : 'ghost'}
            onClick={() => handleTabChange('EXPENSE')}
            icon={Layers}
            className="flex-1 py-2.5 px-4 text-xs font-extrabold"
          >
            <span className="whitespace-nowrap">Grupos de Gasto</span>
            <Badge variant={activeTab === 'EXPENSE' ? 'primary' : 'secondary'} size="sm">
              {expenseCategories.length}
            </Badge>
          </Button>

          <Button
            type="button"
            variant={activeTab === 'INCOME' ? 'success' : 'ghost'}
            onClick={() => handleTabChange('INCOME')}
            icon={Briefcase}
            className="flex-1 py-2.5 px-4 text-xs font-extrabold"
          >
            <span className="whitespace-nowrap">Fuentes de Ingreso</span>
            <Badge variant={activeTab === 'INCOME' ? 'success' : 'secondary'} size="sm">
              {incomeCategories.length}
            </Badge>
          </Button>
        </div>

        {/* TAB 1: EXPENSE CONTENT */}
        {activeTab === 'EXPENSE' && (
          <div className="space-y-5">
            {/* Introductory Card & Action */}
            <PageBanner
              icon={<Layers className="w-5 h-5" />}
              title="Presupuesto y Grupos de Gasto"
              description="Organiza tus gastos fijos y variables con fechas límite o topes mensuales para que el sistema calcule con precisión tu gasto diario seguro."
              actionText="Crear Grupo de Gasto"
              onAction={handleOpenAdd}
              badgeText={`${expenseCategories.length} grupos`}
              theme="cyan"
            />

            {/* Total Budget vs Actual Spend Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-2.5 rounded-xl bg-surface-elevated border border-border">
                <span className="text-[10px] sm:text-[11px] font-semibold text-accent block whitespace-nowrap">Compromisos Fijos</span>
                <p className="text-sm sm:text-base font-black text-foreground mt-0.5 whitespace-nowrap">{formatCOP(totalFixedBudgeted)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-elevated border border-border">
                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 block whitespace-nowrap">Tope Variable</span>
                <p className="text-sm sm:text-base font-black text-foreground mt-0.5 whitespace-nowrap">{formatCOP(totalVariableBudgeted)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-elevated border border-border">
                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 block whitespace-nowrap">Total Gastado Mes</span>
                <p className="text-sm sm:text-base font-black text-rose-400 mt-0.5 whitespace-nowrap">{formatCOP(totalSpent)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-elevated border border-border">
                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 block whitespace-nowrap">Margen Restante</span>
                <p className={`text-sm sm:text-base font-black mt-0.5 whitespace-nowrap ${totalExpenseBudgeted - totalSpent >= 0 ? 'text-primary' : 'text-rose-400'}`}>
                  {formatCOP(totalExpenseBudgeted - totalSpent)}
                </p>
              </div>
            </div>

            {/* Fixed Commitments Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
                    <span className="truncate">Compromisos Fijos Mensuales</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate">
                    Gastos ineludibles al mes (apoyo familiar a papás, suscripciones fijas, servicios)
                  </p>
                </div>
                <Badge variant="accent" size="sm">
                  {fixedCategories.length} {fixedCategories.length === 1 ? 'fijo' : 'fijos'}
                </Badge>
              </div>

              {fixedCategories.length === 0 ? (
                <div className="p-4 rounded-2xl bg-surface border border-border text-center text-xs text-slate-400">
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

            {/* Flexible / Variable Categories Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    <span className="truncate">Grupos Variables y Flexibles</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate">
                    Presupuesto tope para compras, salidas y consumo discrecional del mes
                  </p>
                </div>
                <Badge variant="primary" size="sm">
                  {variableCategories.length} {variableCategories.length === 1 ? 'grupo' : 'grupos'}
                </Badge>
              </div>

              {variableCategories.length === 0 ? (
                <div className="p-4 rounded-2xl bg-surface border border-border text-center text-xs text-slate-400">
                  No tienes grupos variables definidos.
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

        {/* TAB 2: INCOME CONTENT */}
        {activeTab === 'INCOME' && (
          <div className="space-y-5">
            {/* Introductory Card & Action */}
            <PageBanner
              icon={<Briefcase className="w-5 h-5" />}
              title="Fuentes de Ingreso"
              description="Registra de dónde proviene tu dinero (salarios, quincenas, honorarios, ventas de software). Proyecta tus ingresos mensuales de forma exacta para alimentar tu flujo de caja real."
              actionText="Crear Fuente de Ingreso"
              onAction={handleOpenAdd}
              badgeText={`${incomeCategories.length} fuentes activas`}
              theme="emerald"
            />

            {/* Incomes Breakdown */}
            <div className="bg-surface-elevated border border-emerald-500/30 rounded-3xl p-5 shadow-xl grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-surface border border-border">
                <span className="text-[11px] font-semibold text-emerald-400 block whitespace-nowrap">Ingreso Mensual Proyectado</span>
                <p className="text-lg sm:text-xl font-black text-foreground mt-1 whitespace-nowrap">{formatCOP(totalEstimatedMonthlyIncome)}</p>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Suma estimada de todas tus fuentes</span>
              </div>
              <div className="p-3 rounded-2xl bg-surface border border-border">
                <span className="text-[11px] font-semibold text-emerald-400 block whitespace-nowrap">Cobrado Este Mes</span>
                <p className="text-lg sm:text-xl font-black text-emerald-400 mt-1 whitespace-nowrap">{formatCOP(totalActualIncomeThisMonth)}</p>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Ingresos efectivamente registrados</span>
              </div>
              <div className="p-3 rounded-2xl bg-surface border border-border">
                <span className="text-[11px] font-semibold text-slate-300 block whitespace-nowrap">Por Cobrar en el Mes</span>
                <p className="text-lg sm:text-xl font-black text-foreground mt-1 whitespace-nowrap">
                  {formatCOP(Math.max(0, totalEstimatedMonthlyIncome - totalActualIncomeThisMonth))}
                </p>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Pendiente por percibir</span>
              </div>
            </div>

            {/* Income Sources Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span>Fuentes de Ingreso Registradas</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Haz clic en &quot;Registrar Cobro&quot; para sumar el dinero directamente a tu fondo disponible
                  </p>
                </div>
                <Badge variant="success" size="sm">
                  {incomeCategories.length} {incomeCategories.length === 1 ? 'fuente' : 'fuentes'}
                </Badge>
              </div>

              {incomeCategories.length === 0 ? (
                <div className="p-6 rounded-3xl bg-surface border border-border text-center text-xs text-slate-400">
                  Aún no has registrado ninguna fuente de ingreso. Crea tu primera fuente como &quot;Suscripciones Sistemas&quot; o &quot;Salario&quot; para proyectar tus entradas.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {sortedIncomeCategories.map((cat: any, idx: number) => (
                    <IncomeSourceCard
                      key={cat.id}
                      category={cat}
                      totalMonthlyIncome={totalActualIncomeThisMonth}
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

        {/* Modal Unificado: Crear / Editar Categoría o Fuente */}
        <Modal
          isOpen={isCategoryModalOpen}
          onClose={() => {
            setIsCategoryModalOpen(false);
            setEditingCategory(null);
          }}
          title={
            editingCategory
              ? (catType === 'INCOME' ? 'Editar Fuente de Ingreso' : 'Editar Grupo de Gasto')
              : (catType === 'INCOME' ? 'Crear Fuente de Ingreso' : 'Crear Grupo de Gasto')
          }
          description={
            catType === 'INCOME'
              ? 'Configura el ingreso estimado y su frecuencia'
              : 'Configura el presupuesto estimado y los compromisos de pago'
          }
          size="md"
        >
          <form onSubmit={handleSaveCategory} className="space-y-4">
            {!editingCategory && (
              <div className="flex items-center justify-center p-1 bg-surface-elevated rounded-xl border border-border gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant={catType === 'EXPENSE' ? 'primary' : 'ghost'}
                  onClick={() => {
                    setCatType('EXPENSE');
                    setCatColor('#00ADB5');
                  }}
                  icon={Layers}
                  className="flex-1"
                >
                  Grupo de Gasto
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={catType === 'INCOME' ? 'success' : 'ghost'}
                  onClick={() => {
                    setCatType('INCOME');
                    setCatColor('#10B981');
                  }}
                  icon={Briefcase}
                  className="flex-1"
                >
                  Fuente de Ingreso
                </Button>
              </div>
            )}

            <Input
              label={catType === 'INCOME' 
                ? (editingCategory ? 'Nombre de la Fuente' : 'Nombre de la Fuente de Ingreso') 
                : (editingCategory ? 'Nombre del Grupo' : 'Nombre del Grupo de Gasto')}
              type="text"
              placeholder={catType === 'INCOME' ? 'Ej: Suscripciones Sistemas, Quincenas' : 'Ej: Mascotas, Gimnasio, Arriendo'}
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              required
              autoFocus
            />

            {/* Tipo de Gasto (Exclusivo para Grupos de Gasto) */}
            {catType === 'EXPENSE' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Naturaleza del Gasto
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-surface-elevated rounded-2xl border border-border">
                  <Button
                    type="button"
                    size="sm"
                    variant={!catIsFixed ? 'primary' : 'ghost'}
                    onClick={() => {
                      setCatIsFixed(false);
                      setCatHasMultiple(false);
                      setCatBudget('');
                    }}
                    className="w-full text-xs font-bold"
                  >
                    Gasto Variable
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={catIsFixed ? 'accent' : 'ghost'}
                    onClick={() => setCatIsFixed(true)}
                    className="w-full text-xs font-bold"
                  >
                    Gasto Fijo
                  </Button>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block leading-relaxed">
                  {!catIsFixed
                    ? 'Variable: Sin presupuesto forzado ni fechas. No descuenta de tu gasto seguro por día y se audita comparando mes anterior vs este mes.'
                    : 'Fijo: Compromiso obligatorio (arriendo, servicios, cuotas) con fecha y monto que protege tu flujo de caja.'}
                </span>
              </div>
            )}

            {/* Presupuesto y Fechas (Sólo para Fuentes de Ingreso o Gastos Fijos) */}
            {(catType === 'INCOME' || catIsFixed) ? (
              <>
                {/* Selector de Modalidad */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Modalidad de Programación
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-surface-elevated rounded-2xl border border-border">
                    <Button
                      type="button"
                      size="sm"
                      variant={!catHasMultiple ? 'primary' : 'ghost'}
                      onClick={() => setCatHasMultiple(false)}
                      icon={Clock}
                      className="w-full"
                    >
                      Fecha Única
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={catHasMultiple ? 'primary' : 'ghost'}
                      onClick={() => {
                        setCatHasMultiple(true);
                        if (catItems.length === 0) {
                          setCatItems([
                            { amount: catBudget || '', due_day: catDueDay || '15', frequency: 'MONTHLY' },
                            { amount: '', due_day: '30', frequency: 'MONTHLY' },
                          ]);
                        }
                      }}
                      icon={Layers}
                      className="w-full"
                    >
                      Múltiples Fechas
                    </Button>
                  </div>
                </div>

                {!catHasMultiple ? (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-300">
                          {catType === 'INCOME' ? 'Monto Mensual Estimado ($ COP)' : 'Presupuesto Mensual Estimado ($ COP)'}
                        </label>
                        {Number(catBudget) > 0 && (
                          <span className="text-[11px] text-primary font-bold">
                            {formatCOP(Number(catBudget))}
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        value={catBudget}
                        onChange={(e) => setCatBudget(e.target.value)}
                        placeholder={catType === 'INCOME' ? 'Ej: 1500000' : 'Ej: 500000'}
                        className="w-full bg-surface-elevated border border-border text-foreground text-xs px-3 py-2.5 rounded-xl focus:border-primary focus:outline-none placeholder:text-slate-500"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {catType === 'INCOME'
                          ? 'Este valor alimentará tu verdadero ingreso mensual de manera dinámica.'
                          : 'Tope máximo o compromiso para este grupo.'}
                      </span>
                    </div>

                    {/* Programación y Fechas Clave */}
                    <div className="p-3 rounded-2xl bg-surface-elevated/70 border border-border space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span>Programación y Fecha Clave</span>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5">
                        <Button
                          type="button"
                          size="xs"
                          variant={catFrequency === 'MONTHLY' ? 'primary' : 'outline'}
                          onClick={() => setCatFrequency('MONTHLY')}
                        >
                          Día Fijo Mes
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          variant={catFrequency === 'ONCE' ? 'primary' : 'outline'}
                          onClick={() => setCatFrequency('ONCE')}
                        >
                          Fecha Única
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          variant={catFrequency === 'NONE' ? 'primary' : 'outline'}
                          onClick={() => setCatFrequency('NONE')}
                        >
                          Sin Fecha
                        </Button>
                      </div>

                      {catFrequency === 'MONTHLY' && (
                        <div>
                          <label className="block text-[11px] font-medium text-slate-300 mb-1">
                            Día del mes (1 al 31)
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={31}
                            value={catDueDay}
                            onChange={(e) => setCatDueDay(e.target.value)}
                            placeholder="Ej: 15 (quincena), 30 (fin de mes), 27 (plan)"
                            className="w-full bg-surface border border-border text-foreground text-xs px-3 py-2 rounded-xl focus:border-primary focus:outline-none placeholder:text-slate-500"
                          />
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            Se proyectará cada mes en este día para calcular tu gasto diario inteligente.
                          </span>
                        </div>
                      )}

                      {catFrequency === 'ONCE' && (
                        <div>
                          <label className="block text-[11px] font-medium text-slate-300 mb-1">
                            Fecha exacta (Año-Mes-Día)
                          </label>
                          <input
                            type="date"
                            value={catSpecificDate}
                            onChange={(e) => setCatSpecificDate(e.target.value)}
                            className="w-full bg-surface border border-border text-foreground text-xs px-3 py-2 rounded-xl focus:border-primary focus:outline-none"
                          />
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            Para salidas, seguros, viajes o gastos puntuales con fecha definida.
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  /* Múltiples Fechas */
                  <div className="space-y-3 p-3.5 rounded-2xl bg-surface-elevated/50 border border-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-primary" />
                          <span>Fechas del Grupo</span>
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Monto y día de cada cobro o quincena. El total se calcula sumando los items.
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="xs"
                        variant="primary"
                        onClick={handleAddCatItem}
                        icon={Plus}
                        className="h-7 w-7 p-0"
                      />
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {catItems.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-surface p-2 rounded-xl border border-border">
                          <div className="flex-1 min-w-0">
                            <label className="text-[9px] text-slate-400 font-bold block mb-0.5">Monto ($ COP)</label>
                            <input
                              type="number"
                              placeholder="Ej: 1200000"
                              value={item.amount}
                              onChange={(e) => handleUpdateCatItem(idx, 'amount', e.target.value)}
                              className="w-full bg-surface-elevated border border-border text-foreground text-xs px-2.5 py-1.5 rounded-lg focus:border-primary focus:outline-none placeholder:text-slate-500"
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
                              onChange={(e) => handleUpdateCatItem(idx, 'due_day', e.target.value)}
                              className="w-full bg-surface-elevated border border-border text-foreground text-xs px-2.5 py-1.5 rounded-lg focus:border-primary focus:outline-none text-center font-bold"
                            />
                          </div>

                          {catItems.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleRemoveCatItem(idx)}
                              className="mt-3 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                              title="Eliminar fecha"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Live Total */}
                    <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
                      <span className="text-slate-400 font-medium">Total mensual calculado:</span>
                      <span className="text-emerald-400 font-mono font-black text-sm">
                        {formatCOP(catItems.reduce((sum, it) => sum + (Number(it.amount) || 0), 0))}
                      </span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Vista para Gasto Variable: Sin presupuesto */
              <div className="p-3.5 rounded-2xl bg-surface-elevated/70 border border-border space-y-1.5 text-xs text-foreground/80">
                <div className="flex items-center gap-2 font-bold text-foreground">
                  <Layers className="w-4 h-4 text-primary" />
                  <span>Control por Comparativa Mensual</span>
                </div>
                <p className="text-[11px] text-foreground/60 leading-relaxed">
                  Para este grupo no necesitas definir un presupuesto forzado ni fechas límite. El sistema auditará automáticamente cuánto gastas en el mes y lo comparará con el mes anterior, sin reducir tu gasto seguro por día.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Color Distintivo</label>
              <div className="flex items-center gap-2 pt-1">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCatColor(c)}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      catColor === c ? 'scale-110 border-white shadow-md' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setEditingCategory(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant={catType === 'INCOME' ? 'success' : 'primary'}
                size="sm"
                disabled={isSavingCategory}
                isLoading={isSavingCategory}
              >
                <Check className="w-3.5 h-3.5 stroke-[3px]" />
                <span>
                  {isSavingCategory 
                    ? 'Guardando...' 
                    : editingCategory 
                      ? 'Guardar Cambios' 
                      : (catType === 'INCOME' ? 'Crear Fuente' : 'Crear Grupo')}
                </span>
              </Button>
            </div>
          </form>
        </Modal>
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
