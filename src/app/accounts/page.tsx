'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { QuickExpenseModal } from '@/components/expenses/QuickExpenseModal';
import { formatCOP } from '@/lib/utils';
import { 
  useUser, 
  usePaymentMethods, 
  useCategories,
  useInvalidateFinance 
} from '@/lib/api-hooks';
import { 
  Wallet, 
  Plus, 
  ArrowLeft, 
  Trash2, 
  Edit3, 
  SlidersHorizontal, 
  Smartphone, 
  Building2, 
  CreditCard, 
  Banknote, 
  ArrowDownRight, 
  ArrowUpRight, 
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageBanner } from '@/components/ui';

const COLOR_OPTIONS = [
  '#00ADB5', '#06B6D4', '#3B82F6', '#8B5CF6', 
  '#EC4899', '#EF4444', '#F59E0B', '#10B981'
];

const METHOD_TYPES = [
  { id: 'WALLET', label: 'Billetera Digital (Nequi, Daviplata, Dale)', icon: Smartphone },
  { id: 'BANK', label: 'Cuenta Bancaria (Bancolombia, Falabella, Nu)', icon: Building2 },
  { id: 'CASH', label: 'Efectivo en Mano / Caja', icon: Banknote },
  { id: 'CARD', label: 'Tarjeta de Crédito', icon: CreditCard },
  { id: 'OTHER', label: 'Otro Medio / Cuenta', icon: Wallet },
];

export default function AccountsPage() {
  const invalidateFinance = useInvalidateFinance();
  const { data: user } = useUser();
  const { data: paymentMethods = [], refetch: refetchPaymentMethods } = usePaymentMethods();
  const { data: categories = [] } = useCategories();

  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);

  // Add Account Modal
  const [isAddMethodOpen, setIsAddMethodOpen] = useState(false);
  const [newMethodName, setNewMethodName] = useState('');
  const [newMethodType, setNewMethodType] = useState('WALLET');
  const [newMethodColor, setNewMethodColor] = useState(COLOR_OPTIONS[0]);
  const [newMethodInitialBalance, setNewMethodInitialBalance] = useState('');
  const [isCreatingMethod, setIsCreatingMethod] = useState(false);

  // Edit / Calibrate Account Modal
  const [editingMethod, setEditingMethod] = useState<any | null>(null);
  const [editMethodName, setEditMethodName] = useState('');
  const [editMethodType, setEditMethodType] = useState('WALLET');
  const [editMethodColor, setEditMethodColor] = useState(COLOR_OPTIONS[0]);
  const [editMethodTargetBalance, setEditMethodTargetBalance] = useState('');
  const [isSavingEditMethod, setIsSavingEditMethod] = useState(false);

  // Total balance across all accounts
  const totalBalance = paymentMethods.reduce(
    (acc: number, pm: any) => acc + (Number(pm.net_balance) || 0), 
    0
  );

  // Create new account
  const handleCreateMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMethodName.trim()) {
      toast.error('El nombre de la cuenta es obligatorio');
      return;
    }

    setIsCreatingMethod(true);
    try {
      const res = await fetch('/api/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newMethodName.trim(),
          type: newMethodType,
          color: newMethodColor,
          initial_balance: Number(newMethodInitialBalance) || 0,
        }),
      });

      if (res.ok) {
        toast.success(`Cuenta "${newMethodName.trim()}" agregada con éxito`);
        setIsAddMethodOpen(false);
        setNewMethodName('');
        setNewMethodInitialBalance('');
        await refetchPaymentMethods();
        invalidateFinance();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Error al crear cuenta');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setIsCreatingMethod(false);
    }
  };

  // Open edit modal with current balance pre-filled
  const handleOpenEditMethod = (pm: any) => {
    setEditingMethod(pm);
    setEditMethodName(pm.name);
    setEditMethodType(pm.type || 'WALLET');
    setEditMethodColor(pm.color || COLOR_OPTIONS[0]);
    setEditMethodTargetBalance(
      pm.net_balance !== undefined ? String(pm.net_balance) : String(pm.initial_balance || 0)
    );
  };

  // Save edit / balance rebalance
  const handleSaveEditMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMethod || !editMethodName.trim()) return;

    setIsSavingEditMethod(true);
    try {
      const payload: any = {
        id: editingMethod.id,
        name: editMethodName.trim(),
        type: editMethodType,
        color: editMethodColor,
      };

      if (editMethodTargetBalance !== '') {
        const parsed = Number(editMethodTargetBalance);
        if (!isNaN(parsed)) {
          payload.target_balance = parsed;
        }
      }

      const res = await fetch('/api/payment-methods', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(`Cuenta "${editMethodName.trim()}" actualizada`);
        setEditingMethod(null);
        await refetchPaymentMethods();
        invalidateFinance();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Error al actualizar');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setIsSavingEditMethod(false);
    }
  };

  // Delete account
  const handleDeleteMethod = async (id: string, name: string) => {
    if (paymentMethods.length <= 1) {
      toast.error('Debes tener al menos una cuenta activa');
      return;
    }

    if (!confirm(`¿Eliminar la cuenta "${name}"? Los movimientos asociados seguirán registrados como auditoría.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/payment-methods?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(`Cuenta "${name}" eliminada`);
        await refetchPaymentMethods();
        invalidateFinance();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Error al eliminar');
      }
    } catch {
      toast.error('Error de conexión');
    }
  };

  return (
    <div className="min-h-screen bg-[#070F1E] flex flex-col pb-24">
      <Header user={user} onUserUpdate={invalidateFinance} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-4 py-5 space-y-4">
        {/* Top Header Banner */}
        <PageBanner
          icon={<Wallet className="w-5 h-5" />}
          title="Cuentas y Métodos de Pago"
          description="Monitorea tus cuentas bancarias, billeteras digitales y efectivo. Tu fondo disponible general se calcula en tiempo real con la suma de estos balances."
          badgeText={`${paymentMethods.length} ${paymentMethods.length === 1 ? 'cuenta' : 'cuentas'}`}
          actionText="Nueva Cuenta"
          onAction={() => setIsAddMethodOpen(true)}
          theme="cyan"
        />

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

            const isPositive = (pm.net_balance ?? 0) >= 0;

            return (
              <div
                key={pm.id}
                className="p-4 rounded-2xl bg-[#0B192C] border border-[#1E3A5F] hover:border-[#00ADB5]/50 transition-all space-y-3 shadow-lg"
              >
                {/* Account Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md"
                      style={{ backgroundColor: pm.color || '#00ADB5' }}
                    >
                      <IconComponent className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-black text-white truncate">{pm.name}</h3>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold whitespace-nowrap">
                        {pm.type === 'WALLET'
                          ? 'Billetera Digital'
                          : pm.type === 'CASH'
                          ? 'Efectivo en Mano'
                          : pm.type === 'CARD'
                          ? 'Tarjeta de Crédito'
                          : 'Cuenta Bancaria'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEditMethod(pm)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all cursor-pointer"
                      title="Editar o calibrar saldo"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {paymentMethods.length > 1 && (
                      <button
                        onClick={() => handleDeleteMethod(pm.id, pm.name)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                        title="Eliminar cuenta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Account Activity Summary (This Month) */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#1E3A5F]/60">
                  <div className="p-2 rounded-xl bg-[#102A43]/60">
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 whitespace-nowrap">
                      <ArrowDownRight className="w-3 h-3 shrink-0" />
                      <span>Entró este mes</span>
                    </span>
                    <p className="text-xs font-black text-white mt-0.5 whitespace-nowrap font-mono">
                      {formatCOP(pm.income_this_month || 0)}
                    </p>
                    {pm.transfers_in > 0 && (
                      <span className="text-[9px] text-cyan-300 font-medium block mt-0.5 truncate font-mono">
                        {formatCOP(pm.transfers_in)} transf.
                      </span>
                    )}
                  </div>

                  <div className="p-2 rounded-xl bg-[#102A43]/60">
                    <span className="text-[10px] text-rose-400 font-bold flex items-center gap-1 whitespace-nowrap">
                      <ArrowUpRight className="w-3 h-3 shrink-0" />
                      <span>Salió este mes</span>
                    </span>
                    <p className="text-xs font-black text-white mt-0.5 whitespace-nowrap font-mono">
                      {formatCOP(pm.expense_this_month || 0)}
                    </p>
                    {pm.transfers_out > 0 && (
                      <span className="text-[9px] text-cyan-300 font-medium block mt-0.5 truncate font-mono">
                        {formatCOP(pm.transfers_out)} transf.
                      </span>
                    )}
                  </div>
                </div>

                {/* Balance & Calibration Pill */}
                <div className="p-2.5 rounded-xl bg-[#070F1E] border border-[#1E3A5F] flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium block">Saldo Actual:</span>
                    <span className={`text-sm font-black font-mono block ${
                      isPositive ? 'text-cyan-300' : 'text-rose-400'
                    }`}>
                      {formatCOP(pm.net_balance ?? 0)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenEditMethod(pm)}
                    className="px-2.5 py-1 rounded-lg bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                    title="Equilibrar o calibrar el saldo de esta cuenta"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>Ajustar</span>
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                  <span className="whitespace-nowrap">Movimientos registrados:</span>
                  <span className="font-extrabold text-white whitespace-nowrap font-mono">
                    {pm.movement_count || 0}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* MODAL: AGREGAR NUEVA CUENTA */}
      {isAddMethodOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#0B192C] border border-[#1E3A5F] rounded-3xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E3A5F]">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-cyan-400" />
                <span>Nueva Cuenta o Medio de Pago</span>
              </span>
              <button
                onClick={() => setIsAddMethodOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMethod} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre de la Cuenta *
                </label>
                <input
                  type="text"
                  required
                  value={newMethodName}
                  onChange={(e) => setNewMethodName(e.target.value)}
                  placeholder="Ej: Bancolombia, Nequi, Efectivo de Bolsillo"
                  className="w-full bg-[#102A43] border border-[#243B55] rounded-xl px-3 py-2 text-sm text-white placeholder-slate-400 outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tipo de Cuenta
                </label>
                <select
                  value={newMethodType}
                  onChange={(e) => setNewMethodType(e.target.value)}
                  className="w-full bg-[#102A43] border border-[#243B55] rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                >
                  {METHOD_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Saldo Inicial en esta cuenta ($ COP)
                </label>
                <input
                  type="number"
                  step="1000"
                  value={newMethodInitialBalance}
                  onChange={(e) => setNewMethodInitialBalance(e.target.value)}
                  placeholder="0"
                  className="w-full bg-[#102A43] border border-[#243B55] rounded-xl px-3 py-2 text-sm font-mono text-white outline-none focus:border-cyan-400"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  El dinero que tienes en esta cuenta al momento de crearla.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Color Identificador
                </label>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewMethodColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                        newMethodColor === c ? 'scale-110 ring-2 ring-white' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddMethodOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#243B55] text-xs font-bold text-slate-300 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingMethod}
                  className="flex-1 py-2.5 rounded-xl bg-cyan-400 text-slate-950 text-xs font-black hover:bg-cyan-300 transition-colors disabled:opacity-50"
                >
                  {isCreatingMethod ? 'Creando...' : 'Crear Cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR / EQUILIBRAR CUENTA */}
      {editingMethod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#0B192C] border border-cyan-400 rounded-3xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E3A5F]">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-cyan-400" />
                <span>Editar / Calibrar Cuenta</span>
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
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre de la Cuenta *
                </label>
                <input
                  type="text"
                  required
                  value={editMethodName}
                  onChange={(e) => setEditMethodName(e.target.value)}
                  className="w-full bg-[#102A43] border border-[#243B55] rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tipo de Cuenta
                </label>
                <select
                  value={editMethodType}
                  onChange={(e) => setEditMethodType(e.target.value)}
                  className="w-full bg-[#102A43] border border-[#243B55] rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                >
                  {METHOD_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Equilibrar / Calibrar Saldo */}
              <div className="bg-[#102A43] border border-cyan-500/40 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Equilibrar / Calibrar Saldo Real</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Actual: {formatCOP(editingMethod.net_balance ?? 0)}
                  </span>
                </div>
                <input
                  type="number"
                  step="100"
                  value={editMethodTargetBalance}
                  onChange={(e) => setEditMethodTargetBalance(e.target.value)}
                  placeholder="Saldo real exacto"
                  className="w-full bg-[#0B192C] border border-[#243B55] focus:border-cyan-400 rounded-xl px-3 py-2 text-sm font-mono text-white outline-none font-bold"
                />
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Si tu saldo en la app no coincide con el saldo de tu app bancaria o billetera, escribe aquí el saldo real y el sistema generará un movimiento de ajuste automático.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Color Identificador
                </label>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewMethodColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                        editMethodColor === c ? 'scale-110 ring-2 ring-white' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMethod(null)}
                  className="flex-1 py-2.5 rounded-xl border border-[#243B55] text-xs font-bold text-slate-300 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingEditMethod}
                  className="flex-1 py-2.5 rounded-xl bg-cyan-400 text-slate-950 text-xs font-black hover:bg-cyan-300 transition-colors disabled:opacity-50"
                >
                  {isSavingEditMethod ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
