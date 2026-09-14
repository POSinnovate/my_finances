'use client';

import React, { useState } from 'react';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Check, 
  Edit2, 
  Info, 
  CalendarCheck 
} from 'lucide-react';
import { formatCOP } from '@/lib/utils';
import { useScheduledItems, useInvalidateFinance } from '@/lib/api-hooks';
import { toast } from 'sonner';
import { Modal, Button, Badge, Input } from '@/components/ui';

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
            frequency,
            due_day: frequency === 'MONTHLY' ? parseInt(dueDay, 10) : null,
            specific_date: frequency !== 'MONTHLY' ? specificDate : null,
            notes: notes.trim() || null,
          }),
        });
        if (!res.ok) throw new Error('Error al actualizar');
        toast.success('Fecha programada actualizada');
      } else {
        // Create
        const res = await fetch('/api/scheduled-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category_id: category.id,
            name: name.trim(),
            amount: numAmount,
            frequency,
            due_day: frequency === 'MONTHLY' ? parseInt(dueDay, 10) : null,
            specific_date: frequency !== 'MONTHLY' ? specificDate : null,
            notes: notes.trim() || null,
          }),
        });
        if (!res.ok) throw new Error('Error al programar');
        toast.success('Nueva fecha programada');
      }

      resetForm();
      invalidateFinance();
    } catch {
      toast.error('Error al guardar el compromiso programado');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, itemName: string) => {
    if (!confirm(`¿Eliminar la programación de "${itemName}"?`)) return;
    try {
      const res = await fetch(`/api/scheduled-items?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Error al eliminar');
      toast.success('Fecha programada eliminada');
      invalidateFinance();
      if (editingItemId === id) resetForm();
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const titleNode = (
    <div className="flex items-center gap-3">
      <div 
        className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-background shadow-md shrink-0"
        style={{ backgroundColor: category.color || (isIncome ? '#10B981' : '#00ADB5') }}
      >
        <Calendar className="w-5 h-5" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <Badge variant={isIncome ? 'success' : 'accent'} size="sm">
            {isIncome ? 'Cobros & Entradas' : 'Fechas & Pagos'}
          </Badge>
        </div>
        <h2 className="text-base sm:text-lg font-black text-foreground mt-0.5">
          Fechas Programadas: {category.name}
        </h2>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={titleNode}
      maxWidth="lg"
    >
      <div className="space-y-4 pt-1">
        {/* Summary Box */}
        <div className="bg-surface-elevated/70 border border-border rounded-2xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-foreground/60 uppercase tracking-wider">
              Total Mensual Programado en este Grupo
            </span>
            <p className="text-lg font-black text-foreground mt-0.5">
              {formatCOP(totalScheduled)}
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-foreground/50 font-medium">Ítems activos</span>
            <p className="text-sm font-bold text-primary">
              {allItems.length} {allItems.length === 1 ? 'fecha' : 'fechas'}
            </p>
          </div>
        </div>

        {/* List of Existing Items */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold text-foreground/80 uppercase tracking-wider flex items-center gap-1.5">
            <CalendarCheck className="w-3.5 h-3.5 text-primary" />
            Compromisos y Fechas Configuradas
          </h3>

          {isLoading ? (
            <div className="py-6 text-center text-xs text-foreground/50">Cargando fechas programadas...</div>
          ) : allItems.length === 0 ? (
            <div className="bg-surface border border-dashed border-border rounded-2xl p-5 text-center space-y-2">
              <Info className="w-7 h-7 text-foreground/40 mx-auto" />
              <p className="text-xs text-foreground/60 max-w-sm mx-auto">
                Aún no tienes fechas específicas programadas en este grupo. Agrega abajo cada fecha individual (ej: 1ra Quincena, 2da Quincena, etc.).
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
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
                        ? 'bg-surface-elevated border-primary ring-1 ring-primary/40' 
                        : 'bg-surface-elevated/50 border-border hover:border-primary/40'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground truncate">
                          {item.name}
                        </span>
                        <Badge variant="accent" size="sm">
                          {scheduleText}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px]">
                        <span className="font-extrabold text-foreground">
                          {formatCOP(item.amount)}
                        </span>
                        {item.notes && (
                          <span className="text-foreground/50 truncate max-w-xs text-[10px]">
                            • {item.notes}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleStartEdit(item)}
                        title="Editar fecha o monto"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(item.id, item.name)}
                        className="text-danger hover:text-danger hover:bg-danger/15"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Form to Add or Edit an Item */}
        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
              {editingItemId ? <Edit2 className="w-3.5 h-3.5 text-accent" /> : <Plus className="w-3.5 h-3.5 text-primary" />}
              {editingItemId ? 'Editar Fecha / Compromiso' : 'Agregar Nueva Fecha / Compromiso'}
            </h4>
            {editingItemId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-[10px] text-foreground/50 hover:text-foreground underline font-medium cursor-pointer"
              >
                Cancelar edición
              </button>
            )}
          </div>

          {/* Name and Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-foreground/70 block mb-1">
                Nombre del Cobro / Compromiso *
              </label>
              <Input
                type="text"
                placeholder={isIncome ? "Ej: 1ra Quincena, Cliente SaaS" : "Ej: Plan Celular, Servidor VPS"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-foreground/70 block mb-1">
                Monto ($ COP) *
              </label>
              <Input
                type="number"
                placeholder="Ej: 1082500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="0"
                step="100"
              />
            </div>
          </div>

          {/* Frequency Selector */}
          <div>
            <label className="text-[11px] font-bold text-foreground/70 block mb-1">
              Frecuencia del Evento
            </label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={frequency === 'MONTHLY' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setFrequency('MONTHLY')}
              >
                Mensual
              </Button>
              <Button
                type="button"
                variant={frequency === 'ONCE' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setFrequency('ONCE')}
              >
                1 Sola Vez
              </Button>
              <Button
                type="button"
                variant={frequency === 'ANNUAL' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setFrequency('ANNUAL')}
              >
                Anual
              </Button>
            </div>
          </div>

          {/* Due Day or Specific Date */}
          {frequency === 'MONTHLY' ? (
            <div>
              <label className="text-[11px] font-bold text-foreground/70 block mb-1">
                Día del Mes (1 al 31) *
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={31}
                  placeholder="15"
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  required
                  className="w-24 text-center font-bold"
                />
                <span className="text-[11px] text-foreground/50">
                  Se calculará y alertará cada día {dueDay || '15'} de cada mes.
                </span>
              </div>
            </div>
          ) : (
            <div>
              <label className="text-[11px] font-bold text-foreground/70 block mb-1">
                Fecha Específica *
              </label>
              <Input
                type="date"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                required
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-[11px] font-bold text-foreground/70 block mb-1">
              Nota u Observación (Opcional)
            </label>
            <Input
              type="text"
              placeholder="Ej: Factura llega al correo, pagar antes de las 5pm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            fullWidth
            className="gap-2"
          >
            <Check className="w-4 h-4 stroke-[3px]" />
            <span>{isSubmitting ? 'Guardando...' : (editingItemId ? 'Actualizar Compromiso' : 'Guardar y Programar Fecha')}</span>
          </Button>
        </form>

        {/* Modal Footer */}
        <div className="border-t border-border pt-3 flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
          >
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
