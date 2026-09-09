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
  Coins
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function GoalsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);

  // New Goal Form
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalCurrent, setGoalCurrent] = useState('');
  const [goalMonthly, setGoalMonthly] = useState('');
  const [goalDate, setGoalDate] = useState('');
  const [isSubmittingGoal, setIsSubmittingGoal] = useState(false);

  // Deposit Modal
  const [depositGoalId, setDepositGoalId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');

  // Interactive Reverse Calculator ("¿Cuánto debo ganar?")
  const [calcFixedExpenses, setCalcFixedExpenses] = useState<number>(350000);
  const [calcVariableExpenses, setCalcVariableExpenses] = useState<number>(750000);
  const [calcDesiredSavings, setCalcDesiredSavings] = useState<number>(800000);
  const [calcBufferPercent, setCalcBufferPercent] = useState<number>(10);

  const totalCalculatedNeeds = calcFixedExpenses + calcVariableExpenses + calcDesiredSavings;
  const safetyBuffer = Math.round(totalCalculatedNeeds * (calcBufferPercent / 100));
  const requiredMonthlyIncome = totalCalculatedNeeds + safetyBuffer;

  const loadData = useCallback(async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        router.push('/login');
        return;
      }
      const meData = await meRes.json();
      setUser(meData.user);

      const goalsRes = await fetch('/api/goals');
      if (goalsRes.ok) {
        const goalsData = await goalsRes.json();
        setGoals(goalsData.goals || []);
      }

      const catRes = await fetch('/api/categories');
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData.categories || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Set quick target date presets
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
        loadData();
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
    try {
      const res = await fetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: goalId, add_funds: amount }),
      });
      if (res.ok) {
        toast.success(`Se abonaron ${formatCOP(amount)} a la meta`);
        setDepositGoalId(null);
        setDepositAmount('');
        loadData();
      } else {
        toast.error('Error al abonar');
      }
    } catch {
      toast.error('Error de red');
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!confirm('¿Eliminar esta meta?')) return;
    try {
      const res = await fetch(`/api/goals?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Meta eliminada');
        loadData();
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

  return (
    <div className="min-h-screen bg-[#070F1E] flex flex-col">
      <Header user={user} onUserUpdate={loadData} />

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
              <p className="text-xs text-slate-400">Calcula cuánto guardar al día y quincena para cumplir tus sueños</p>
            </div>
          </div>

          <button
            onClick={() => setIsAddGoalOpen(true)}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#00ADB5] to-[#06B6D4] text-[#0B192C] font-extrabold text-xs shadow-md shadow-[#00ADB5]/20 flex items-center gap-1.5 self-start sm:self-center"
          >
            <Plus className="w-4 h-4 stroke-[3px]" />
            <span>+ Nueva Meta</span>
          </button>
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
              {goals.map((goal) => {
                const progress = goal.progress_percentage || 0;
                const isDone = progress >= 100;
                return (
                  <div
                    key={goal.id}
                    className="bg-[#102A43] border border-[#243B55] hover:border-[#1E3A5F] rounded-3xl p-5 shadow-xl flex flex-col justify-between transition-all"
                  >
                    <div>
                      {/* Title & Badge */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-[#00ADB5]/20 text-[#00ADB5] flex items-center justify-center">
                            <Target className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-base font-black text-white">{goal.title}</h4>
                            {goal.target_date && (
                              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-[#00ADB5]" />
                                Meta: {formatDateSpanish(goal.target_date)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                            isDone ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#00ADB5]/20 text-[#00ADB5]'
                          }`}>
                            {progress}%
                          </span>
                          <button
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                            title="Eliminar meta"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Figures & Progress Bar */}
                      <div className="mt-4">
                        <div className="flex justify-between text-xs text-slate-400 mb-1 font-semibold">
                          <span>Ahorrado: <strong className="text-emerald-400 font-extrabold">{formatCOP(goal.current_amount)}</strong></span>
                          <span>Objetivo: <strong className="text-white font-extrabold">{formatCOP(goal.target_amount)}</strong></span>
                        </div>
                        <div className="w-full h-2.5 bg-[#0B192C] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#00ADB5] to-[#06B6D4] rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, progress)}%` }}
                          />
                        </div>
                      </div>

                      {/* Daily Savings Plan Indicator (The user's key requirement) */}
                      {!isDone && (
                        <div className="mt-4 p-3 rounded-2xl bg-[#0B192C]/80 border border-[#243B55] space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400 flex items-center gap-1 font-medium">
                              <Coins className="w-3.5 h-3.5 text-amber-400" />
                              <span>Ahorro diario sugerido:</span>
                            </span>
                            <span className="font-black text-amber-400 text-sm">
                              {formatCOP(goal.daily_saving_needed || 0)} / día
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

                    {/* Deposit Action */}
                    <div className="mt-4 pt-3 border-t border-[#243B55]">
                      {depositGoalId === goal.id ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-slate-400">Monto a abonar a esta meta:</span>
                            {Number(depositAmount) > 0 && (
                              <span className="text-xs font-bold text-emerald-400">
                                {formatCOP(Number(depositAmount))}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              placeholder="Ej: 50000"
                              value={depositAmount}
                              onChange={(e) => setDepositAmount(e.target.value)}
                              className="flex-1 bg-[#0B192C] border border-[#00ADB5] text-white text-xs px-2.5 py-1.5 rounded-lg focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleDepositFunds(goal.id)}
                              className="px-3 py-1.5 bg-[#00ADB5] text-[#0B192C] rounded-lg font-bold text-xs flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3px]" />
                              <span>Abonar</span>
                            </button>
                            <button
                              onClick={() => setDepositGoalId(null)}
                              className="p-1.5 text-slate-400 hover:text-white"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDepositGoalId(goal.id)}
                          className="w-full py-2.5 rounded-xl bg-[#152E4D] hover:bg-[#1E3A5F] border border-[#243B55] text-xs font-bold text-[#00ADB5] flex items-center justify-center gap-2 transition-colors"
                        >
                          <PiggyBank className="w-4 h-4" />
                          <span>Abonar Dinero a Esta Meta</span>
                        </button>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre de la Meta</label>
                  <input
                    type="text"
                    placeholder="Ej: Moto nueva, Fondo de Emergencia, Laptop"
                    value={goalTitle}
                    onChange={(e) => setGoalTitle(e.target.value)}
                    className="w-full bg-[#102A43] border border-[#243B55] text-white text-xs px-3 py-2.5 rounded-xl focus:border-[#00ADB5] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">
                      Monto Total Objetivo ($ COP)
                    </label>
                    {numTarget > 0 && (
                      <span className="text-xs font-bold text-[#00ADB5]">
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

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">
                      Monto Ya Ahorrado ($ COP)
                    </label>
                    {numCurrent > 0 && (
                      <span className="text-xs font-bold text-emerald-400">
                        {formatCOP(numCurrent)}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    placeholder="0"
                    value={goalCurrent}
                    onChange={(e) => setGoalCurrent(e.target.value)}
                    className="w-full bg-[#102A43] border border-[#243B55] text-white text-xs px-3 py-2.5 rounded-xl focus:border-[#00ADB5] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Fecha Límite Objetivo
                  </label>
                  <input
                    type="date"
                    value={goalDate}
                    onChange={(e) => setGoalDate(e.target.value)}
                    className="w-full bg-[#102A43] border border-[#243B55] text-white text-xs px-3 py-2.5 rounded-xl focus:border-[#00ADB5] focus:outline-none"
                  />
                  {/* Quick Presets */}
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-[10px] text-slate-500">Plazos rápidos:</span>
                    {[3, 6, 12, 24].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleSetPresetMonths(m)}
                        className="text-[10px] px-2 py-0.5 rounded bg-[#102A43] border border-[#243B55] text-slate-300 hover:text-[#00ADB5]"
                      >
                        {m === 12 ? '1 año' : m === 24 ? '2 años' : `${m}m`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Calculator Projection Banner inside form */}
              {remainingInModal > 0 && dailyInModal > 0 && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/50 to-teal-950/50 border border-emerald-500/40">
                  <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Plan de Ahorro Calculado en Tiempo Real</span>
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Ahorro Diario:</span>
                      <strong className="text-sm font-black text-amber-400">{formatCOP(dailyInModal)}/día</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Ahorro Quincenal:</span>
                      <strong className="text-sm font-black text-white">{formatCOP(quincenaInModal)}/quincena</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Tiempo Restante:</span>
                      <strong className="text-sm font-black text-[#00ADB5]">{daysInModal} días</strong>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[#1E3A5F]">
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

        {/* Interactive Simulator: ¿CUÁNTO DEBO GANAR? */}
        <div className="bg-gradient-to-br from-[#0B192C] to-[#102A43] border border-[#1E3A5F] rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-[#00ADB5]/20 text-[#00ADB5] flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Calculadora Inversa: ¿Cuánto Debo Ganar?</h2>
              <p className="text-xs text-slate-400">Simula tu meta de ingresos según tus compromisos fijos y ahorro deseado</p>
            </div>
          </div>

          {/* Calculator Inputs with Live Formats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-4">
            <div className="bg-[#0B192C] border border-[#243B55] rounded-2xl p-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-400">
                  1. Gastos Fijos (Papás / Serv.)
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
              <span className="text-[10px] text-slate-500 mt-1 block">Tu aporte fijo mensual</span>
            </div>

            <div className="bg-[#0B192C] border border-[#243B55] rounded-2xl p-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-400">
                  2. Gastos de Vida (Comida / Movilidad)
                </label>
                <span className="text-[10px] text-slate-300 font-bold">{formatCOP(calcVariableExpenses)}</span>
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
        onExpenseAdded={loadData}
        categories={categories}
      />
    </div>
  );
}
