'use client';

import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  Plus, 
  Trash2, 
  Clock, 
  DollarSign, 
  Check, 
  Edit2, 
  Info,
  CalendarCheck,
  AlertCircle
} from 'lucide-react';
import { formatCOP } from '@/lib/utils';
import { useScheduledItems, useInvalidateFinance } from '@/lib/api-hooks';
import { toast } from 'sonner';

interface ScheduledItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: {
    id: string;
    name: string;
    type: 'INCOME' | 'EXPENSE';
    color?: string;
    monthly_budget?: number;
  } | null;
}

export function ScheduledItemsModal({ isOpen, onClose, category }: ScheduledItemsModalProps) {
  const invalidateFinance = useInvalidateFinance();
  const { data: allItems = [], isLoading } = useScheduledItems(category?.id);

  // Form State
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<'MONTHLY' | 'ONCE' | 'ANNUAL'>('MONTHLY');
  const [dueDay, setDueDay] = useState('15');
  const [specificDate, setSpecificDate] = useState('');
  const [notes, setNotes] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !category) return null;

  const isIncome = category.type === 'INCOME';
  const totalScheduled = allItems.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);

  const resetForm = () => {
    setName('');
    setAmount('');
    setFrequency('MONTHLY');
    setDueDay('15');
    setSpecificDate('');
    setNotes('');
    setEditingItemId(null);
  };

  const handleStartEdit = (item: any) => {
    setEditingItemId(item.id);
    setName(item.name || '');
    setAmount(item.amount ? String(item.amount) : '');
    setFrequency(item.frequency || 'MONTHLY');
    setDueDay(item.due_day ? String(item.due_day) : '15');
    setSpecificDate(item.specific_date ? String(item.specific_date).slice(0, 10) : '');
    setNotes(item.notes || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('El nombre del compromiso o cobro es obligatorio');
      return;
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }

    if (frequency === 'MONTHLY') {
      const day = parseInt(dueDay, 10);
      if (isNaN(day) || day < 1 || day > 31) {
        toast.error('El día del mes debe ser entre 1 y 31');
        return;
      }
    } else if (!specificDate) {
      toast.error('Selecciona una fecha específica');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingItemId) {
        // Update
        const res = await fetch('/api/scheduled-items', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingItemId,
            name: name.trim(),
            amount: numAmount,
            type: category.type,
            frequency,
            due_day: frequency === 'MONTHLY' ? parseInt(dueDay, 10) : null,
            specific_date: frequency !== 'MONTHLY' ? specificDate : null,
            notes: notes.trim() || null,
          }),
        });

        if (!res.ok) throw new Error('Error al actualizar');
        toast.success('Compromiso actualizado con éxito');
      } else {
        // Create
        const res = await fetch('/api/scheduled-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category_id: category.id,
            name: name.trim(),
            amount: numAmount,
            type: category.type,
            frequency,
            due_day: frequency === 'MONTHLY' ? parseInt(dueDay, 10) : null,
            specific_date: frequency !== 'MONTHLY' ? specificDate : null,
            notes: notes.trim() || null,
          }),
        });

        if (!res.ok) throw new Error('Error al programar');
        toast.success(isIncome ? 'Ingreso programado agregado' : 'Gasto fijo programado agregado');
      }

      resetForm();
      invalidateFinance();
    } catch (err) {
      toast.error('Error al guardar el ítem programado');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, itemName: string) => {
    if (!confirm(`¿Eliminar la fecha programada "${itemName}"?`)) return;
    try {
      const res = await fetch(`/api/scheduled-items?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      toast.success('Fecha programada eliminada');
      invalidateFinance();
      if (editingItemId === id) resetForm();
    } catch {
      toast.error('Error al eliminar');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div 
        className="w-full max-w-xl bg-[#0B192C] border border-[#1E3A5F] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 my-auto max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#1E3A5F]/70 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shadow-md shrink-0"
              style={{ backgroundColor: category.color || (isIncome ? '#10B981' : '#00ADB5') }}
            >
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isIncome ? 'bg-emerald-500/20 text-emerald-400' : 'bg-cyan-500/20 text-[#00ADB5]'
                }`}>
                  {isIncome ? 'Cobros & Entradas' : 'Fechas & Pagos'}
                </span>
              </div>
              <h2 className="text-lg font-black text-white mt-0.5">
                Fechas Programadas: {category.name}
              </h2>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#102A43] hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1 -mr-1">
          {/* Summary Box */}
          <div className="bg-[#102A43]/70 border border-[#243B55] rounded-2xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Total Mensual Programado en este Grupo
              </span>
              <p className="text-lg font-black text-white mt-0.5">
                {formatCOP(totalScheduled)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-medium">Ítems activos</span>
              <p className="text-sm font-bold text-[#00ADB5]">
                {allItems.length} {allItems.length === 1 ? 'fecha' : 'fechas'}
              </p>
            </div>
          </div>

          {/* List of Existing Items */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarCheck className="w-3.5 h-3.5 text-[#00ADB5]" />
              Compromisos y Fechas Configuradas
            </h3>

            {isLoading ? (
              <div className="py-6 text-center text-xs text-slate-400">Cargando fechas programadas...</div>
            ) : allItems.length === 0 ? (
              <div className="bg-[#070F1E]/60 border border-dashed border-[#1E3A5F] rounded-2xl p-5 text-center space-y-2">
                <Info className="w-7 h-7 text-slate-500 mx-auto" />
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Aún no tienes fechas específicas programadas en este grupo. Agrega abajo cada fecha individual (ej: 1ra Quincena, 2da Quincena, etc.).
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {allItems.map((item: any) => {
                  const isEditingThis = editingItemId === item.id;
                  let scheduleText = '';
                  if (item.frequency === 'MONTHLY') {
                    scheduleText = `Día ${item.due_day} de cada mes`;
                  } else if (item.frequency === 'ONCE') {
                    scheduleText = `Puntual: ${item.specific_date?.slice(0, 10)}`;
                  } else if (item.frequency === 'ANNUAL') {
                    scheduleText = `Anual: cada ${item.specific_date?.slice(0, 10)}`;
                  }

                  return (
                    <div 
                      key={item.id}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                        isEditingThis 
                          ? 'bg-[#102A43] border-[#00ADB5] ring-1 ring-[#00ADB5]/40' 
                          : 'bg-[#102A43]/50 border-[#1E3A5F] hover:border-slate-600'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white truncate">
                            {item.name}
                          </span>
                          <span className="text-[10px] font-semibold text-[#00ADB5] bg-[#00ADB5]/10 px-2 py-0.5 rounded-md shrink-0">
                            {scheduleText}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px]">
                          <span className="font-extrabold text-white">
                            {formatCOP(item.amount)}
                          </span>
                          {item.notes && (
                            <span className="text-slate-400 truncate max-w-xs text-[10px]">
                              • {item.notes}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          onClick={() => handleStartEdit(item)}
                          className="p-1.5 rounded-lg bg-[#070F1E] hover:bg-[#1E3A5F] text-slate-300 hover:text-white transition-colors"
                          title="Editar fecha o monto"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.name)}
                          className="p-1.5 rounded-lg bg-[#070F1E] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Eliminar"
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

          {/* Form to Add or Edit an Item */}
          <form onSubmit={handleSubmit} className="bg-[#070F1E]/80 border border-[#1E3A5F] rounded-2xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                {editingItemId ? <Edit2 className="w-3.5 h-3.5 text-cyan-400" /> : <Plus className="w-3.5 h-3.5 text-[#00ADB5]" />}
                {editingItemId ? 'Editar Fecha / Compromiso' : 'Agregar Nueva Fecha / Compromiso'}
              </h4>
              {editingItemId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-[10px] text-slate-400 hover:text-white underline font-medium"
                >
                  Cancelar edición
                </button>
              )}
            </div>

            {/* Name and Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Nombre del Cobro / Compromiso *
                </label>
                <input
                  type="text"
                  placeholder={isIncome ? "Ej: 1ra Quincena, Cliente SaaS" : "Ej: Plan Celular, Servidor VPS"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#102A43] border border-[#1E3A5F] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-[#00ADB5]"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Monto ($ COP) *
                </label>
                <input
                  type="number"
                  placeholder="Ej: 1082500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-[#102A43] border border-[#1E3A5F] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-[#00ADB5]"
                  required
                  min="0"
                  step="100"
                />
              </div>
            </div>

            {/* Frequency Selector */}
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Frecuencia del Evento
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFrequency('MONTHLY')}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                    frequency === 'MONTHLY'
                      ? 'bg-[#00ADB5]/20 border-[#00ADB5] text-[#00ADB5]'
                      : 'bg-[#102A43] border-[#1E3A5F] text-slate-400 hover:text-white'
                  }`}
                >
                  Mensual
                </button>
                <button
                  type="button"
                  onClick={() => setFrequency('ONCE')}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                    frequency === 'ONCE'
                      ? 'bg-[#00ADB5]/20 border-[#00ADB5] text-[#00ADB5]'
                      : 'bg-[#102A43] border-[#1E3A5F] text-slate-400 hover:text-white'
                  }`}
                >
                  1 Sola Vez
                </button>
                <button
                  type="button"
                  onClick={() => setFrequency('ANNUAL')}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                    frequency === 'ANNUAL'
                      ? 'bg-[#00ADB5]/20 border-[#00ADB5] text-[#00ADB5]'
                      : 'bg-[#102A43] border-[#1E3A5F] text-slate-400 hover:text-white'
                  }`}
                >
                  Anual
                </button>
              </div>
            </div>

            {/* Due Day or Specific Date */}
            {frequency === 'MONTHLY' ? (
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Día del Mes (1 al 31) *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="15"
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    className="w-24 bg-[#102A43] border border-[#1E3A5F] rounded-xl px-3 py-2 text-xs text-white font-bold text-center focus:outline-hidden focus:border-[#00ADB5]"
                    required
                  />
                  <span className="text-[11px] text-slate-400">
                    Se calculará y alertará cada día {dueDay || '15'} de cada mes.
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Fecha Específica *
                </label>
                <input
                  type="date"
                  value={specificDate}
                  onChange={(e) => setSpecificDate(e.target.value)}
                  className="w-full bg-[#102A43] border border-[#1E3A5F] rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#00ADB5]"
                  required
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Nota u Observación (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ej: Factura llega al correo, pagar antes de las 5pm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#102A43] border border-[#1E3A5F] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-[#00ADB5]"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-linear-to-r from-[#00ADB5] to-[#06B6D4] text-[#0B192C] font-extrabold text-xs shadow-lg shadow-[#00ADB5]/20 flex items-center justify-center gap-2 hover:opacity-95 active:scale-98 transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[3px]" />
              <span>{isSubmitting ? 'Guardando...' : (editingItemId ? 'Actualizar Compromiso' : 'Guardar y Programar Fecha')}</span>
            </button>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-[#1E3A5F]/70 pt-3 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-[#102A43] hover:bg-[#1E3A5F] text-slate-200 font-bold text-xs transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
