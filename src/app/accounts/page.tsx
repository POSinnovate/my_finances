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
  Layers,
  PiggyBank,
  ArrowRightLeft,
  DollarSign
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

  // Add Pocket Modal
  const [isAddPocketOpen, setIsAddPocketOpen] = useState(false);
  const [pocketTargetMethod, setPocketTargetMethod] = useState<any | null>(null);
  const [newPocketName, setNewPocketName] = useState('');
  const [newPocketColor, setNewPocketColor] = useState(COLOR_OPTIONS[1]);
  const [newPocketTargetAmount, setNewPocketTargetAmount] = useState('');
  const [newPocketInitialFunding, setNewPocketInitialFunding] = useState('');
  const [isCreatingPocket, setIsCreatingPocket] = useState(false);

  // Transfer Pocket Modal (Meter / Sacar dinero)
  const [transferModalData, setTransferModalData] = useState<{
    pocket: any;
    account: any;
  } | null>(null);
  const [transferType, setTransferType] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');
  const [transferAmount, setTransferAmount] = useState('');
  const [isTransferringPocket, setIsTransferringPocket] = useState(false);

  // Total balance across all accounts
  const totalBalance = paymentMethods.reduce(
    (acc: number, pm: any) => acc + (Number(pm.net_balance) || 0), 
    0
  );
  const totalFreeBalance = paymentMethods.reduce(
    (acc: number, pm: any) => acc + (Number(pm.free_balance !== undefined ? pm.free_balance : pm.net_balance) || 0), 
    0
  );
  const totalPocketsBalance = paymentMethods.reduce(
    (acc: number, pm: any) => acc + (Number(pm.pockets_balance) || 0), 
    0
  );

  // Open Add Pocket Modal
  const handleOpenAddPocket = (pm: any) => {
    setPocketTargetMethod(pm);
    setNewPocketName('');
    setNewPocketColor(COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)]);
    setNewPocketTargetAmount('');
    setNewPocketInitialFunding('');
    setIsAddPocketOpen(true);
  };

  // Create Pocket
  const handleCreatePocket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pocketTargetMethod || !newPocketName.trim()) {
      toast.error('Nombre del bolsillo obligatorio');
      return;
    }

    const funding = Number(newPocketInitialFunding) || 0;
    const freeBal = pocketTargetMethod.free_balance !== undefined ? pocketTargetMethod.free_balance : (pocketTargetMethod.net_balance || 0);
    if (funding > freeBal) {
      toast.error(`El saldo libre disponible en ${pocketTargetMethod.name} es ${formatCOP(freeBal)}`);
      return;
    }

    setIsCreatingPocket(true);
    try {
      const res = await fetch('/api/pockets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_method_id: pocketTargetMethod.id,
          name: newPocketName.trim(),
          color: newPocketColor,
          target_amount: Number(newPocketTargetAmount) || 0,
          initial_balance: funding,
        }),
      });

      if (res.ok) {
        toast.success(`Bolsillo "${newPocketName.trim()}" creado`);
        setIsAddPocketOpen(false);
        setNewPocketName('');
        setNewPocketInitialFunding('');
        setNewPocketTargetAmount('');
        await refetchPaymentMethods();
        invalidateFinance();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Error al crear bolsillo');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setIsCreatingPocket(false);
    }
  };

  // Open Transfer Modal
  const handleOpenTransferPocket = (pocket: any, account: any, type: 'DEPOSIT' | 'WITHDRAW') => {
    setTransferModalData({ pocket, account });
    setTransferType(type);
    setTransferAmount('');
  };

  // Handle Transfer (Meter / Sacar)
  const handleTransferPocket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferModalData || !transferAmount) return;

    const amt = Number(transferAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }

    const { pocket, account } = transferModalData;
    const freeBal = account.free_balance !== undefined ? account.free_balance : (account.net_balance || 0);

    if (transferType === 'DEPOSIT' && amt > freeBal) {
      toast.error(`Solo tienes ${formatCOP(freeBal)} libres en ${account.name}`);
      return;
    }

    if (transferType === 'WITHDRAW' && amt > pocket.current_balance) {
      toast.error(`Solo tienes ${formatCOP(pocket.current_balance)} en este bolsillo`);
      return;
    }

    setIsTransferringPocket(true);
    try {
      const res = await fetch(`/api/pockets/${pocket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transfer',
          transfer_type: transferType,
          amount: amt,
        }),
      });

      if (res.ok) {
        toast.success(
          transferType === 'DEPOSIT'
            ? `Ingresaste ${formatCOP(amt)} al bolsillo "${pocket.name}"`
            : `Sacaste ${formatCOP(amt)} al saldo libre de "${account.name}"`
        );
        setTransferModalData(null);
        setTransferAmount('');
        await refetchPaymentMethods();
        invalidateFinance();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Error en la transferencia');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setIsTransferringPocket(false);
    }
  };

  // Delete Pocket
  const handleDeletePocket = async (pocket: any, accountName: string) => {
    if (!confirm(`¿Eliminar el bolsillo "${pocket.name}"? Los ${formatCOP(pocket.current_balance)} guardados quedarán disponibles automáticamente como saldo libre en ${accountName}.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/pockets/${pocket.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(`Bolsillo "${pocket.name}" eliminado`);
        await refetchPaymentMethods();
        invalidateFinance();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Error al eliminar bolsillo');
      }
    } catch {
      toast.error('Error de conexión');
    }
  };

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

                {/* Balances Section: Total vs Libre vs Bolsillos */}
                <div className="p-3 rounded-2xl bg-[#070F1E] border border-[#1E3A5F] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block">Saldo Total en Cuenta:</span>
                      <span className={`text-sm sm:text-base font-black font-mono block ${
                        isPositive ? 'text-white' : 'text-rose-400'
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

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1E3A5F]/60">
                    <div className="p-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30">
                      <span className="text-[10px] text-cyan-300 font-bold block">
                        Saldo Libre (Gastos)
                      </span>
                      <span className="text-xs font-black text-cyan-400 font-mono block mt-0.5">
                        {formatCOP(pm.free_balance !== undefined ? pm.free_balance : (pm.net_balance ?? 0))}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-violet-950/40 border border-violet-500/30">
                      <span className="text-[10px] text-violet-300 font-bold block">
                        En Bolsillos
                      </span>
                      <span className="text-xs font-black text-violet-400 font-mono block mt-0.5">
                        {formatCOP(pm.pockets_balance || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bolsillos Sub-Section */}
                <div className="pt-2 border-t border-[#1E3A5F]/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-xs font-bold text-slate-200">
                        Bolsillos ({pm.pockets?.length || 0})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenAddPocket(pm)}
                      className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950/40 border border-cyan-500/30 hover:border-cyan-400 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Bolsillo</span>
                    </button>
                  </div>

                  {/* Horizontal carousel of pockets */}
                  {pm.pockets && pm.pockets.length > 0 ? (
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 whitespace-nowrap">
                      {pm.pockets.map((pkt: any) => (
                        <div
                          key={pkt.id}
                          className="px-2.5 py-1.5 rounded-xl bg-[#102A43]/80 border border-[#243B55] hover:border-cyan-500/40 shrink-0 flex items-center gap-2 shadow-sm transition-all"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: pkt.color || '#00ADB5' }}
                          />
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-bold text-white truncate max-w-[110px]">
                                {pkt.name}
                              </span>
                            </div>
                            <span className="text-xs font-extrabold text-cyan-300 font-mono block">
                              {formatCOP(pkt.current_balance)}
                            </span>
                          </div>
                          
                          {/* Actions: Meter / Sacar / Delete */}
                          <div className="flex items-center gap-0.5 pl-1 border-l border-[#243B55]">
                            <button
                              type="button"
                              onClick={() => handleOpenTransferPocket(pkt, pm, 'DEPOSIT')}
                              className="p-1 rounded text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                              title="Meter dinero al bolsillo"
                            >
                              <ArrowDownRight className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenTransferPocket(pkt, pm, 'WITHDRAW')}
                              className="p-1 rounded text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                              title="Sacar dinero al saldo libre"
                            >
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePocket(pkt, pm.name)}
                              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                              title="Eliminar bolsillo"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">
                      Sin bolsillos creados en esta cuenta.
                    </p>
                  )}
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
                      onClick={() => setEditMethodColor(c)}
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

      {/* MODAL: CREAR NUEVO BOLSILLO */}
      {isAddPocketOpen && pocketTargetMethod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#0B192C] border border-[#1E3A5F] rounded-3xl p-5 sm:p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E3A5F]">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Nuevo Bolsillo en {pocketTargetMethod.name}</span>
              </span>
              <button
                onClick={() => setIsAddPocketOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePocket} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre del Bolsillo *
                </label>
                <input
                  type="text"
                  required
                  value={newPocketName}
                  onChange={(e) => setNewPocketName(e.target.value)}
                  placeholder="Ej: Arriendo, Ahorro Moto, Vacaciones"
                  className="w-full bg-[#102A43] border border-[#243B55] rounded-xl px-3 py-2 text-sm text-white placeholder-slate-400 outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Monto Inicial a Asignar ($ COP)
                  </label>
                  <span className="text-[10px] text-cyan-400 font-mono">
                    Libre en cuenta: {formatCOP(pocketTargetMethod.free_balance !== undefined ? pocketTargetMethod.free_balance : (pocketTargetMethod.net_balance || 0))}
                  </span>
                </div>
                <input
                  type="number"
                  step="1000"
                  value={newPocketInitialFunding}
                  onChange={(e) => setNewPocketInitialFunding(e.target.value)}
                  placeholder="0"
                  className="w-full bg-[#102A43] border border-[#243B55] rounded-xl px-3 py-2 text-sm font-mono text-white outline-none focus:border-cyan-400"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Se apartará del saldo libre de {pocketTargetMethod.name} y quedará protegido en este bolsillo.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Meta Opcional ($ COP)
                </label>
                <input
                  type="number"
                  step="1000"
                  value={newPocketTargetAmount}
                  onChange={(e) => setNewPocketTargetAmount(e.target.value)}
                  placeholder="Ej: 1500000"
                  className="w-full bg-[#102A43] border border-[#243B55] rounded-xl px-3 py-2 text-sm font-mono text-white outline-none focus:border-cyan-400"
                />
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
                      onClick={() => setNewPocketColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                        newPocketColor === c ? 'scale-110 ring-2 ring-white' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddPocketOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#243B55] text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingPocket}
                  className="flex-1 py-2.5 rounded-xl bg-cyan-400 text-slate-950 text-xs font-black hover:bg-cyan-300 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isCreatingPocket ? 'Creando...' : 'Crear Bolsillo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TRANSFERIR DINERO A / DESDE BOLSILLO (METER / SACAR) */}
      {transferModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#0B192C] border border-[#1E3A5F] rounded-3xl p-5 sm:p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E3A5F]">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
                <span>
                  {transferType === 'DEPOSIT'
                    ? `Meter dinero a "${transferModalData.pocket.name}"`
                    : `Sacar dinero de "${transferModalData.pocket.name}"`}
                </span>
              </span>
              <button
                onClick={() => setTransferModalData(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Type selector toggle (Meter vs Sacar) */}
            <div className="flex bg-[#070F1E] p-1 rounded-xl border border-[#1E3A5F] mt-4 mb-3">
              <button
                type="button"
                onClick={() => setTransferType('DEPOSIT')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  transferType === 'DEPOSIT'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>Meter al Bolsillo</span>
              </button>
              <button
                type="button"
                onClick={() => setTransferType('WITHDRAW')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  transferType === 'WITHDRAW'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Sacar a Saldo Libre</span>
              </button>
            </div>

            <form onSubmit={handleTransferPocket} className="space-y-3.5">
              {/* Balances summary */}
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-[#102A43]/60 border border-[#243B55]">
                <div>
                  <span className="text-[10px] text-slate-400 block">En Bolsillo:</span>
                  <span className="text-xs font-black text-cyan-300 font-mono block">
                    {formatCOP(transferModalData.pocket.current_balance)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Libre en {transferModalData.account.name}:</span>
                  <span className="text-xs font-black text-emerald-400 font-mono block">
                    {formatCOP(transferModalData.account.free_balance !== undefined ? transferModalData.account.free_balance : (transferModalData.account.net_balance || 0))}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Monto a {transferType === 'DEPOSIT' ? 'Meter' : 'Sacar'} ($ COP) *
                </label>
                <input
                  type="number"
                  step="1000"
                  required
                  autoFocus
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-[#102A43] border border-[#243B55] rounded-xl px-3 py-2 text-base font-mono font-bold text-white outline-none focus:border-cyan-400"
                />
              </div>

              {/* Quick shortcut buttons */}
              <div className="flex gap-1.5 flex-wrap">
                {[20000, 50000, 100000, 200000, 500000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setTransferAmount(String(val))}
                    className="text-[11px] px-2 py-0.5 rounded-lg bg-[#070F1E] border border-[#243B55] text-slate-300 hover:text-white font-mono cursor-pointer"
                  >
                    +{formatCOP(val).replace('$', '').trim()}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTransferModalData(null)}
                  className="flex-1 py-2.5 rounded-xl border border-[#243B55] text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isTransferringPocket || !transferAmount}
                  className={`flex-1 py-2.5 rounded-xl text-slate-950 text-xs font-black transition-colors disabled:opacity-50 cursor-pointer ${
                    transferType === 'DEPOSIT'
                      ? 'bg-emerald-400 hover:bg-emerald-300'
                      : 'bg-amber-400 hover:bg-amber-300'
                  }`}
                >
                  {isTransferringPocket ? 'Procesando...' : transferType === 'DEPOSIT' ? 'Meter al Bolsillo' : 'Sacar a Saldo Libre'}
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
