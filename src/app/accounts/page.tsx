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
  Trash2, 
  SlidersHorizontal, 
  Smartphone, 
  Building2, 
  CreditCard, 
  Banknote, 
  ArrowDownRight, 
  ArrowUpRight, 
  Layers,
  ArrowRightLeft,
  Edit
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  Button, 
  Card, 
  Input, 
  Select, 
  Badge, 
  Modal, 
  PageBanner 
} from '@/components/ui';

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

  // Edit Account Modal (Name, Type, Color)
  const [editingMethod, setEditingMethod] = useState<any | null>(null);
  const [editMethodName, setEditMethodName] = useState('');
  const [editMethodType, setEditMethodType] = useState('WALLET');
  const [editMethodColor, setEditMethodColor] = useState(COLOR_OPTIONS[0]);
  const [isSavingEditMethod, setIsSavingEditMethod] = useState(false);

  // Adjust / Calibrate Balance Modal
  const [adjustingMethod, setAdjustingMethod] = useState<any | null>(null);
  const [adjustTargetBalance, setAdjustTargetBalance] = useState('');
  const [isSavingAdjustment, setIsSavingAdjustment] = useState(false);

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

  // Open edit modal (Name, Type, Color)
  const handleOpenEditMethod = (pm: any) => {
    setEditingMethod(pm);
    setEditMethodName(pm.name);
    setEditMethodType(pm.type || 'WALLET');
    setEditMethodColor(pm.color || COLOR_OPTIONS[0]);
  };

  // Save edit method
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
        toast.error(data.error || 'Error al actualizar cuenta');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setIsSavingEditMethod(false);
    }
  };

  // Open adjust balance modal
  const handleOpenAdjustMethod = (pm: any) => {
    setAdjustingMethod(pm);
    setAdjustTargetBalance(
      pm.net_balance !== undefined ? String(pm.net_balance) : String(pm.initial_balance || 0)
    );
  };

  // Save balance adjustment
  const handleSaveAdjustMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingMethod || adjustTargetBalance === '') return;

    const parsed = Number(adjustTargetBalance);
    if (isNaN(parsed)) {
      toast.error('Ingresa un valor numérico válido');
      return;
    }

    setIsSavingAdjustment(true);
    try {
      const res = await fetch('/api/payment-methods', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: adjustingMethod.id,
          target_balance: parsed,
        }),
      });

      if (res.ok) {
        toast.success(`Saldo de "${adjustingMethod.name}" ajustado correctamente`);
        setAdjustingMethod(null);
        await refetchPaymentMethods();
        invalidateFinance();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Error al calibrar saldo');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setIsSavingAdjustment(false);
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
    <div className="min-h-screen bg-background flex flex-col pb-24">
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
              <Card
                key={pm.id}
                variant="default"
                padding="md"
                className="space-y-3 hover:border-primary/50 transition-all"
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
                      <h3 className="text-sm font-black text-foreground truncate">{pm.name}</h3>
                      <span className="text-[10px] text-foreground/50 uppercase font-semibold whitespace-nowrap">
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
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleOpenEditMethod(pm)}
                      title="Editar cuenta"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    {paymentMethods.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDeleteMethod(pm.id, pm.name)}
                        className="text-foreground/40 hover:text-danger hover:bg-danger/10"
                        title="Eliminar cuenta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Account Activity Summary (This Month) */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/60">
                  <div className="p-2 rounded-xl bg-surface-elevated/70 border border-border/50">
                    <span className="text-[10px] text-success font-bold flex items-center gap-1 whitespace-nowrap">
                      <ArrowDownRight className="w-3 h-3 shrink-0" />
                      <span>Entró este mes</span>
                    </span>
                    <p className="text-xs font-black text-foreground mt-0.5 whitespace-nowrap font-mono">
                      {formatCOP(pm.income_this_month || 0)}
                    </p>
                    {pm.transfers_in > 0 && (
                      <span className="text-[9px] text-primary font-medium block mt-0.5 truncate font-mono">
                        {formatCOP(pm.transfers_in)} transf.
                      </span>
                    )}
                  </div>

                  <div className="p-2 rounded-xl bg-surface-elevated/70 border border-border/50">
                    <span className="text-[10px] text-danger font-bold flex items-center gap-1 whitespace-nowrap">
                      <ArrowUpRight className="w-3 h-3 shrink-0" />
                      <span>Salió este mes</span>
                    </span>
                    <p className="text-xs font-black text-foreground mt-0.5 whitespace-nowrap font-mono">
                      {formatCOP(pm.expense_this_month || 0)}
                    </p>
                    {pm.transfers_out > 0 && (
                      <span className="text-[9px] text-primary font-medium block mt-0.5 truncate font-mono">
                        {formatCOP(pm.transfers_out)} transf.
                      </span>
                    )}
                  </div>
                </div>

                {/* Balances Section: Total vs Libre vs Bolsillos */}
                <div className="p-3 rounded-2xl bg-surface-elevated/80 border border-border/70 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-foreground/50 font-medium block">Saldo Total en Cuenta:</span>
                      <span className={`text-sm sm:text-base font-black font-mono block ${
                        isPositive ? 'text-foreground' : 'text-danger'
                      }`}>
                        {formatCOP(pm.net_balance ?? 0)}
                      </span>
                    </div>
                    <Button
                      variant="accent"
                      size="xs"
                      onClick={() => handleOpenAdjustMethod(pm)}
                      title="Ajustar o equilibrar el saldo de esta cuenta"
                    >
                      <SlidersHorizontal className="w-3 h-3" />
                      <span>Ajustar</span>
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
                    <div className="p-2 rounded-xl bg-primary/10 border border-primary/30">
                      <span className="text-[10px] text-primary font-bold block">
                        Saldo Libre (Gastos)
                      </span>
                      <span className="text-xs font-black text-primary font-mono block mt-0.5">
                        {formatCOP(pm.free_balance !== undefined ? pm.free_balance : (pm.net_balance ?? 0))}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-secondary/30 border border-secondary/50">
                      <span className="text-[10px] text-foreground/80 font-bold block">
                        En Bolsillos
                      </span>
                      <span className="text-xs font-black text-foreground font-mono block mt-0.5">
                        {formatCOP(pm.pockets_balance || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bolsillos Sub-Section */}
                <div className="pt-2 border-t border-border/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-bold text-foreground/90">
                        Bolsillos ({pm.pockets?.length || 0})
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => handleOpenAddPocket(pm)}
                      className="text-primary hover:text-primary hover:bg-primary/10"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Bolsillo</span>
                    </Button>
                  </div>

                  {/* Horizontal carousel of pockets */}
                  {pm.pockets && pm.pockets.length > 0 ? (
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 whitespace-nowrap">
                      {pm.pockets.map((pkt: any) => (
                        <div
                          key={pkt.id}
                          className="px-2.5 py-1.5 rounded-xl bg-surface-elevated border border-border/80 hover:border-primary/40 shrink-0 flex items-center gap-2 shadow-sm transition-all"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: pkt.color || '#00ADB5' }}
                          />
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-bold text-foreground truncate max-w-27.5">
                                {pkt.name}
                              </span>
                            </div>
                            <span className="text-xs font-extrabold text-primary font-mono block">
                              {formatCOP(pkt.current_balance)}
                            </span>
                          </div>
                          
                          {/* Actions: Meter / Sacar / Delete */}
                          <div className="flex items-center gap-0.5 pl-1 border-l border-border/60">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleOpenTransferPocket(pkt, pm, 'DEPOSIT')}
                              className="text-success hover:bg-success/10 h-7 w-7 p-0"
                              title="Meter dinero al bolsillo"
                            >
                              <ArrowDownRight className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleOpenTransferPocket(pkt, pm, 'WITHDRAW')}
                              className="text-warning hover:bg-warning/10 h-7 w-7 p-0"
                              title="Sacar dinero al saldo libre"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDeletePocket(pkt, pm.name)}
                              className="text-foreground/40 hover:text-danger hover:bg-danger/10 h-7 w-7 p-0"
                              title="Eliminar bolsillo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-foreground/40 italic">
                      Sin bolsillos creados en esta cuenta.
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-foreground/50 pt-0.5">
                  <span className="whitespace-nowrap">Movimientos registrados:</span>
                  <span className="font-extrabold text-foreground whitespace-nowrap font-mono">
                    {pm.movement_count || 0}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      </main>

      {/* MODAL: AGREGAR NUEVA CUENTA */}
      <Modal
        isOpen={isAddMethodOpen}
        onClose={() => setIsAddMethodOpen(false)}
        title="Nueva Cuenta o Medio de Pago"
        icon={<Wallet className="w-5 h-5" />}
      >
        <form onSubmit={handleCreateMethod} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground/80 mb-1">
              Nombre de la Cuenta *
            </label>
            <Input
              type="text"
              required
              value={newMethodName}
              onChange={(e) => setNewMethodName(e.target.value)}
              placeholder="Ej: Bancolombia, Nequi, Efectivo de Bolsillo"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground/80 mb-1">
              Tipo de Cuenta
            </label>
            <Select
              value={newMethodType}
              onChange={(e) => setNewMethodType(e.target.value)}
            >
              {METHOD_TYPES.map((type) => (
                <option key={type.id} value={type.id} className="bg-surface-elevated text-foreground">
                  {type.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground/80 mb-1">
              Saldo Inicial en esta cuenta ($ COP)
            </label>
            <Input
              type="number"
              step="1000"
              value={newMethodInitialBalance}
              onChange={(e) => setNewMethodInitialBalance(e.target.value)}
              placeholder="0"
            />
            <p className="text-[10px] text-foreground/50 mt-1">
              El dinero que tienes en esta cuenta al momento de crearla.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground/80 mb-1.5">
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
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => setIsAddMethodOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={isCreatingMethod}
            >
              {isCreatingMethod ? 'Creando...' : 'Crear Cuenta'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: EDITAR CUENTA (Nombre, Tipo, Color) */}
      <Modal
        isOpen={!!editingMethod}
        onClose={() => setEditingMethod(null)}
        title="Editar Cuenta"
        icon={<Edit className="w-5 h-5" />}
      >
        {editingMethod && (
          <form onSubmit={handleSaveEditMethod} className="space-y-4">
            <div>
              <Input
                label="Nombre de la cuenta"
                type="text"
                required
                value={editMethodName}
                onChange={(e) => setEditMethodName(e.target.value)}
                placeholder="Ej: Bancolombia Principal, Nequi..."
              />
            </div>

            <div>
              <Select
                label="Tipo de Cuenta"
                value={editMethodType}
                onChange={(e) => setEditMethodType(e.target.value)}
              >
                {METHOD_TYPES.map((type) => (
                  <option key={type.id} value={type.id} className="bg-surface-elevated text-foreground">
                    {type.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground/80 mb-1.5">
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

            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={isSavingEditMethod}
            >
              {isSavingEditMethod ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </form>
        )}
      </Modal>

      {/* MODAL: AJUSTAR / CALIBRAR SALDO */}
      <Modal
        isOpen={!!adjustingMethod}
        onClose={() => setAdjustingMethod(null)}
        title="Ajustar Saldo de Cuenta"
        icon={<SlidersHorizontal className="w-5 h-5" />}
      >
        {adjustingMethod && (
          <form onSubmit={handleSaveAdjustMethod} className="space-y-4">
            {/* Account Context Badge */}
            <div className="p-3 rounded-2xl bg-surface-elevated/70 border border-border flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow"
                  style={{ backgroundColor: adjustingMethod.color || '#00ADB5' }}
                >
                  <Wallet className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{adjustingMethod.name}</p>
                  <p className="text-[10px] text-foreground/50 uppercase font-semibold">
                    {adjustingMethod.type === 'WALLET'
                      ? 'Billetera Digital'
                      : adjustingMethod.type === 'CASH'
                      ? 'Efectivo'
                      : adjustingMethod.type === 'CARD'
                      ? 'Tarjeta'
                      : 'Banco'}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] text-foreground/50 block font-medium">Saldo en App</span>
                <span className="text-xs font-bold text-foreground/90 font-mono">
                  {formatCOP(adjustingMethod.net_balance ?? 0)}
                </span>
              </div>
            </div>

            {/* Adjust Input */}
            <div className="space-y-1.5">
              <Input
                label="Nuevo Saldo Real Exacto"
                type="number"
                step="100"
                required
                value={adjustTargetBalance}
                onChange={(e) => setAdjustTargetBalance(e.target.value)}
                placeholder="Ej: 1500000"
                icon={<span className="text-primary font-bold text-sm">$</span>}
              />
              <p className="text-[11px] text-foreground/50 leading-relaxed pt-1">
                Ingresa el saldo exacto que tienes actualmente en tu banco o billetera física. La app generará automáticamente un movimiento contable de ajuste para calibrar la diferencia.
              </p>
            </div>


            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={isSavingAdjustment}
            >
              {isSavingAdjustment ? 'Calibrando...' : 'Aplicar Ajuste'}
            </Button>
          </form>
        )}
      </Modal>

      {/* MODAL: CREAR NUEVO BOLSILLO */}
      <Modal
        isOpen={isAddPocketOpen && !!pocketTargetMethod}
        onClose={() => setIsAddPocketOpen(false)}
        title={`Nuevo Bolsillo en ${pocketTargetMethod?.name}`}
        icon={<Layers className="w-5 h-5" />}
      >
        {pocketTargetMethod && (
          <form onSubmit={handleCreatePocket} className="space-y-4">
            <div>
              <Input
                label={"Nombre del Bolsillo"}
                type="text"
                required
                value={newPocketName}
                onChange={(e) => setNewPocketName(e.target.value)}
                placeholder="Ej: Arriendo, Ahorro Moto, Vacaciones"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-foreground/80">
                  Monto Inicial a Asignar ($ COP)
                </label>
                <span className="text-[10px] text-primary font-mono font-bold">
                  Libre en cuenta: {formatCOP(pocketTargetMethod.free_balance !== undefined ? pocketTargetMethod.free_balance : (pocketTargetMethod.net_balance || 0))}
                </span>
              </div>
              <Input
                type="number"
                step="1000"
                value={newPocketInitialFunding}
                onChange={(e) => setNewPocketInitialFunding(e.target.value)}
                placeholder="0"
              />
              <p className="text-[10px] text-foreground/50 mt-1">
                Se apartará del saldo libre de {pocketTargetMethod.name} y quedará protegido en este bolsillo.
              </p>
            </div>

            <div>
              <Input
                label="Meta Opcional"
                type="number"
                step="1000"
                value={newPocketTargetAmount}
                onChange={(e) => setNewPocketTargetAmount(e.target.value)}
                placeholder="Ej: 1500000"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground/80 mb-1.5">
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
            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={isCreatingPocket}
            >
              {isCreatingPocket ? 'Creando...' : 'Crear Bolsillo'}
            </Button>
          </form>
        )}
      </Modal>

      {/* MODAL: TRANSFERIR DINERO A / DESDE BOLSILLO */}
      <Modal
        isOpen={!!transferModalData}
        onClose={() => setTransferModalData(null)}
        title={
          transferType === 'DEPOSIT'
            ? `Meter dinero a "${transferModalData?.pocket?.name}"`
            : `Sacar dinero de "${transferModalData?.pocket?.name}"`
        }
        icon={<ArrowRightLeft className="w-5 h-5" />}
      >
        {transferModalData && (
          <div className="space-y-4">
            {/* Type selector toggle */}
            <div className="flex bg-surface-elevated p-1 rounded-xl border border-border gap-1">
              <Button
                type="button"
                size="sm"
                variant={transferType === 'DEPOSIT' ? 'success' : 'ghost'}
                onClick={() => setTransferType('DEPOSIT')}
                icon={ArrowDownRight}
                className="flex-1"
              >
                Meter al Bolsillo
              </Button>
              <Button
                type="button"
                size="sm"
                variant={transferType === 'WITHDRAW' ? 'warning' : 'ghost'}
                onClick={() => setTransferType('WITHDRAW')}
                icon={ArrowUpRight}
                className="flex-1"
              >
                Sacar a Saldo Libre
              </Button>
            </div>

            <form onSubmit={handleTransferPocket} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-surface-elevated/70 border border-border/70">
                <div>
                  <span className="text-[10px] text-foreground/50 block">En Bolsillo:</span>
                  <span className="text-xs font-black text-primary font-mono block">
                    {formatCOP(transferModalData.pocket.current_balance)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-foreground/50 block">Libre en {transferModalData.account.name}:</span>
                  <span className="text-xs font-black text-success font-mono block">
                    {formatCOP(transferModalData.account.free_balance !== undefined ? transferModalData.account.free_balance : (transferModalData.account.net_balance || 0))}
                  </span>
                </div>
              </div>

              <Input
                label={`Monto a ${transferType === 'DEPOSIT' ? 'Meter' : 'Sacar'} ($ COP) *`}
                type="number"
                step="1000"
                required
                autoFocus
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="0"
              />

              {/* Quick shortcut buttons */}
              <div className="flex gap-1.5 flex-wrap">
                {[20000, 50000, 100000, 200000, 500000].map((val) => (
                  <Button
                    key={val}
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => setTransferAmount(String(val))}
                    className="font-mono"
                  >
                    +{formatCOP(val).replace('$', '').trim()}
                  </Button>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  onClick={() => setTransferModalData(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant={transferType === 'DEPOSIT' ? 'success' : 'warning'}
                  fullWidth
                  disabled={isTransferringPocket || !transferAmount}
                >
                  {isTransferringPocket ? 'Procesando...' : transferType === 'DEPOSIT' ? 'Meter al Bolsillo' : 'Sacar a Saldo Libre'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </Modal>

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
