'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { QuickExpenseModal } from '@/components/expenses/QuickExpenseModal';
import { formatCOP } from '@/lib/utils';
import { Target, Plus, ArrowLeft, PiggyBank, Calculator, Check, X, TrendingUp, Sparkles, Trash2 } from 'lucide-react';
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
  const [calcFixedExpenses, setCalcFixedExpenses] = useState<number>(350000); // Default papas
  const [calcVariableExpenses, setCalcVariableExpenses] = useState<number>(750000); // Food, transport, etc
  const [calcDesiredSavings, setCalcDesiredSavings] = useState<number>(800000); // Target saving
  const [calcBufferPercent, setCalcBufferPercent] = useState<number>(10); // 10% safety margin

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
      }
    } catch {
      toast.error('Error al eliminar');
    }
  };

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
              <h1 className="text-xl font-black text-white">Metas & Proyecciones</h1>
              <p className="text-xs text-slate-400">Ahorra con propósito y calcula cuánto debes ganar</p>
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

        {/* Interactive Simulator: ¿CUÁNTO DEBO GANAR? */}
        <div className="bg-gradient-to-br from-[#0B192C] to-[#102A43] border-2 border-[#00ADB5]/40 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-[#00ADB5]/20 text-[#00ADB5] flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Calculadora: ¿Cuánto Debo Ganar?</h2>
              <p className="text-xs text-slate-400">Simula tu ingreso ideal según tus gastos fijos y metas deseadas</p>
            </div>
          </div>

          {/* Calculator Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-4">
            <div className="bg-[#0B192C] border border-[#243B55] rounded-2xl p-3">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                1. Gastos Fijos (Papás / Serv.)
              </label>
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
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                2. Gastos de Vida (Comida / Movilidad)
              </label>
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
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                3. Ahorro Mensual para Metas
              </label>
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
              <span className="block text-[10px] text-slate-400 font-medium">Comparado con tu sueldo actual</span>
              <p className={`text-sm font-extrabold mt-0.5 ${incomeDifference >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {incomeDifference >= 0
                  ? `¡Lo cubres! Te sobran ${formatCOP(incomeDifference)}`
                  : `Te faltan ${formatCOP(Math.abs(incomeDifference))} para ese nivel de ahorro`}
              </p>
            </div>
          </div>
        </div>

        {/* Modal / Inline Drawer for New Goal */}
        {isAddGoalOpen && (
          <div className="bg-[#0B192C] border border-[#00ADB5] rounded-3xl p-5 shadow-2xl animate-in fade-in duration-150">
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

            <form onSubmit={handleCreateGoal} className="mt-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre de la Meta</label>
                  <input
                    type="text"
                    placeholder="Ej: Moto, Fondo de Emergencia, Laptop"
                    value={goalTitle}
                    onChange={(e) => setGoalTitle(e.target.value)}
                    className="w-full bg-[#102A43] border border-[#243B55] text-white text-xs px-3 py-2 rounded-xl focus:border-[#00ADB5] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Monto Total Objetivo ($ COP)</label>
                  <input
                    type="number"
                    placeholder="Ej: 3000000"
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(e.target.value)}
                    className="w-full bg-[#102A43] border border-[#243B55] text-white text-xs px-3 py-2 rounded-xl focus:border-[#00ADB5] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Monto Ya Ahorrado ($ COP)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={goalCurrent}
                    onChange={(e) => setGoalCurrent(e.target.value)}
                    className="w-full bg-[#102A43] border border-[#243B55] text-white text-xs px-3 py-2 rounded-xl focus:border-[#00ADB5] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Aporte Mensual Estimado ($ COP)</label>
                  <input
                    type="number"
                    placeholder="Ej: 300000"
                    value={goalMonthly}
                    onChange={(e) => setGoalMonthly(e.target.value)}
                    className="w-full bg-[#102A43] border border-[#243B55] text-white text-xs px-3 py-2 rounded-xl focus:border-[#00ADB5] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddGoalOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingGoal}
                  className="px-4 py-2 rounded-xl bg-[#00ADB5] text-[#0B192C] font-extrabold text-xs shadow-md hover:opacity-90 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3px]" />
                  <span>Guardar Meta</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Goals List */}
        <div className="space-y-3.5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <PiggyBank className="w-4 h-4 text-[#00ADB5]" />
            <span>Tus Metas Activas ({goals.length})</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {goals.map((goal) => {
              const progress = goal.progress_percentage || 0;
              const isDone = progress >= 100;
              return (
                <div
                  key={goal.id}
                  className="bg-[#102A43] border border-[#243B55] rounded-3xl p-5 shadow-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-extrabold text-white">{goal.title}</h4>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isDone ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#00ADB5]/20 text-[#00ADB5]'}`}>
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

                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Ahorrado: <strong className="text-white">{formatCOP(goal.current_amount)}</strong></span>
                        <span>Meta: <strong className="text-slate-200">{formatCOP(goal.target_amount)}</strong></span>
                      </div>
                      <div className="w-full h-2.5 bg-[#0B192C] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#00ADB5] to-[#06B6D4] rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, progress)}%` }}
                        />
                      </div>
                    </div>

                    {goal.monthly_contribution > 0 && !isDone && (
                      <p className="text-[11px] text-slate-400 mt-2.5">
                        Aportando <strong className="text-white">{formatCOP(goal.monthly_contribution)}/mes</strong>, la alcanzas en aprox. <strong className="text-[#00ADB5]">{goal.months_to_achieve} meses</strong>.
                      </p>
                    )}
                  </div>

                  {/* Deposit Action */}
                  <div className="mt-4 pt-3 border-t border-[#243B55] flex items-center justify-between gap-2">
                    {depositGoalId === goal.id ? (
                      <div className="flex items-center gap-2 w-full">
                        <input
                          type="number"
                          placeholder="Monto a abonar"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          className="flex-1 bg-[#0B192C] border border-[#00ADB5] text-white text-xs px-2 py-1.5 rounded-lg focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => handleDepositFunds(goal.id)}
                          className="p-1.5 bg-[#00ADB5] text-[#0B192C] rounded-lg font-bold text-xs"
                          title="Confirmar abono"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3px]" />
                        </button>
                        <button
                          onClick={() => setDepositGoalId(null)}
                          className="p-1.5 text-slate-400 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDepositGoalId(goal.id)}
                        className="w-full py-2 rounded-xl bg-[#152E4D] hover:bg-[#1E3A5F] border border-[#243B55] text-xs font-bold text-[#00ADB5] flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <PiggyBank className="w-3.5 h-3.5" />
                        <span>Abonar Dinero a Esta Meta</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
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
