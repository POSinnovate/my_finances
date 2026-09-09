'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { QuickExpenseModal } from '@/components/expenses/QuickExpenseModal';
import { formatCOP } from '@/lib/utils';
import { Users, UserPlus, Shield, Check, X, ArrowLeft, Lock, Mail, User, Power } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function AdminUsersPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  // New Friend Form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('2000000');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        router.push('/login');
        return;
      }
      const meData = await meRes.json();
      setCurrentUser(meData.user);

      if (meData.user?.role !== 'ADMIN') {
        toast.error('Acceso denegado: solo administradores');
        router.push('/');
        return;
      }

      const usersRes = await fetch('/api/admin/users');
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsersList(data.users || []);
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

  const handleCreateFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error('Nombre, correo y contraseña requeridos');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          role: 'USER',
          monthly_income: Number(monthlyIncome) || 2000000,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Cuenta creada para ${name}`);
        setName('');
        setEmail('');
        setPassword('');
        setIsAddUserOpen(false);
        loadData();
      } else {
        toast.error(data.error || 'Error al crear usuario');
      }
    } catch {
      toast.error('Error de red');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (userItem: any) => {
    const newStatus = userItem.is_active ? 0 : 1;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userItem.id, is_active: newStatus }),
      });
      if (res.ok) {
        toast.success(`Usuario ${newStatus ? 'activado' : 'desactivado'}`);
        loadData();
      } else {
        toast.error('No se pudo actualizar el estado');
      }
    } catch {
      toast.error('Error de red');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070F1E] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#00ADB5]/30 border-t-[#00ADB5] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070F1E] flex flex-col">
      <Header user={currentUser} onUserUpdate={loadData} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-5 space-y-4">
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
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white">Gestión de Usuarios & Amigos</h1>
                <span className="text-[10px] bg-[#00ADB5]/20 text-[#00ADB5] font-extrabold px-2 py-0.5 rounded-full">
                  ADMIN
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Permite a tus amigos llevar sus finanzas de forma 100% privada e independiente
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAddUserOpen(true)}
            className="py-2.5 px-4 rounded-xl bg-linear-to-r from-[#00ADB5] to-[#06B6D4] text-[#0B192C] font-extrabold text-xs shadow-md shadow-[#00ADB5]/20 flex items-center gap-1.5 self-start sm:self-center"
          >
            <UserPlus className="w-4 h-4 stroke-[2.5px]" />
            <span>Crear Cuenta para Amigo</span>
          </button>
        </div>

        {/* Modal / Drawer to Add Friend Account */}
        {isAddUserOpen && (
          <div className="bg-[#0B192C] border border-[#00ADB5] rounded-3xl p-5 shadow-2xl animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E3A5F]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#00ADB5]" />
                <span>Registrar Acceso para Amigo (Básico / Normal)</span>
              </h3>
              <button
                onClick={() => setIsAddUserOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFriend} className="mt-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre Completo</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Ej: Camilo Torres"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#102A43] border border-[#243B55] text-white text-xs pl-9 pr-3 py-2 rounded-xl focus:border-[#00ADB5] focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Correo Electrónico (Login)</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      placeholder="camilo@correo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#102A43] border border-[#243B55] text-white text-xs pl-9 pr-3 py-2 rounded-xl focus:border-[#00ADB5] focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Contraseña Inicial</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Ej: amigo2026*"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#102A43] border border-[#243B55] text-white text-xs pl-9 pr-3 py-2 rounded-xl focus:border-[#00ADB5] focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Ingreso Mensual Estimado ($ COP)</label>
                  <input
                    type="number"
                    placeholder="2000000"
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(e.target.value)}
                    className="w-full bg-[#102A43] border border-[#243B55] text-white text-xs px-3 py-2 rounded-xl focus:border-[#00ADB5] focus:outline-none"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                Nota: El usuario se creará con rol <strong>USER (Básico)</strong> y tendrá sus propias categorías y espacio privado listos para registrar gastos desde su celular.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#00ADB5] text-[#0B192C] font-extrabold text-xs shadow-md hover:opacity-90 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3px]" />
                  <span>Crear Cuenta</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Users List */}
        <div className="bg-[#0B192C] border border-[#1E3A5F] rounded-3xl p-5 shadow-xl">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#00ADB5]" />
            <span>Usuarios en la Plataforma ({usersList.length})</span>
          </h3>

          <div className="space-y-2.5">
            {usersList.map((item) => {
              const isAdmin = item.role === 'ADMIN';
              const isSelf = item.id === currentUser?.id;
              return (
                <div
                  key={item.id}
                  className="bg-[#102A43] border border-[#243B55] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isAdmin ? 'bg-[#00ADB5]/20 text-[#00ADB5]' : 'bg-[#152E4D] text-slate-300'}`}>
                      {isAdmin ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-white">{item.name}</span>
                        {isSelf && (
                          <span className="text-[10px] bg-[#00ADB5]/20 text-[#00ADB5] px-1.5 py-0.2 rounded font-bold">
                            Tú
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isAdmin ? 'bg-[#00ADB5]/20 text-[#00ADB5]' : 'bg-slate-700 text-slate-300'}`}>
                          {item.role}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {item.email} • {item.total_expenses_count} gastos registrados
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#243B55]">
                    <div className="text-left sm:text-right">
                      <span className="block text-[10px] text-slate-400">Ingreso configurado</span>
                      <span className="text-xs font-bold text-white">{formatCOP(item.monthly_income)}</span>
                    </div>

                    {!isSelf && (
                      <button
                        onClick={() => handleToggleStatus(item)}
                        className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                          item.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30'
                        }`}
                        title={item.is_active ? 'Desactivar acceso' : 'Activar acceso'}
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>{item.is_active ? 'Activo' : 'Suspendido'}</span>
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
        userRole={currentUser?.role}
      />

      <QuickExpenseModal
        isOpen={isQuickExpenseOpen}
        onClose={() => setIsQuickExpenseOpen(false)}
        onExpenseAdded={loadData}
        categories={[]}
      />
    </div>
  );
}
