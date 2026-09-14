'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { QuickExpenseModal } from '@/components/expenses/QuickExpenseModal';
import { formatCOP, formatDateSpanish } from '@/lib/utils';
import { 
  Target, 
  Plus, 
  ArrowLeft, 
  PiggyBank, 
  Calculator, 
  Check, 
  X, 
  Calendar,
  Sparkles, 
  Trash2,
  Clock,
  TrendingUp,
  Coins,
  Wallet,
  ArrowDownRight,
  ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

import { 
  useUser, 
  useGoals, 
  useCategories, 
  usePaymentMethods, 
  useInvalidateFinance 
} from '@/lib/api-hooks';
import { PageBanner, Button, Badge, Modal, Input } from '@/components/ui';

export default function GoalsPage() {
  const router = useRouter();
  const invalidateFinance = useInvalidateFinance();

  const { data: user } = useUser();
  const { data: goals = [] } = useGoals();
  const { data: categories = [] } = useCategories();
  const { data: paymentMethods = [] } = usePaymentMethods();

  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);

  // New Goal Form
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalCurrent, setGoalCurrent] = useState('');
  const [goalMonthly, setGoalMonthly] = useState('');
  const [goalDate, setGoalDate] = useState('');
  const [isSubmittingGoal, setIsSubmittingGoal] = useState(false);

  // Deposit State
  const [depositGoalId, setDepositGoalId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState('Nequi');
  const [isDepositing, setIsDepositing] = useState(false);

  // Withdraw State
  const [withdrawGoalId, setWithdrawGoalId] = useState<string | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('Nequi');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Interactive Reverse Calculator ("¿Cuánto debo ganar?")
  const [calcFixedExpenses, setCalcFixedExpenses] = useState<number>(350000);
  const [calcVariableExpenses, setCalcVariableExpenses] = useState<number>(750000);
  const [calcDesiredSavings, setCalcDesiredSavings] = useState<number>(800000);
  const [calcBufferPercent, setCalcBufferPercent] = useState<number>(10);

  const totalCalculatedNeeds = calcFixedExpenses + calcVariableExpenses + calcDesiredSavings;
  const safetyBuffer = Math.round(totalCalculatedNeeds * (calcBufferPercent / 100));
  const requiredMonthlyIncome = totalCalculatedNeeds + safetyBuffer;

  // Quick target date presets
  const handleSetPresetMonths = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    setGoalDate(d.toISOString().split('T')[0]);
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim() || !goalTarget) {
      toast.error('Título y monto objetivo requeridos');
      return;
    }

    setIsSubmittingGoal(true);
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: goalTitle.trim(),
          target_amount: Number(goalTarget),
          current_amount: Number(goalCurrent) || 0,
          monthly_contribution: Number(goalMonthly) || 0,
          target_date: goalDate || null,
        }),
      });

      if (res.ok) {
        toast.success(`Meta "${goalTitle}" creada con éxito`);
        setGoalTitle('');
        setGoalTarget('');
        setGoalCurrent('');
        setGoalMonthly('');
        setGoalDate('');
        setIsAddGoalOpen(false);
        invalidateFinance();
      } else {
        toast.error('Error al crear meta');
      }
    } catch {
      toast.error('Error de red');
    } finally {
      setIsSubmittingGoal(false);
    }
  };

  const handleDepositFunds = async (goalId: string) => {
    const amount = Number(depositAmount);
    if (!amount || amount <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }

    setIsDepositing(true);
    try {
      const res = await fetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: goalId, 
          add_funds: amount, 
          payment_method: depositMethod 
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Se abonaron ${formatCOP(amount)} y se descontaron de tu saldo en mano`);
        setDepositGoalId(null);
        setDepositAmount('');
        invalidateFinance();
      } else {
        toast.error(data.error || 'Error al abonar');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setIsDepositing(false);
    }
  };

  const handleWithdrawFunds = async (goalId: string) => {
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }

    setIsWithdrawing(true);
    try {
      const res = await fetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: goalId, 
          withdraw_funds: amount, 
          payment_method: withdrawMethod 
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Se regresaron ${formatCOP(amount)} a tu saldo disponible`);
        setWithdrawGoalId(null);
        setWithdrawAmount('');
        invalidateFinance();
      } else {
        toast.error(data.error || 'Error al retirar');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleDeleteGoal = async (id: string, currentAmount: number) => {
    const msg = currentAmount > 0
      ? `¿Eliminar esta meta? Los ${formatCOP(currentAmount)} acumulados se devolverán automáticamente a tu saldo disponible.`
      : '¿Eliminar esta meta?';
    if (!confirm(msg)) return;

    try {
      const res = await fetch(`/api/goals?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Meta eliminada y saldo reintegrado al fondo');
        invalidateFinance();
      } else {
        toast.error('Error al eliminar');
      }
    } catch {
      toast.error('Error de conexión');
    }
  };

  // Real-time calculation inside creation modal
  const numTarget = Number(goalTarget) || 0;
  const numCurrent = Number(goalCurrent) || 0;
  const remainingInModal = Math.max(0, numTarget - numCurrent);
  let daysInModal = 0;
  let dailyInModal = 0;
  let quincenaInModal = 0;
  if (goalDate && remainingInModal > 0) {
    const targetMs = new Date(goalDate).getTime();
    const nowMs = new Date().setHours(0, 0, 0, 0);
    daysInModal = Math.max(1, Math.ceil((targetMs - nowMs) / (1000 * 60 * 60 * 24)));
    dailyInModal = Math.ceil(remainingInModal / daysInModal);
    quincenaInModal = Math.ceil(dailyInModal * 15);
  } else if (Number(goalMonthly) > 0 && remainingInModal > 0) {
    dailyInModal = Math.ceil(Number(goalMonthly) / 30);
    quincenaInModal = Math.ceil(Number(goalMonthly) / 2);
    daysInModal = Math.ceil(remainingInModal / dailyInModal);
  }

  const userIncome = user?.monthly_income || 2200000;
  const incomeDifference = userIncome - requiredMonthlyIncome;

  const totalSavedInGoals = goals.reduce((acc: number, g: any) => acc + (Number(g.current_amount) || 0), 0);
  const totalTargetInGoals = goals.reduce((acc: number, g: any) => acc + (Number(g.target_amount) || 0), 0);
  const availableCash = Number(user?.current_cash) || 0;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header user={user} onUserUpdate={invalidateFinance} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-5 space-y-5">
        {/* Top Header Banner */}
        <PageBanner
          icon={<Target className="w-5 h-5" />}
          title="Metas & Plan de Ahorro"
          description="Cada abono se descuenta de tu saldo en mano y queda registrado en tu historial"
          badgeText="Planificación"
          actionText="Nueva Meta"
          onAction={() => setIsAddGoalOpen(true)}
          actionIcon={<Plus className="w-4 h-4 stroke-[3px]" />}
        />

        {/* Global Savings & Cash Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-3.5 rounded-2xl bg-surface border border-border">
            <span className="text-[11px] font-semibold text-primary block">Dinero Libre Disponible</span>
            <p className="text-xl sm:text-2xl font-black text-foreground mt-0.5">{formatCOP(availableCash)}</p>
            <span className="text-[10px] text-foreground/50 mt-1 block">Saldo en mano para gastos diarios</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface border border-border">
            <span className="text-[11px] font-semibold text-emerald-400 block">Total Ahorrado en Metas</span>
            <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-0.5">{formatCOP(totalSavedInGoals)}</p>
            <span className="text-[10px] text-foreground/50 mt-1 block">Dinero apartado y protegido</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface border border-border">
            <span className="text-[11px] font-semibold text-accent block">Objetivo Total Acumulado</span>
            <p className="text-xl sm:text-2xl font-black text-foreground mt-0.5">{formatCOP(totalTargetInGoals)}</p>
            <span className="text-[10px] text-foreground/50 mt-1 block">
              {totalTargetInGoals > 0 ? `${Math.round((totalSavedInGoals / totalTargetInGoals) * 100)}% de avance global` : 'Sin metas creadas'}
            </span>
          </div>
        </div>

        {/* Active Goals List */}
        <div className="space-y-3.5">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <PiggyBank className="w-4 h-4 text-primary" />
            <span>Activas ({goals.length})</span>
          </h3>

          {goals.length === 0 ? (
            <div className="p-8 rounded-3xl bg-surface border border-border text-center text-xs text-foreground/60">
              <Target className="w-10 h-10 text-primary mx-auto mb-2 opacity-30" />
              <p className="text-sm font-bold text-foreground">Aún no tienes metas registradas</p>
              <p className="text-xs text-foreground/50 mt-1 max-w-sm mx-auto">
                Crea una meta (ej: Moto, Viaje, Fondo de Emergencia) para saber con precisión cuánto debes guardar cada día.
              </p>
              <div className="mt-4 flex justify-center">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAddGoalOpen(true)}
                  icon={Plus}
                >
                  Crear Mi Primera Meta
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {goals.map((goal: any) => {
                const progress = goal.progress_percentage || 0;
                const isDone = progress >= 100;
                const isDepositingThis = depositGoalId === goal.id;
                const isWithdrawingThis = withdrawGoalId === goal.id;

                return (
                  <div
                    key={goal.id}
                    className="bg-surface border border-border hover:border-border/80 rounded-3xl p-5 shadow-xl flex flex-col justify-between transition-all"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2.5 rounded-2xl bg-primary/15 border border-primary/30 text-primary">
                            <Target className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-foreground">{goal.title}</h4>
                            <p className="text-[11px] text-foreground/50 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3 text-primary" />
                              <span>{formatDateSpanish(goal.target_date)}</span>
                            </p>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDeleteGoal(goal.id, Number(goal.current_amount) || 0)}
                          title="Eliminar meta"
                          className="text-foreground/40 hover:text-danger hover:bg-danger/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Amounts Display */}
                      <div className="mt-4 flex items-baseline justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-foreground/50">Ahorrado</span>
                          <p className="text-lg font-black text-emerald-400">{formatCOP(goal.current_amount)}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-foreground/50">Objetivo</span>
                          <p className="text-lg font-black text-foreground">{formatCOP(goal.target_amount)}</p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-[11px] mb-1 font-semibold">
                          <span className="text-foreground/50">Progreso</span>
                          <span className="text-primary font-black">{progress}%</span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-surface-elevated overflow-hidden border border-border">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              isDone
                                ? 'bg-emerald-400'
                                : 'bg-linear-to-r from-primary to-accent'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* DAILY SAVING METRIC BADGE */}
                      {!isDone && (
                        <div className="mt-3.5 p-3 rounded-2xl bg-surface-elevated border border-primary/30 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-foreground/80 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-primary" />
                              <span>Ahorro diario requerido:</span>
                            </span>
                            <span className="text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/30">
                              {formatCOP(goal.daily_saving_needed)} / día
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-foreground/50 pt-1 border-t border-border">
                            <span>Por quincena: <strong className="text-foreground">{formatCOP(goal.quincena_saving_needed || (goal.daily_saving_needed * 15))}</strong></span>
                            {goal.days_remaining > 0 && (
                              <span className="text-primary font-semibold flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {goal.days_remaining} días restantes
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {isDone && (
                        <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-center text-xs font-bold text-emerald-300">
                          🎉 ¡Meta 100% alcanzada! Felicitaciones por tu disciplina.
                        </div>
                      )}
                    </div>

                    {/* Deposit & Withdraw Actions */}
                    <div className="mt-4 pt-3 border-t border-border">
                      {/* MODE 1: DEPOSIT PANEL */}
                      {isDepositingThis && (
                        <div className="p-3 rounded-2xl bg-surface-elevated border border-primary space-y-2.5 animate-in fade-in duration-150">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                              <ArrowDownRight className="w-3.5 h-3.5 text-primary" />
                              <span>Abonar a esta meta</span>
                            </span>
                            {Number(depositAmount) > 0 && (
                              <span className="text-xs font-black text-primary">
                                {formatCOP(Number(depositAmount))}
                              </span>
                            )}
                          </div>

                          <input
                            type="number"
                            placeholder="Monto a guardar (ej: 50000)"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                            className="w-full bg-surface border border-border text-foreground text-xs px-3 py-2 rounded-xl focus:border-primary focus:outline-none"
                            autoFocus
                          />

                          {/* Payment method selector */}
                          <div className="flex items-center justify-between gap-2">
                            <label className="text-[11px] text-foreground/50 shrink-0">Medio / Cuenta:</label>
                            <select
                              value={depositMethod}
                              onChange={(e) => setDepositMethod(e.target.value)}
                              className="flex-1 bg-surface border border-border text-foreground text-xs px-2 py-1.5 rounded-lg focus:outline-none"
                            >
                              {paymentMethods.map((pm: any) => (
                                <option key={pm.id} value={pm.name}>
                                  {pm.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <p className="text-[10px] text-foreground/50 bg-surface/60 p-2 rounded-lg border border-border/50">
                            🔻 Se restará de tu fondo libre (Saldo disponible actual: <strong className="text-foreground">{formatCOP(availableCash)}</strong>) y se registrará en tu historial.
                          </p>

                          <div className="flex items-center justify-end gap-2 pt-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              onClick={() => {
                                setDepositGoalId(null);
                                setDepositAmount('');
                              }}
                            >
                              Cancelar
                            </Button>
                            <Button
                              type="button"
                              variant="primary"
                              size="xs"
                              onClick={() => handleDepositFunds(goal.id)}
                              disabled={isDepositing || !Number(depositAmount)}
                              isLoading={isDepositing}
                              icon={Check}
                            >
                              Confirmar Abono
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* MODE 2: WITHDRAW PANEL */}
                      {isWithdrawingThis && (
                        <div className="p-3 rounded-2xl bg-surface-elevated border border-warning/60 space-y-2.5 animate-in fade-in duration-150">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-warning flex items-center gap-1.5">
                              <ArrowUpRight className="w-3.5 h-3.5 text-warning" />
                              <span>Retirar ahorro al fondo libre</span>
                            </span>
                            {Number(withdrawAmount) > 0 && (
                              <span className="text-xs font-black text-warning">
                                {formatCOP(Number(withdrawAmount))}
                              </span>
                            )}
                          </div>

                          <input
                            type="number"
                            placeholder={`Monto (Máximo ${formatCOP(goal.current_amount)})`}
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            className="w-full bg-surface border border-border text-foreground text-xs px-3 py-2 rounded-xl focus:border-warning focus:outline-none"
                            autoFocus
                          />

                          <div className="flex items-center justify-between gap-2">
                            <label className="text-[11px] text-foreground/50 shrink-0">Recibir en:</label>
                            <select
                              value={withdrawMethod}
                              onChange={(e) => setWithdrawMethod(e.target.value)}
                              className="flex-1 bg-surface border border-border text-foreground text-xs px-2 py-1.5 rounded-lg focus:outline-none"
                            >
                              {paymentMethods.map((pm: any) => (
                                <option key={pm.id} value={pm.name}>
                                  {pm.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <p className="text-[10px] text-foreground/50 bg-surface/60 p-2 rounded-lg border border-border/50">
                            🟢 Regresará inmediatamente a tu dinero disponible en mano.
                          </p>

                          <div className="flex items-center justify-end gap-2 pt-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              onClick={() => {
                                setWithdrawGoalId(null);
                                setWithdrawAmount('');
                              }}
                            >
                              Cancelar
                            </Button>
                            <Button
                              type="button"
                              variant="warning"
                              size="xs"
                              onClick={() => handleWithdrawFunds(goal.id)}
                              disabled={isWithdrawing || !Number(withdrawAmount)}
                              isLoading={isWithdrawing}
                              icon={Check}
                            >
                              Confirmar Retiro
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* DEFAULT BUTTONS: ABONAR & RETIRAR */}
                      {!isDepositingThis && !isWithdrawingThis && (
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              setDepositGoalId(goal.id);
                              setWithdrawGoalId(null);
                            }}
                            icon={PiggyBank}
                          >
                            Abonar (+ Dinero)
                          </Button>

                          {Number(goal.current_amount) > 0 && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setWithdrawGoalId(goal.id);
                                setDepositGoalId(null);
                              }}
                              title="Retirar dinero de esta meta al fondo disponible"
                            >
                              Retirar
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Reverse Engineering Income Calculator */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/20 text-primary">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-foreground">Calculadora Inversa: ¿Cuánto Necesito Ganar al Mes?</h2>
              <p className="text-xs text-foreground/50">
                Suma tus compromisos fijos, margen variable, metas de ahorro y margen de seguridad.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-surface border border-border rounded-2xl p-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-foreground/50">
                  1. Compromisos Fijos
                </label>
                <span className="text-[10px] text-accent font-bold">{formatCOP(calcFixedExpenses)}</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-foreground/40 font-bold">$</span>
                <input
                  type="number"
                  value={calcFixedExpenses}
                  onChange={(e) => setCalcFixedExpenses(Number(e.target.value) || 0)}
                  className="w-full bg-surface-elevated border border-border text-foreground text-xs font-bold pl-7 pr-2 py-2 rounded-xl focus:border-primary focus:outline-none"
                />
              </div>
              <span className="text-[10px] text-foreground/40 mt-1 block">Papás, arriendo, servicios, suscripciones</span>
            </div>

            <div className="bg-surface border border-border rounded-2xl p-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-foreground/50">
                  2. Margen Variable (Tope)
                </label>
                <span className="text-[10px] text-primary font-bold">{formatCOP(calcVariableExpenses)}</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-foreground/40 font-bold">$</span>
                <input
                  type="number"
                  value={calcVariableExpenses}
                  onChange={(e) => setCalcVariableExpenses(Number(e.target.value) || 0)}
                  className="w-full bg-surface-elevated border border-border text-foreground text-xs font-bold pl-7 pr-2 py-2 rounded-xl focus:border-primary focus:outline-none"
                />
              </div>
              <span className="text-[10px] text-foreground/40 mt-1 block">Alimentación, pasajes, ocio</span>
            </div>

            <div className="bg-surface border border-border rounded-2xl p-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-foreground/50">
                  3. Ahorro Mensual para Metas
                </label>
                <span className="text-[10px] text-emerald-400 font-bold">{formatCOP(calcDesiredSavings)}</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-foreground/40 font-bold">$</span>
                <input
                  type="number"
                  value={calcDesiredSavings}
                  onChange={(e) => setCalcDesiredSavings(Number(e.target.value) || 0)}
                  className="w-full bg-surface-elevated border border-border text-foreground text-xs font-bold pl-7 pr-2 py-2 rounded-xl focus:border-primary focus:outline-none"
                />
              </div>
              <span className="text-[10px] text-foreground/40 mt-1 block">Para emergencias y metas</span>
            </div>
          </div>

          {/* Calculator Output Hero */}
          <div className="mt-4 p-4 rounded-2xl bg-surface border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Ingreso Mensual Necesario
              </span>
              <p className="text-2xl sm:text-3xl font-black text-foreground mt-0.5">
                {formatCOP(requiredMonthlyIncome)}
              </p>
              <p className="text-[11px] text-foreground/50 mt-0.5">
                Incluye un colchón de imprevistos del {calcBufferPercent}% ({formatCOP(safetyBuffer)}).
              </p>
            </div>

            <div className="bg-surface-elevated border border-border rounded-xl p-3 text-right">
              <span className="block text-[10px] text-foreground/50 font-medium">Comparado con tus ingresos de este mes</span>
              <p className={`text-sm font-extrabold mt-0.5 ${incomeDifference >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {incomeDifference >= 0
                  ? `¡Lo cubres! Te sobran ${formatCOP(incomeDifference)}`
                  : `Te faltan ${formatCOP(Math.abs(incomeDifference))} para ese nivel`}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL: NUEVA META */}
      <Modal
        isOpen={isAddGoalOpen}
        onClose={() => setIsAddGoalOpen(false)}
        title="Crear Nueva Meta Financiera"
        icon={<Target className="w-5 h-5 text-primary" />}
        size="lg"
      >
        <form onSubmit={handleCreateGoal} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground/80 mb-1">
              Título de la Meta
            </label>
            <input
              type="text"
              placeholder="Ej: Moto Nueva, Fondo de Emergencia, Viaje"
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              className="w-full bg-surface-elevated border border-border text-foreground text-xs px-3 py-2.5 rounded-xl focus:border-primary focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-foreground/80">
                  Monto Objetivo ($ COP)
                </label>
                {numTarget > 0 && (
                  <span className="text-[11px] text-primary font-bold">
                    {formatCOP(numTarget)}
                  </span>
                )}
              </div>
              <input
                type="number"
                placeholder="Ej: 5000000"
                value={goalTarget}
                onChange={(e) => setGoalTarget(e.target.value)}
                className="w-full bg-surface-elevated border border-border text-foreground text-xs px-3 py-2.5 rounded-xl focus:border-primary focus:outline-none"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-foreground/80">
                  Ahorro Inicial Acumulado ($ COP)
                </label>
                {numCurrent > 0 && (
                  <span className="text-[11px] text-emerald-400 font-bold">
                    {formatCOP(numCurrent)}
                  </span>
                )}
              </div>
              <input
                type="number"
                placeholder="Ej: 500000 (Opcional)"
                value={goalCurrent}
                onChange={(e) => setGoalCurrent(e.target.value)}
                className="w-full bg-surface-elevated border border-border text-foreground text-xs px-3 py-2.5 rounded-xl focus:border-primary focus:outline-none"
              />
              <p className="text-[10px] text-foreground/50 mt-1">
                Dinero que ya tienes ahorrado para esta meta.
              </p>
            </div>
          </div>

          {/* Target Date with Quick Presets */}
          <div className="p-3.5 rounded-2xl bg-surface-elevated border border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>Fecha Límite Deseada</span>
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-foreground/50 mr-1">Rápido:</span>
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  onClick={() => handleSetPresetMonths(3)}
                  className="text-[10px] py-0.5 px-2 h-auto"
                >
                  +3m
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  onClick={() => handleSetPresetMonths(6)}
                  className="text-[10px] py-0.5 px-2 h-auto"
                >
                  +6m
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  onClick={() => handleSetPresetMonths(12)}
                  className="text-[10px] py-0.5 px-2 h-auto"
                >
                  +1 año
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  onClick={() => handleSetPresetMonths(24)}
                  className="text-[10px] py-0.5 px-2 h-auto"
                >
                  +2 años
                </Button>
              </div>
            </div>

            <Input
              type="date"
              value={goalDate}
              onChange={(e) => setGoalDate(e.target.value)}
            />
          </div>

          {/* LIVE DAILY SAVINGS SIMULATOR IN MODAL */}
          {remainingInModal > 0 && dailyInModal > 0 && (
            <div className="p-3.5 rounded-2xl bg-surface border border-primary/40 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>Plan de Ahorro Sugerido:</span>
                </span>
                <span className="text-xs font-black text-primary">
                  {daysInModal} días faltantes
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2 rounded-xl bg-surface-elevated border border-border">
                  <span className="text-[10px] text-foreground/50 block font-medium">Ahorro Diario Requerido</span>
                  <p className="text-base font-black text-primary mt-0.5">
                    {formatCOP(dailyInModal)} <span className="text-[10px] font-normal text-foreground/50">/ día</span>
                  </p>
                </div>

                <div className="p-2 rounded-xl bg-surface-elevated border border-border">
                  <span className="text-[10px] text-foreground/50 block font-medium">Por Quincena (15 días)</span>
                  <p className="text-base font-black text-foreground mt-0.5">
                    {formatCOP(quincenaInModal)} <span className="text-[10px] font-normal text-foreground/50">/ quincena</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsAddGoalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmittingGoal}
              isLoading={isSubmittingGoal}
              icon={Check}
            >
              Guardar Meta
            </Button>
          </div>
        </form>
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
