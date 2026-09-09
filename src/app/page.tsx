'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { DailyBurnCard } from '@/components/stats/DailyBurnCard';
import { FinancialOverviewCard } from '@/components/stats/FinancialOverviewCard';
import { QuickExpenseModal } from '@/components/expenses/QuickExpenseModal';
import { MovementDetailModal } from '@/components/expenses/MovementDetailModal';
import { formatCOP, formatDateSpanish } from '@/lib/utils';
import { 
  AlertTriangle, 
  ArrowRight, 
  PlusCircle, 
  Receipt, 
  Trash2, 
  Flame, 
  Sparkles, 
  Tag
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
  monthly_income: number;
  current_cash: number;
  payday_day: number;
}

interface Expense {
  id: string;
  type?: 'EXPENSE' | 'INCOME';
  amount: number;
  payment_method: string;
  notes: string | null;
  date: string;
  category_name: string;
  category_color: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  monthly_budget: number;
  spent_this_month: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<any | null>(null);

  const loadData = useCallback(async () => {
    try {
      // 1. Me
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        router.push('/login');
        return;
      }
      const meData = await meRes.json();
      setUser(meData.user);

      // 2. Stats
      const statsRes = await fetch('/api/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // 3. Categories
      const catRes = await fetch('/api/categories');
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData.categories || []);
      }

      // 4. Recent Expenses (Latest registered movements across all time)
      const expRes = await fetch('/api/expenses?limit=10');
      if (expRes.ok) {
        const expData = await expRes.json();
        setRecentExpenses(expData.expenses?.slice(0, 10) || []);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('¿Eliminar este movimiento y actualizar el fondo disponible?')) return;
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Movimiento eliminado y saldo actualizado');
        loadData();
      } else {
        toast.error('Error al eliminar');
      }
    } catch {
      toast.error('Error de conexión');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070F1E] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#00ADB5]/30 border-t-[#00ADB5] rounded-full animate-spin" />
        <p className="text-xs text-slate-400 mt-3 font-semibold tracking-wider uppercase">Cargando tus finanzas...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070F1E] flex flex-col">
      <Header user={user} onUserUpdate={loadData} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-5 space-y-5">
        {/* Welcome & Quick Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-[#0B192C] to-[#102A43] border border-[#1E3A5F] rounded-3xl p-5 shadow-xl">
          <div>
            <span className="text-[11px] font-bold text-[#00ADB5] uppercase tracking-wider">
              Diagnóstico Financiero en Vivo
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5">
              Hola, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-md">
              Mantén el registro al instante para erradicar las fugas y llegar con dinero al fin de mes.
            </p>
          </div>

          <button
            onClick={() => setIsQuickExpenseOpen(true)}
            className="self-start sm:self-center py-2.5 px-4 rounded-2xl bg-gradient-to-r from-[#00ADB5] to-[#06B6D4] text-[#0B192C] font-extrabold text-xs shadow-lg shadow-[#00ADB5]/20 flex items-center gap-2 hover:opacity-95 active:scale-95 transition-all"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5px]" />
            <span>+ Registrar Movimiento</span>
          </button>
        </div>

        {/* Intelligent Alerts Banner (if any) */}
        {stats?.alerts && stats.alerts.length > 0 && (
          <div className="space-y-2">
            {stats.alerts.map((alert: any) => {
              const isCrit = alert.type === 'CRITICAL';
              return (
                <div
                  key={alert.id}
                  className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-all ${
                    isCrit
                      ? 'bg-rose-950/40 border-rose-600/50 text-rose-200'
                      : 'bg-amber-950/40 border-amber-600/50 text-amber-200'
                  }`}
                >
                  <AlertTriangle
                    className={`w-5 h-5 shrink-0 mt-0.5 ${isCrit ? 'text-rose-400' : 'text-amber-400'}`}
                  />
                  <div className="flex-1">
                    <h4 className="text-xs font-bold leading-tight">{alert.title}</h4>
                    <p className="text-xs opacity-90 mt-0.5 leading-relaxed">{alert.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Hero Section: Safe Daily Spend Card */}
        {stats?.health && (
          <DailyBurnCard health={stats.health} currentCash={user?.current_cash || 0} />
        )}

        {/* Monthly Financial Overview Cards */}
        {stats?.summary && <FinancialOverviewCard summary={stats.summary} />}

        {/* Top Money Leaks Section */}
        {stats?.topLeaks && stats.topLeaks.length > 0 && (
          <div className="bg-[#0B192C] border border-[#1E3A5F] rounded-3xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">Mayores Fugas de Dinero Este Mes</h3>
                  <p className="text-[11px] text-slate-400">Los grupos donde más dinero se está yendo</p>
                </div>
              </div>
              <Link
                href="/budgets"
                className="text-xs text-[#00ADB5] hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Ver todos</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {stats.topLeaks.map((leak: any, idx: number) => {
                const percent = leak.budget_usage_percentage || 0;
                const isOver = percent > 100;
                return (
                  <div
                    key={leak.id}
                    className="bg-[#102A43] border border-[#243B55] rounded-2xl p-3.5 relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-500">#{idx + 1}</span>
                        <span className="text-xs font-bold text-white truncate max-w-[130px]">{leak.name}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isOver ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-700 text-slate-300'}`}>
                        {percent}%
                      </span>
                    </div>

                    <div className="mt-2">
                      <span className="text-base font-black text-white">{formatCOP(leak.total_spent)}</span>
                      <span className="block text-[10px] text-slate-400">de {formatCOP(leak.monthly_budget)} est.</span>
                    </div>

                    {/* Mini progress bar */}
                    <div className="w-full h-1.5 bg-[#0B192C] rounded-full mt-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isOver ? 'bg-rose-500' : 'bg-[#00ADB5]'}`}
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Expenses List */}
        <div className="bg-[#0B192C] border border-[#1E3A5F] rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#00ADB5]/20 text-[#00ADB5] flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Últimos Movimientos Registrados</h3>
            </div>
            <Link
              href="/expenses"
              className="text-xs text-[#00ADB5] hover:underline flex items-center gap-1 font-semibold"
            >
              <span>Ver historial</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {recentExpenses.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#00ADB5]" />
              <p className="text-xs">Aún no has registrado ningún movimiento.</p>
              <button
                onClick={() => setIsQuickExpenseOpen(true)}
                className="mt-3 text-xs text-[#00ADB5] font-bold underline"
              >
                Registrar el primer movimiento ahora
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentExpenses.map((exp) => {
                const isIncome = exp.type === 'INCOME';
                return (
                  <div
                    key={exp.id}
                    onClick={() => setSelectedMovement(exp)}
                    className="bg-[#102A43] hover:bg-[#152E4D] border border-[#243B55] hover:border-[#00ADB5]/50 rounded-2xl p-3 flex items-center justify-between gap-3 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: isIncome ? '#10B981' : (exp.category_color || '#00ADB5') }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white group-hover:text-[#00ADB5] transition-colors truncate">
                            {isIncome ? (exp.category_name || 'Ingreso de Dinero') : exp.category_name}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded border ${
                            isIncome 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                              : 'bg-[#0B192C] text-slate-400 border-[#243B55]'
                          }`}>
                            {isIncome ? 'Ingreso (+)' : exp.payment_method}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {exp.notes || (isIncome ? 'Depósito a fondo' : 'Sin descripción')} • <span className="text-slate-300 font-medium">{formatDateSpanish(exp.date)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <span className={`text-sm font-extrabold ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isIncome ? `+${formatCOP(exp.amount)}` : `-${formatCOP(exp.amount)}`}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteExpense(exp.id);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Eliminar movimiento y actualizar saldo"
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

      <MovementDetailModal
        movement={selectedMovement}
        isOpen={!!selectedMovement}
        onClose={() => setSelectedMovement(null)}
        onMovementDeleted={loadData}
      />
    </div>
  );
}
