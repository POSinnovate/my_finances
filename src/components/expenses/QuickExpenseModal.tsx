'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, Sparkles } from 'lucide-react';
import { formatCOP } from '@/lib/utils';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  monthly_budget: number;
  spent_this_month: number;
}

interface QuickExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpenseAdded: () => void;
  categories: Category[];
}

const PAYMENT_METHODS = [
  { id: 'Nequi', label: 'Nequi', color: 'bg-purple-600/30 text-purple-300 border-purple-500/40' },
  { id: 'Daviplata', label: 'Daviplata', color: 'bg-red-600/30 text-red-300 border-red-500/40' },
  { id: 'Efectivo', label: 'Efectivo', color: 'bg-emerald-600/30 text-emerald-300 border-emerald-500/40' },
  { id: 'Bancolombia', label: 'Bancolombia', color: 'bg-yellow-600/30 text-yellow-300 border-yellow-500/40' },
  { id: 'Tarjeta', label: 'Tarjeta', color: 'bg-blue-600/30 text-blue-300 border-blue-500/40' },
];

const QUICK_AMOUNTS = [5000, 10000, 20000, 35000, 50000, 100000];

export function QuickExpenseModal({ isOpen, onClose, onExpenseAdded, categories }: QuickExpenseModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Nequi');
  const [notes, setNotes] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      // Default to "Gastos Hormiga & Antojos" or "Alimentación" or first
      const defaultCat = categories.find(c => c.name.includes('Hormiga') || c.name.includes('Antojos')) || categories[0];
      setSelectedCategory(defaultCat.id);
    }
  }, [categories, selectedCategory]);

  if (!isOpen) return null;

  const handleQuickAddAmount = (addValue: number) => {
    const current = Number(amount) || 0;
    setAmount((current + addValue).toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error('Por favor ingresa un monto válido');
      return;
    }
    if (!selectedCategory) {
      toast.error('Selecciona una categoría');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount,
          category_id: selectedCategory,
          payment_method: paymentMethod,
          notes,
          date,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Gasto de ${formatCOP(numAmount)} registrado`);
        setAmount('');
        setNotes('');
        onExpenseAdded();
        onClose();
      } else {
        toast.error(data.error || 'Error registrando gasto');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-lg bg-[#0B192C] border-t sm:border border-[#1E3A5F] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1E3A5F]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#00ADB5]/20 text-[#00ADB5] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-white">Registrar Gasto Rápido</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Big Amount Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Monto del Gasto ($ COP)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-[#00ADB5]">$</span>
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
              {QUICK_AMOUNTS.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAddAmount(val)}
                  className="text-xs bg-[#152E4D] hover:bg-[#1E3A5F] active:scale-95 text-slate-200 px-2.5 py-1 rounded-lg border border-[#243B55] transition-all"
                >
                  +{formatCOP(val).replace('$', '').trim()}
                </button>
              ))}
            </div>
          </div>

          {/* Category Selector Grid */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Grupo / Categoría</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl text-left border transition-all ${
                      isSelected
                        ? 'bg-[#00ADB5]/20 border-[#00ADB5] text-white shadow-md shadow-[#00ADB5]/10'
                        : 'bg-[#102A43] border-[#243B55] text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <div
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color || '#00ADB5' }}
                    />
                    <span className="text-xs font-medium truncate">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Método de Pago</label>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map((pm) => {
                const isSelected = paymentMethod === pm.id;
                return (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPaymentMethod(pm.id)}
                    className={`text-xs px-3 py-1.5 rounded-xl border font-semibold transition-all ${
                      isSelected
                        ? `${pm.color} ring-2 ring-[#00ADB5] shadow-sm`
                        : 'bg-[#102A43] border-[#243B55] text-slate-400 hover:text-white'
                    }`}
                  >
                    {pm.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes and Date row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Descripción corta (opcional)</label>
              <input
                type="text"
                placeholder="Ej: Empanada, Domicilio, Pasaje"
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

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#00ADB5] to-[#06B6D4] text-[#0B192C] font-extrabold text-sm shadow-xl shadow-[#00ADB5]/25 flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Guardando...</span>
            ) : (
              <>
                <Check className="w-5 h-5 stroke-[3px]" />
                <span>Registrar Gasto de Inmediato</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
