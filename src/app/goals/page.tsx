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
              <h1 className="text-xl font-black text-white">Metas & Plan de Ahorro</h1>
              <p className="text-xs text-slate-400">Cada abono se descuenta de tu saldo en mano y queda registrado en tu historial</p>
            </div>
          </div>

          <button
            onClick={() => setIsAddGoalOpen(true)}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#00ADB5] to-[#06B6D4] text-[#0B192C] font-extrabold text-xs shadow-md shadow-[#00ADB5]/20 flex items-center gap-1.5 self-start sm:self-center hover:opacity-95 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3px]" />
            <span>+ Nueva Meta</span>
          </button>
        </div>

        {/* Global Savings & Cash Banner */}
        <div className="bg-[#102A43] border border-[#243B55] rounded-3xl p-5 shadow-xl grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-3.5 rounded-2xl bg-[#0B192C]/70 border border-[#1E3A5F]">
            <span className="text-[11px] font-semibold text-[#00ADB5] block">Dinero Libre Disponible</span>
            <p className="text-xl sm:text-2xl font-black text-white mt-0.5">{formatCOP(availableCash)}</p>
            <span className="text-[10px] text-slate-400 mt-1 block">Saldo en mano para gastos diarios</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#0B192C]/70 border border-[#1E3A5F]">
            <span className="text-[11px] font-semibold text-emerald-400 block">Total Ahorrado en Metas</span>
            <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-0.5">{formatCOP(totalSavedInGoals)}</p>
            <span className="text-[10px] text-slate-400 mt-1 block">Dinero apartado y protegido</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#0B192C]/70 border border-[#1E3A5F]">
            <span className="text-[11px] font-semibold text-cyan-400 block">Objetivo Total Acumulado</span>
            <p className="text-xl sm:text-2xl font-black text-white mt-0.5">{formatCOP(totalTargetInGoals)}</p>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {totalTargetInGoals > 0 ? `${Math.round((totalSavedInGoals / totalTargetInGoals) * 100)}% de avance global` : 'Sin metas creadas'}
            </span>
          </div>
        </div>

        {/* Active Goals List */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <PiggyBank className="w-4 h-4 text-[#00ADB5]" />
              <span>Tus Metas Activas ({goals.length})</span>
            </h3>
            <span className="text-xs text-slate-400">Progreso y ahorro diario requerido</span>
          </div>

          {goals.length === 0 ? (
            <div className="p-8 rounded-3xl bg-[#0B192C] border border-[#1E3A5F] text-center text-xs text-slate-400">
              <Target className="w-10 h-10 text-[#00ADB5] mx-auto mb-2 opacity-30" />
              <p className="text-sm font-bold text-white">Aún no tienes metas registradas</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Crea una meta (ej: Moto, Viaje, Fondo de Emergencia) para saber con precisión cuánto debes guardar cada día.
              </p>
              <button
                onClick={() => setIsAddGoalOpen(true)}
                className="mt-4 px-4 py-2 bg-[#00ADB5] text-[#0B192C] font-extrabold text-xs rounded-xl shadow-md"
              >
                + Crear Mi Primera Meta
              </button>
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
                    className="bg-[#102A43] border border-[#243B55] hover:border-[#1E3A5F] rounded-3xl p-5 shadow-xl flex flex-col justify-between transition-all"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2.5 rounded-2xl bg-[#00ADB5]/15 border border-[#00ADB5]/30 text-[#00ADB5]">
                            <Target className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-white">{goal.title}</h4>
                            <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3 text-[#00ADB5]" />
                              <span>{formatDateSpanish(goal.target_date)}</span>
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteGoal(goal.id, Number(goal.current_amount) || 0)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Eliminar meta"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Amounts Display */}
                      <div className="mt-4 flex items-baseline justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400">Ahorrado</span>
                          <p className="text-lg font-black text-emerald-400">{formatCOP(goal.current_amount)}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Objetivo</span>
                          <p className="text-lg font-black text-white">{formatCOP(goal.target_amount)}</p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-[11px] mb-1 font-semibold">
                          <span className="text-slate-400">Progreso</span>
                          <span className="text-[#00ADB5] font-black">{progress}%</span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-[#0B192C] overflow-hidden border border-[#1E3A5F]">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              isDone
                                ? 'bg-emerald-400'
                                : 'bg-gradient-to-r from-[#00ADB5] to-[#06B6D4]'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* DAILY SAVING METRIC BADGE */}
                      {!isDone && (
                        <div className="mt-3.5 p-3 rounded-2xl bg-[#0B192C] border border-[#00ADB5]/30 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-[#00ADB5]" />
                              <span>Ahorro diario requerido:</span>
                            </span>
                            <span className="text-xs font-black text-[#00ADB5] bg-[#00ADB5]/10 px-2 py-0.5 rounded-lg border border-[#00ADB5]/30">
                              {formatCOP(goal.daily_saving_needed)} / día
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-[#1E3A5F]">
                            <span>Por quincena: <strong className="text-white">{formatCOP(goal.quincena_saving_needed || (goal.daily_saving_needed * 15))}</strong></span>
                            {goal.days_remaining > 0 && (
                              <span className="text-[#00ADB5] font-semibold flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {goal.days_remaining} días restantes
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {isDone && (
                        <div className="mt-3 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-600/40 text-center text-xs font-bold text-emerald-300">
                          🎉 ¡Meta 100% alcanzada! Felicitaciones por tu disciplina.
                        </div>
                      )}
                    </div>

                    {/* Deposit & Withdraw Actions */}
                    <div className="mt-4 pt-3 border-t border-[#243B55]">
                      {/* MODE 1: DEPOSIT PANEL */}
                      {isDepositingThis && (
                        <div className="p-3 rounded-2xl bg-[#0B192C] border border-[#00ADB5] space-y-2.5 animate-in fade-in duration-150">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              <ArrowDownRight className="w-3.5 h-3.5 text-[#00ADB5]" />
                              <span>Abonar a esta meta</span>
                            </span>
                            {Number(depositAmount) > 0 && (
                              <span className="text-xs font-black text-[#00ADB5]">
                                {formatCOP(Number(depositAmount))}
                              </span>
                            )}
                          </div>

                          <input
                            type="number"
                            placeholder="Monto a guardar (ej: 50000)"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                            className="w-full bg-[#102A43] border border-[#243B55] text-white text-xs px-3 py-2 rounded-xl focus:border-[#00ADB5] focus:outline-none"
                            autoFocus
                          />

                          {/* Payment method selector */}
                          <div className="flex items-center justify-between gap-2">
                            <label className="text-[11px] text-slate-400 shrink-0">Medio / Cuenta:</label>
                            <select
                              value={depositMethod}
                              onChange={(e) => setDepositMethod(e.target.value)}
                              className="flex-1 bg-[#102A43] border border-[#243B55] text-white text-xs px-2 py-1.5 rounded-lg focus:outline-none"
                            >
                              {paymentMethods.map((pm: any) => (
                                <option key={pm.id} value={pm.name}>
                                  {pm.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <p className="text-[10px] text-slate-400 bg-[#102A43]/60 p-2 rounded-lg border border-[#243B55]/50">
                            🔻 Se restará de tu fondo libre (Saldo disponible actual: <strong className="text-white">{formatCOP(availableCash)}</strong>) y se registrará en tu historial.
                          </p>

                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              onClick={() => {
                                setDepositGoalId(null);
                                setDepositAmount('');
                              }}
                              className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleDepositFunds(goal.id)}
                              disabled={isDepositing || !Number(depositAmount)}
                              className="px-3.5 py-1.5 bg-[#00ADB5] text-[#0B192C] rounded-xl font-extrabold text-xs flex items-center gap-1 hover:opacity-90 disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3px]" />
                              <span>{isDepositing ? 'Guardando...' : 'Confirmar Abono'}</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* MODE 2: WITHDRAW PANEL */}
                      {isWithdrawingThis && (
                        <div className="p-3 rounded-2xl bg-[#0B192C] border border-amber-500/60 space-y-2.5 animate-in fade-in duration-150">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                              <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
                              <span>Retirar ahorro al fondo libre</span>
                            </span>
                            {Number(withdrawAmount) > 0 && (
                              <span className="text-xs font-black text-amber-400">
                                {formatCOP(Number(withdrawAmount))}
                              </span>
                            )}
                          </div>

                          <input
                            type="number"
                            placeholder={`Monto (Máximo ${formatCOP(goal.current_amount)})`}
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            className="w-full bg-[#102A43] border border-[#243B55] text-white text-xs px-3 py-2 rounded-xl focus:border-amber-400 focus:outline-none"
                            autoFocus
                          />

                          <div className="flex items-center justify-between gap-2">
                            <label className="text-[11px] text-slate-400 shrink-0">Recibir en:</label>
                            <select
                              value={withdrawMethod}
                              onChange={(e) => setWithdrawMethod(e.target.value)}
                              className="flex-1 bg-[#102A43] border border-[#243B55] text-white text-xs px-2 py-1.5 rounded-lg focus:outline-none"
                            >
                              {paymentMethods.map((pm: any) => (
                                <option key={pm.id} value={pm.name}>
                                  {pm.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <p className="text-[10px] text-slate-400 bg-[#102A43]/60 p-2 rounded-lg border border-[#243B55]/50">
                            🟢 Regresará inmediatamente a tu dinero disponible en mano.
                          </p>

                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              onClick={() => {
                                setWithdrawGoalId(null);
                                setWithdrawAmount('');
                              }}
                              className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleWithdrawFunds(goal.id)}
                              disabled={isWithdrawing || !Number(withdrawAmount)}
                              className="px-3.5 py-1.5 bg-amber-400 text-slate-950 rounded-xl font-extrabold text-xs flex items-center gap-1 hover:opacity-90 disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3px]" />
                              <span>{isWithdrawing ? 'Retirando...' : 'Confirmar Retiro'}</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* DEFAULT BUTTONS: ABONAR & RETIRAR */}
                      {!isDepositingThis && !isWithdrawingThis && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setDepositGoalId(goal.id);
                              setWithdrawGoalId(null);
                            }}
                            className="flex-1 py-2 rounded-xl bg-[#00ADB5] hover:bg-[#06B6D4] text-[#0B192C] font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                          >
                            <PiggyBank className="w-4 h-4" />
                            <span>Abonar (+ Dinero)</span>
                          </button>

                          {Number(goal.current_amount) > 0 && (
                            <button
                              onClick={() => {
                                setWithdrawGoalId(goal.id);
                                setDepositGoalId(null);
                              }}
                              className="py-2 px-3 rounded-xl bg-[#152E4D] hover:bg-[#1E3A5F] border border-[#243B55] text-slate-300 hover:text-white text-xs font-bold transition-all"
                              title="Retirar dinero de esta meta al fondo disponible"
                            >
                              Retirar
                            </button>
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

        {/* Modal for New Goal with Live Daily Saving Calculator */}
        {isAddGoalOpen && (
          <div className="bg-[#0B192C] border border-[#00ADB5] rounded-3xl p-5 sm:p-6 shadow-2xl animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E3A5F]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-[#00ADB5]" />
                <span>Crear Nueva Meta Financiera</span>
              </h3>
              <button
                onClick={() => setIsAddGoalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Título de la Meta
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Moto Nueva, Fondo de Emergencia, Viaje"
                    value={goalTitle}
                    onChange={(e) => setGoalTitle(e.target.value)}
                    className="w-full bg-[#102A43] border border-[#243B55] text-white text-xs px-3 py-2.5 rounded-xl focus:border-[#00ADB5] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">
                      Monto Objetivo ($ COP)
                    </label>
                    {numTarget > 0 && (
                      <span className="text-[11px] text-[#00ADB5] font-bold">
                        {formatCOP(numTarget)}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    placeholder="Ej: 5000000"
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(e.target.value)}
                    className="w-full bg-[#102A43] border border-[#243B55] text-white text-xs px-3 py-2.5 rounded-xl focus:border-[#00ADB5] focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Target Date with Quick Presets */}
              <div className="p-3.5 rounded-2xl bg-[#102A43]/60 border border-[#243B55]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#00ADB5]" />
                    <span>Fecha Límite Deseada</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 mr-1">Rápido:</span>
                    <button
                      type="button"
                      onClick={() => handleSetPresetMonths(3)}
                      className="text-[10px] bg-[#152E4D] hover:bg-[#1E3A5F] text-slate-300 px-2 py-0.5 rounded-lg border border-[#243B55]"
                    >
                      +3m
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetPresetMonths(6)}
                      className="text-[10px] bg-[#152E4D] hover:bg-[#1E3A5F] text-slate-300 px-2 py-0.5 rounded-lg border border-[#243B55]"
                    >
                      +6m
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetPresetMonths(12)}
                      className="text-[10px] bg-[#152E4D] hover:bg-[#1E3A5F] text-slate-300 px-2 py-0.5 rounded-lg border border-[#243B55]"
                    >
                      +1 año
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetPresetMonths(24)}
                      className="text-[10px] bg-[#152E4D] hover:bg-[#1E3A5F] text-slate-300 px-2 py-0.5 rounded-lg border border-[#243B55]"
                    >
                      +2 años
                    </button>
                  </div>
                </div>

                <input
                  type="date"
                  value={goalDate}
                  onChange={(e) => setGoalDate(e.target.value)}
                  className="w-full bg-[#0B192C] border border-[#243B55] text-white text-xs px-3 py-2 rounded-xl focus:border-[#00ADB5] focus:outline-none"
                />
              </div>

              {/* LIVE DAILY SAVINGS SIMULATOR IN MODAL */}
              {remainingInModal > 0 && dailyInModal > 0 && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#0B192C] to-[#102A43] border border-[#00ADB5]/40 space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#00ADB5]" />
                      <span>Plan de Ahorro Sugerido:</span>
                    </span>
                    <span className="text-xs font-black text-[#00ADB5]">
                      {daysInModal} días faltantes
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="p-2 rounded-xl bg-[#0B192C] border border-[#1E3A5F]">
                      <span className="text-[10px] text-slate-400 block font-medium">Ahorro Diario Requerido</span>
                      <p className="text-base font-black text-[#00ADB5] mt-0.5">
                        {formatCOP(dailyInModal)} <span className="text-[10px] font-normal text-slate-400">/ día</span>
                      </p>
                    </div>

                    <div className="p-2 rounded-xl bg-[#0B192C] border border-[#1E3A5F]">
                      <span className="text-[10px] text-slate-400 block font-medium">Por Quincena (15 días)</span>
                      <p className="text-base font-black text-white mt-0.5">
                        {formatCOP(quincenaInModal)} <span className="text-[10px] font-normal text-slate-400">/ quincena</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddGoalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingGoal}
                  className="px-5 py-2.5 rounded-xl bg-[#00ADB5] text-[#0B192C] font-extrabold text-xs shadow-md hover:opacity-90 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3px]" />
                  <span>Guardar Meta</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Reverse Engineering Income Calculator */}
        <div className="bg-[#102A43] border border-[#243B55] rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-400/20 text-[#00ADB5]">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Calculadora Inversa: ¿Cuánto Necesito Ganar al Mes?</h2>
              <p className="text-xs text-slate-400">
                Suma tus compromisos fijos, margen variable, metas de ahorro y margen de seguridad.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#0B192C] border border-[#243B55] rounded-2xl p-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-400">
                  1. Compromisos Fijos
                </label>
                <span className="text-[10px] text-cyan-400 font-bold">{formatCOP(calcFixedExpenses)}</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-bold">$</span>
                <input
                  type="number"
                  value={calcFixedExpenses}
                  onChange={(e) => setCalcFixedExpenses(Number(e.target.value) || 0)}
                  className="w-full bg-[#152E4D] border border-[#243B55] text-white text-xs font-bold pl-7 pr-2 py-2 rounded-xl focus:border-[#00ADB5] focus:outline-none"
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Papás, arriendo, servicios, suscripciones</span>
            </div>

            <div className="bg-[#0B192C] border border-[#243B55] rounded-2xl p-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-400">
                  2. Margen Variable (Tope)
                </label>
                <span className="text-[10px] text-[#00ADB5] font-bold">{formatCOP(calcVariableExpenses)}</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-bold">$</span>
                <input
                  type="number"
                  value={calcVariableExpenses}
                  onChange={(e) => setCalcVariableExpenses(Number(e.target.value) || 0)}
                  className="w-full bg-[#152E4D] border border-[#243B55] text-white text-xs font-bold pl-7 pr-2 py-2 rounded-xl focus:border-[#00ADB5] focus:outline-none"
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Alimentación, pasajes, ocio</span>
            </div>

            <div className="bg-[#0B192C] border border-[#243B55] rounded-2xl p-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-400">
                  3. Ahorro Mensual para Metas
                </label>
                <span className="text-[10px] text-emerald-400 font-bold">{formatCOP(calcDesiredSavings)}</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-bold">$</span>
                <input
                  type="number"
                  value={calcDesiredSavings}
                  onChange={(e) => setCalcDesiredSavings(Number(e.target.value) || 0)}
                  className="w-full bg-[#152E4D] border border-[#243B55] text-white text-xs font-bold pl-7 pr-2 py-2 rounded-xl focus:border-[#00ADB5] focus:outline-none"
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Para emergencias y metas</span>
            </div>
          </div>

          {/* Calculator Output Hero */}
          <div className="mt-4 p-4 rounded-2xl bg-[#0B192C]/90 border border-[#243B55] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#00ADB5]">
                Ingreso Mensual Necesario
              </span>
              <p className="text-2xl sm:text-3xl font-black text-white mt-0.5">
                {formatCOP(requiredMonthlyIncome)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Incluye un colchón de imprevistos del {calcBufferPercent}% ({formatCOP(safetyBuffer)}).
              </p>
            </div>

            <div className="bg-[#102A43] border border-[#243B55] rounded-xl p-3 text-right">
              <span className="block text-[10px] text-slate-400 font-medium">Comparado con tus ingresos de este mes</span>
              <p className={`text-sm font-extrabold mt-0.5 ${incomeDifference >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {incomeDifference >= 0
                  ? `¡Lo cubres! Te sobran ${formatCOP(incomeDifference)}`
                  : `Te faltan ${formatCOP(Math.abs(incomeDifference))} para ese nivel`}
              </p>
            </div>
          </div>
        </div>
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
