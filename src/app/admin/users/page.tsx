'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { QuickExpenseModal } from '@/components/expenses/QuickExpenseModal';
import { formatCOP } from '@/lib/utils';
import { Users, UserPlus, Shield, Check, X, ArrowLeft, Lock, Mail, User, Power, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { PageBanner, Button, Badge, Modal } from '@/components/ui';

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header user={currentUser} onUserUpdate={loadData} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-5 space-y-4">
        {/* Top Header Banner */}
        <PageBanner
          icon={<Users className="w-5 h-5" />}
          title="Gestión de Usuarios"
          description="Permite a tus amigos llevar sus finanzas de forma 100% privada e independiente"
          badgeText="ADMIN"
          actionText="Crear Cuenta para Amigo"
          onAction={() => setIsAddUserOpen(true)}
          actionIcon={<UserPlus className="w-4 h-4 stroke-[2.5px]" />}
        />

        {/* Users List */}
        <div className="bg-surface border border-border rounded-3xl p-5 shadow-xl">
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span>Usuarios en la Plataforma ({usersList.length})</span>
          </h3>

          <div className="space-y-2.5">
            {usersList.map((item) => {
              const isAdmin = item.role === 'ADMIN';
              const isSelf = item.id === currentUser?.id;
              return (
                <div
                  key={item.id}
                  className="bg-surface-elevated border border-border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isAdmin ? 'bg-primary/20 text-primary' : 'bg-secondary text-foreground/80'}`}>
                      {isAdmin ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-foreground">{item.name}</span>
                        {isSelf && (
                          <Badge variant="primary" size="sm">
                            Tú
                          </Badge>
                        )}
                        <Badge variant={isAdmin ? 'accent' : 'secondary'} size="sm">
                          {item.role}
                        </Badge>
                      </div>
                      <p className="text-xs text-foreground/50 mt-0.5">
                        {item.email} • {item.total_expenses_count} gastos registrados
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
                    <div className="text-left sm:text-right">
                      <span className="block text-[10px] text-foreground/50">Ingreso configurado</span>
                      <span className="text-xs font-bold text-foreground">{formatCOP(item.monthly_income)}</span>
                    </div>

                    {!isSelf && (
                      <Button
                        type="button"
                        variant={item.is_active ? 'success' : 'danger'}
                        size="xs"
                        onClick={() => handleToggleStatus(item)}
                        icon={Power}
                        title={item.is_active ? 'Desactivar acceso' : 'Activar acceso'}
                      >
                        {item.is_active ? 'Activo' : 'Suspendido'}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Modal to Add Friend Account */}
      <Modal
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        title="Registrar Acceso para Amigo (Básico / Normal)"
        icon={<UserPlus className="w-5 h-5 text-primary" />}
        size="lg"
      >
        <form onSubmit={handleCreateFriend} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground/80 mb-1">Nombre Completo</label>
              <div className="relative">
                <User className="w-4 h-4 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Ej: Camilo Torres"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-surface-elevated border border-border text-foreground text-xs pl-9 pr-3 py-2 rounded-xl focus:border-primary focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground/80 mb-1">Correo Electrónico (Login)</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  placeholder="camilo@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-elevated border border-border text-foreground text-xs pl-9 pr-3 py-2 rounded-xl focus:border-primary focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground/80 mb-1">Contraseña Inicial</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Ej: amigo2026*"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-elevated border border-border text-foreground text-xs pl-9 pr-3 py-2 rounded-xl focus:border-primary focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground/80 mb-1">Ingreso Mensual Estimado ($ COP)</label>
              <input
                type="number"
                placeholder="2000000"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                className="w-full bg-surface-elevated border border-border text-foreground text-xs px-3 py-2 rounded-xl focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <p className="text-[11px] text-foreground/50">
            Nota: El usuario se creará con rol <strong>USER (Básico)</strong> y tendrá sus propias categorías y espacio privado listos para registrar gastos desde su celular.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsAddUserOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              isLoading={isSubmitting}
              icon={Check}
            >
              Crear Cuenta
            </Button>
          </div>
        </form>
      </Modal>

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
