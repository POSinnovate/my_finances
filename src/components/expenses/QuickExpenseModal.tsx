'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Check, ArrowDownCircle, ArrowUpCircle, Plus, Wallet, Tag } from 'lucide-react';
import { formatCOP } from '@/lib/utils';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  monthly_budget?: number;
  spent_this_month?: number;
  type?: 'EXPENSE' | 'INCOME';
}

interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  color: string;
  icon: string;
  movement_count?: number;
}

interface QuickExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpenseAdded: () => void;
  categories: Category[];
}

const DEFAULT_METHODS: PaymentMethod[] = [
  { id: '1', name: 'Nequi', type: 'WALLET', color: '#8B5CF6', icon: 'Smartphone' },
  { id: '2', name: 'Bancolombia', type: 'BANK', color: '#EAB308', icon: 'Building2' },
  { id: '3', name: 'Daviplata', type: 'WALLET', color: '#EF4444', icon: 'Smartphone' },
  { id: '4', name: 'Efectivo', type: 'CASH', color: '#10B981', icon: 'Banknote' },
  { id: '5', name: 'Tarjeta de Crédito', type: 'CARD', color: '#3B82F6', icon: 'CreditCard' },
];

const QUICK_AMOUNTS_EXPENSE = [5000, 10000, 20000, 35000, 50000, 100000];
const QUICK_AMOUNTS_INCOME = [100000, 200000, 500000, 1000000, 1500000, 2000000];

const getTodayLocalDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function QuickExpenseModal({ isOpen, onClose, onExpenseAdded, categories: initialCategories }: QuickExpenseModalProps) {
  const [txType, setTxType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [amount, setAmount] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Nequi');
  const [notes, setNotes] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayLocalDate());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic categories and payment methods
  const [localCategories, setLocalCategories] = useState<Category[]>(initialCategories);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(DEFAULT_METHODS);

  // Quick inline creation states
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [isSavingCat, setIsSavingCat] = useState(false);

  const [showAddMethod, setShowAddMethod] = useState(false);
  const [newMethodName, setNewMethodName] = useState('');
  const [isSavingMethod, setIsSavingMethod] = useState(false);

  // Refresh categories from API
  const refreshCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        if (data.categories?.length) {
          setLocalCategories(data.categories);
        }
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, []);

  // Refresh payment methods from API
  const refreshPaymentMethods = useCallback(async () => {
    try {
      const res = await fetch('/api/payment-methods');
      if (res.ok) {
        const data = await res.json();
        if (data.paymentMethods?.length) {
          setPaymentMethods(data.paymentMethods);
          if (!paymentMethod) {
            setPaymentMethod(data.paymentMethods[0].name);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch payment methods:', err);
    }
  }, [paymentMethod]);

  useEffect(() => {
    if (initialCategories && initialCategories.length > 0) {
      setLocalCategories(initialCategories);
    } else if (isOpen) {
      refreshCategories();
    }
  }, [initialCategories, isOpen, refreshCategories]);

  useEffect(() => {
    if (isOpen) {
      refreshPaymentMethods();
    }
  }, [isOpen, refreshPaymentMethods]);

  const expenseCategories = localCategories.filter((c) => c.type !== 'INCOME');
  const incomeCategories = localCategories.filter((c) => c.type === 'INCOME');

  useEffect(() => {
    if (txType === 'EXPENSE' && expenseCategories.length > 0) {
      if (!selectedCategory || !expenseCategories.some((c) => c.id === selectedCategory)) {
        const defaultCat =
          expenseCategories.find((c) => c.name.includes('Hormiga') || c.name.includes('Alimentación')) ||
          expenseCategories[0];
        setSelectedCategory(defaultCat.id);
      }
    } else if (txType === 'INCOME' && incomeCategories.length > 0) {
      if (!selectedCategory || !incomeCategories.some((c) => c.id === selectedCategory)) {
        const defaultIncome =
          incomeCategories.find((c) => c.name.includes('Quincena') || c.name.includes('Salario')) ||
          incomeCategories[0];
        setSelectedCategory(defaultIncome.id);
      }
    }
  }, [txType, localCategories, selectedCategory]);

  if (!isOpen) return null;

  const handleQuickAddAmount = (addValue: number) => {
    const current = Number(amount) || 0;
    setAmount((current + addValue).toString());
  };

  const handleSwitchType = (newType: 'EXPENSE' | 'INCOME') => {
    setTxType(newType);
    setShowAddCat(false);
    if (newType === 'EXPENSE') {
      setSelectedCategory(expenseCategories[0]?.id || '');
    } else {
      setSelectedCategory(incomeCategories[0]?.id || '');
    }
  };

  // Quick category creation
  const handleQuickCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setIsSavingCat(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCatName.trim(),
          type: txType,
          color: txType === 'INCOME' ? '#10B981' : '#00ADB5',
          icon: txType === 'INCOME' ? 'Briefcase' : 'Tag',
          monthly_budget: 0,
          is_fixed: false,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Grupo "${newCatName.trim()}" creado`);
        setNewCatName('');
        setShowAddCat(false);
        await refreshCategories();
        if (data.id) {
          setSelectedCategory(data.id);
        }
      } else {
        toast.error('Error al crear el grupo');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setIsSavingCat(false);
    }
  };

  // Quick payment method creation
  const handleQuickCreateMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMethodName.trim()) return;

    setIsSavingMethod(true);
    try {
      const res = await fetch('/api/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newMethodName.trim(),
          type: 'BANK',
          color: '#00ADB5',
          icon: 'Wallet',
        }),
      });

      if (res.ok) {
        const trimmed = newMethodName.trim();
        toast.success(`Método "${trimmed}" agregado`);
        setNewMethodName('');
        setShowAddMethod(false);
        await refreshPaymentMethods();
        setPaymentMethod(trimmed);
      } else {
        toast.error('Error al crear el método');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setIsSavingMethod(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error('Por favor ingresa un monto válido');
      return;
    }

    if (txType === 'EXPENSE' && !selectedCategory) {
      toast.error('Selecciona una categoría para el gasto');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: txType,
          amount: numAmount,
          category_id: selectedCategory || null,
          payment_method: paymentMethod,
          notes: notes?.trim() || (txType === 'INCOME' ? 'Ingreso registrado' : 'Gasto'),
          date,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        if (txType === 'INCOME') {
          toast.success(`+${formatCOP(numAmount)} sumados a tu fondo disponible`);
        } else {
          toast.success(`-${formatCOP(numAmount)} descontados de tu fondo`);
        }
        setAmount('');
        setNotes('');
        onExpenseAdded();
        onClose();
      } else {
        toast.error(data.error || 'Error registrando movimiento');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isIncome = txType === 'INCOME';
  const numericAmount = Number(amount) || 0;
  const currentCategoryList = isIncome ? incomeCategories : expenseCategories;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-lg bg-[#0B192C] border-t sm:border border-[#1E3A5F] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[94vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1E3A5F]">
          {/* Toggle Type Tabs */}
          <div className="flex items-center bg-[#102A43] p-1 rounded-2xl border border-[#243B55]">
            <button
              type="button"
              onClick={() => handleSwitchType('EXPENSE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                !isIncome
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowDownCircle className="w-4 h-4 text-rose-400" />
              <span>Egreso (Gasto)</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchType('INCOME')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isIncome
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowUpCircle className="w-4 h-4 text-emerald-400" />
              <span>+ Ingreso</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Big Amount Input with Live Conversion Preview */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-400">
                {isIncome ? 'Monto del Ingreso ($ COP)' : 'Monto del Gasto ($ COP)'}
              </label>
              {numericAmount > 0 && (
                <span
                  className={`text-xs font-extrabold px-2.5 py-0.5 rounded-lg border transition-all ${
                    isIncome
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-[#00ADB5]/10 text-[#00ADB5] border-[#00ADB5]/30'
                  }`}
                >
                  {formatCOP(numericAmount)}
                </span>
              )}
            </div>

            <div className="relative">
              <span
                className={`absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black ${
                  isIncome ? 'text-emerald-400' : 'text-[#00ADB5]'
                }`}
              >
                $
              </span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
                className="w-full bg-[#102A43] border border-[#243B55] focus:border-[#00ADB5] text-white text-3xl font-extrabold pl-10 pr-4 py-3 rounded-2xl focus:outline-none transition-all placeholder:text-slate-600"
              />
            </div>

            {/* Quick amount chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(isIncome ? QUICK_AMOUNTS_INCOME : QUICK_AMOUNTS_EXPENSE).map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAddAmount(val)}
                  className="text-xs bg-[#152E4D] hover:bg-[#1E3A5F] active:scale-95 text-slate-200 px-2.5 py-1 rounded-lg border border-[#243B55] transition-all font-semibold"
                >
                  +{formatCOP(val).replace('$', '').trim()}
                </button>
              ))}
            </div>
          </div>

          {/* Category / Group Picker */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#00ADB5]" />
                <span>{isIncome ? 'Fuente / Grupo de Ingreso' : 'Grupo de Gasto'}</span>
              </label>
              <button
                type="button"
                onClick={() => setShowAddCat(!showAddCat)}
                className="text-[11px] text-[#00ADB5] hover:underline font-bold flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" />
                <span>{showAddCat ? 'Cerrar' : '+ Crear Grupo'}</span>
              </button>
            </div>

            {/* Inline Quick Category Form */}
            {showAddCat && (
              <div className="mb-2 p-2 bg-[#102A43] border border-[#00ADB5]/40 rounded-xl flex items-center gap-2">
                <input
                  type="text"
                  placeholder={isIncome ? 'Nombre de la fuente (ej: Clientes TI)' : 'Nombre del grupo (ej: Gimnasio)'}
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="flex-1 bg-[#0B192C] border border-[#243B55] text-white text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-[#00ADB5]"
                />
                <button
                  type="button"
                  onClick={handleQuickCreateCategory}
                  disabled={isSavingCat || !newCatName.trim()}
                  className="px-3 py-1.5 rounded-lg bg-[#00ADB5] text-[#0B192C] font-black text-xs hover:bg-[#06B6D4] disabled:opacity-50"
                >
                  {isSavingCat ? '...' : 'Guardar'}
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
              {currentCategoryList.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl text-left border transition-all ${
                      isSelected
                        ? isIncome
                          ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-md shadow-emerald-500/10'
                          : 'bg-[#00ADB5]/20 border-[#00ADB5] text-white shadow-md shadow-[#00ADB5]/10'
                        : 'bg-[#102A43] border-[#243B55] text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color || (isIncome ? '#10B981' : '#00ADB5') }}
                    />
                    <span className="text-xs font-medium truncate">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isIncome ? '¿A qué cuenta o medio ingresó?' : 'Método de Pago'}</span>
              </label>
              <button
                type="button"
                onClick={() => setShowAddMethod(!showAddMethod)}
                className="text-[11px] text-cyan-400 hover:underline font-bold flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" />
                <span>{showAddMethod ? 'Cerrar' : '+ Otro Medio'}</span>
              </button>
            </div>

            {/* Inline Quick Method Form */}
            {showAddMethod && (
              <div className="mb-2 p-2 bg-[#102A43] border border-cyan-500/40 rounded-xl flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Nombre de la cuenta (ej: Nu Colombia, Dale, Caja)"
                  value={newMethodName}
                  onChange={(e) => setNewMethodName(e.target.value)}
                  className="flex-1 bg-[#0B192C] border border-[#243B55] text-white text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={handleQuickCreateMethod}
                  disabled={isSavingMethod || !newMethodName.trim()}
                  className="px-3 py-1.5 rounded-lg bg-cyan-400 text-[#0B192C] font-black text-xs hover:bg-cyan-300 disabled:opacity-50"
                >
                  {isSavingMethod ? '...' : 'Guardar'}
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {paymentMethods.map((pm) => {
                const isSelected = paymentMethod === pm.name;
                return (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPaymentMethod(pm.name)}
                    className={`text-xs px-3 py-1.5 rounded-xl border font-semibold transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#102A43] border-[#00ADB5] text-white ring-2 ring-[#00ADB5]/50 shadow-md'
                        : 'bg-[#102A43] border-[#243B55] text-slate-400 hover:text-white'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: pm.color || '#00ADB5' }}
                    />
                    <span>{pm.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description and Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                {isIncome ? 'Concepto (Ej: Pago Nómina, Suscripción Cliente X)' : 'Descripción (Ej: Taxi, Almuerzo)'}
              </label>
              <input
                type="text"
                placeholder={isIncome ? 'Ej: Quincena / Licencia software' : 'Ej: Café / Domicilio'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#102A43] border border-[#243B55] focus:border-[#00ADB5] text-white text-base sm:text-xs px-3 py-2.5 rounded-xl focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Fecha</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#102A43] border border-[#243B55] focus:border-[#00ADB5] text-white text-base sm:text-xs px-3 py-2.5 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50 ${
              isIncome
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-emerald-500/20'
                : 'bg-gradient-to-r from-[#00ADB5] to-[#06B6D4] text-[#0B192C] shadow-[#00ADB5]/25'
            }`}
          >
            {isSubmitting ? (
              <span>Guardando...</span>
            ) : isIncome ? (
              <>
                <Check className="w-5 h-5 stroke-[3px]" />
                <span>Sumar al Fondo Disponible</span>
              </>
            ) : (
              <>
                <Check className="w-5 h-5 stroke-[3px]" />
                <span>Descontar Gasto del Fondo</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
