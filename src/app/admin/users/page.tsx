'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { QuickExpenseModal } from '@/components/expenses/QuickExpenseModal';
import {
  Users,
  UserPlus,
  Shield,
  Lock,
  Mail,
  User,
  Power,
  Loader2,
  Trash2,
  KeyRound,
  Search,
  FolderTree,
  Wallet,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { PageBanner, Button, Badge, Modal } from '@/components/ui';

interface UserMetrics {
  total_categories: number;
  total_payment_methods: number;
  total_pockets: number;
  total_goals: number;
  total_loans: number;
  total_movements: number;
  recent_movements_30d: number;
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
  is_active: number;
  created_at: string;
  last_login_at?: string | null;
  last_active_at?: string | null;
  latest_movement_at?: string | null;
  last_seen_at?: string | null;
  days_since_last_seen?: number | null;
  health_status: 'ACTIVE' | 'MODERATE' | 'INACTIVE' | 'NEW';
  metrics: UserMetrics;
}

function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return 'Nunca ha ingresado';
  try {
    const timestamp = new Date(dateString).getTime();
    if (isNaN(timestamp)) return 'Sin registro';

    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return 'Hace un momento';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `Hace ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 30) return `Hace ${diffDays} días`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths === 1) return 'Hace 1 mes';
    if (diffMonths < 12) return `Hace ${diffMonths} meses`;
    return 'Hace más de 1 año';
  } catch {
    return 'Sin registro';
  }
}

function formatDateShort(dateString?: string | null): string {
  if (!dateString) return 'Sin fecha';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Sin fecha';
    return d.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return 'Sin fecha';
  }
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  const [categories, setCategories] = useState<any[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'MODERATE' | 'INACTIVE' | 'SUSPENDED'>('ALL');

  // Modals for actions
  const [userToDelete, setUserToDelete] = useState<UserItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [userToResetPassword, setUserToResetPassword] = useState<UserItem | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // New User Form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

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

      const [usersRes, catRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/categories').catch(() => null),
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsersList(data.users || []);
      } else {
        toast.error('Error al cargar la lista de usuarios');
      }

      if (catRes && catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData.categories || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error de red al consultar usuarios');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Create User
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
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Cuenta creada para ${name}`);
        setName('');
        setEmail('');
        setPassword('');
        setIsAddUserOpen(false);
        loadData(true);
      } else {
        toast.error(data.error || 'Error al crear usuario');
      }
    } catch {
      toast.error('Error de red al crear cuenta');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Toggle Status (Active / Suspended for subscriptions)
  const handleToggleStatus = async (userItem: UserItem) => {
    const newStatus = userItem.is_active ? 0 : 1;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userItem.id, is_active: newStatus }),
      });
      if (res.ok) {
        toast.success(newStatus ? `Acceso reactivado para ${userItem.name}` : `Acceso suspendido para ${userItem.name}`);
        loadData(true);
      } else {
        const err = await res.json();
        toast.error(err.error || 'No se pudo actualizar el estado');
      }
    } catch {
      toast.error('Error de conexión');
    }
  };

  // Handle Reset Password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToResetPassword || !newPassword.trim()) {
      toast.error('Ingresa una contraseña válida');
      return;
    }

    setIsResettingPassword(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userToResetPassword.id,
          reset_password: newPassword.trim(),
        }),
      });

      if (res.ok) {
        toast.success(`Contraseña actualizada para ${userToResetPassword.name}`);
        setUserToResetPassword(null);
        setNewPassword('');
      } else {
        const err = await res.json();
        toast.error(err.error || 'No se pudo restablecer la contraseña');
      }
    } catch {
      toast.error('Error de red al actualizar contraseña');
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Handle Delete User Permanently
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/admin/users?id=${userToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `Usuario ${userToDelete.name} eliminado.`);
        setUserToDelete(null);
        loadData(true);
      } else {
        toast.error(data.error || 'Error al eliminar usuario');
      }
    } catch {
      toast.error('Error de red al eliminar usuario');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered list
  const filteredUsers = useMemo(() => {
    return usersList.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.email.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'SUSPENDED') {
        return item.is_active === 0;
      }
      if (statusFilter === 'ACTIVE') {
        return item.health_status === 'ACTIVE' && item.is_active === 1;
      }
      if (statusFilter === 'MODERATE') {
        return item.health_status === 'MODERATE' && item.is_active === 1;
      }
      if (statusFilter === 'INACTIVE') {
        return (item.health_status === 'INACTIVE' || item.health_status === 'NEW') && item.is_active === 1;
      }

      return true;
    });
  }, [usersList, searchQuery, statusFilter]);

  // Global KPIs
  const stats = useMemo(() => {
    const total = usersList.length;
    const active = usersList.filter(u => u.health_status === 'ACTIVE' && u.is_active === 1).length;
    const moderate = usersList.filter(u => u.health_status === 'MODERATE' && u.is_active === 1).length;
    const inactive = usersList.filter(u => (u.health_status === 'INACTIVE' || u.health_status === 'NEW') && u.is_active === 1).length;
    const suspended = usersList.filter(u => u.is_active === 0).length;
    return { total, active, moderate, inactive, suspended };
  }, [usersList]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-xs text-foreground/60 font-medium">Cargando métricas de administración...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header user={currentUser} onUserUpdate={() => loadData(true)} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 pt-5 pb-28 sm:pb-32 space-y-4">
        {/* Top Header Banner */}
        <PageBanner
          icon={<Users className="w-5 h-5 text-primary" />}
          title="Monitoreo y Gestión de Usuarios"
          description="Supervisa la actividad real de tus clientes con privacidad ética, controla el cobro de mensualidades y administra cuentas."
          badgeText="ADMIN"
          actionText="Crear Cuenta de Cliente"
          onAction={() => setIsAddUserOpen(true)}
          actionIcon={<UserPlus className="w-4 h-4 stroke-[2.5px]" />}
        />

        {/* Ethical Privacy Notice */}
        <div className="bg-surface border border-primary/20 rounded-2xl p-3.5 sm:p-4 flex items-start gap-3 shadow-sm bg-gradient-to-r from-primary/5 via-transparent to-transparent">
          <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-xs text-foreground/80 space-y-1">
            <span className="font-bold text-primary block">Monitoreo Ético & Integridad Profesional</span>
            <p className="text-foreground/70 leading-relaxed">
              Por confidencialidad, este panel <strong>no muestra montos de dinero, saldos de cuentas ni detalles de transacciones privadas</strong>.
              Solo presenta <strong>conteos de configuración y frecuencia de uso</strong> para que verifiques si son usuarios activos o clientes al día con su servicio.
            </p>
          </div>
        </div>

        {/* Global Activity KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`p-3 rounded-2xl border text-left transition-all ${statusFilter === 'ALL' ? 'bg-primary/10 border-primary shadow-sm' : 'bg-surface border-border hover:border-border/80'}`}
          >
            <span className="text-[11px] font-semibold text-foreground/60 block">Total Usuarios</span>
            <span className="text-xl font-black text-foreground">{stats.total}</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('ACTIVE')}
            className={`p-3 rounded-2xl border text-left transition-all ${statusFilter === 'ACTIVE' ? 'bg-emerald-500/10 border-emerald-500 shadow-sm' : 'bg-surface border-border hover:border-border/80'}`}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-semibold text-emerald-400">Activos (&lt; 7d)</span>
            </div>
            <span className="text-xl font-black text-foreground">{stats.active}</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('MODERATE')}
            className={`p-3 rounded-2xl border text-left transition-all ${statusFilter === 'MODERATE' ? 'bg-amber-500/10 border-amber-500 shadow-sm' : 'bg-surface border-border hover:border-border/80'}`}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-[11px] font-semibold text-amber-400">Moderados (8-30d)</span>
            </div>
            <span className="text-xl font-black text-foreground">{stats.moderate}</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('INACTIVE')}
            className={`p-3 rounded-2xl border text-left transition-all ${statusFilter === 'INACTIVE' ? 'bg-rose-500/10 border-rose-500 shadow-sm' : 'bg-surface border-border hover:border-border/80'}`}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-[11px] font-semibold text-rose-400">Inactivos / Muertos</span>
            </div>
            <span className="text-xl font-black text-foreground">{stats.inactive}</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('SUSPENDED')}
            className={`col-span-2 sm:col-span-1 p-3 rounded-2xl border text-left transition-all ${statusFilter === 'SUSPENDED' ? 'bg-red-500/10 border-red-500 shadow-sm' : 'bg-surface border-border hover:border-border/80'}`}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <Power className="w-3 h-3 text-red-400" />
              <span className="text-[11px] font-semibold text-red-400">Suspendidos</span>
            </div>
            <span className="text-xl font-black text-foreground">{stats.suspended}</span>
          </button>
        </div>

        {/* Search Bar and Filters */}
        <div className="bg-surface border border-border rounded-2xl p-3 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-elevated border border-border text-foreground text-xs pl-9 pr-3 py-2 rounded-xl focus:border-primary focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => loadData(true)}
              icon={RefreshCw}
              disabled={refreshing}
            >
              {refreshing ? 'Actualizando...' : 'Refrescar'}
            </Button>
          </div>
        </div>

        {/* Users List Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-foreground/70 uppercase tracking-wider">
              Mostrando {filteredUsers.length} de {usersList.length} usuarios
            </span>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="bg-surface border border-border rounded-3xl p-10 text-center space-y-3">
              <Users className="w-10 h-10 text-foreground/20 mx-auto" />
              <p className="text-sm font-semibold text-foreground/70">No se encontraron usuarios con este filtro.</p>
              <Button variant="outline" size="sm" onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); }}>
                Restablecer filtros
              </Button>
            </div>
          ) : (
            filteredUsers.map((item) => {
              const isAdmin = item.role === 'ADMIN';
              const isSelf = item.id === currentUser?.id;
              const isSuspended = item.is_active === 0;

              return (
                <div
                  key={item.id}
                  className={`bg-surface border rounded-3xl p-4 sm:p-5 transition-all shadow-sm ${isSuspended
                      ? 'border-red-500/30 bg-red-500/5 opacity-80'
                      : isAdmin
                        ? 'border-primary/30'
                        : 'border-border hover:border-border/90'
                    }`}
                >
                  {/* User Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                    <div className="flex items-start sm:items-center gap-3">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${isAdmin
                          ? 'bg-primary/20 text-primary border border-primary/30'
                          : isSuspended
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-surface-elevated text-foreground/80 border border-border'
                        }`}>
                        {isAdmin ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-extrabold text-foreground">{item.name}</span>
                          {isSelf && (
                            <Badge variant="primary" size="sm">Tú</Badge>
                          )}
                          <Badge variant={isAdmin ? 'accent' : 'secondary'} size="sm">
                            {item.role}
                          </Badge>
                          {isSuspended ? (
                            <Badge variant="danger" size="sm">
                              <span className="flex items-center gap-1">
                                <Power className="w-2.5 h-2.5" />
                                Suspendido por Mensualidad
                              </span>
                            </Badge>
                          ) : (
                            <Badge variant="success" size="sm">
                              Al día (Activo)
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-foreground/50 mt-0.5 flex flex-wrap items-center gap-2">
                          <span>{item.email}</span>
                          <span>•</span>
                          <span>Registrado el {formatDateShort(item.created_at)}</span>
                        </p>
                      </div>
                    </div>

                    {/* Health & Last Activity Badge */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      {item.health_status === 'ACTIVE' && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-semibold text-emerald-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Activo ({formatRelativeTime(item.last_seen_at)})</span>
                        </div>
                      )}
                      {item.health_status === 'MODERATE' && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] font-semibold text-amber-400">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          <span>Moderado ({formatRelativeTime(item.last_seen_at)})</span>
                        </div>
                      )}
                      {item.health_status === 'INACTIVE' && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-[11px] font-semibold text-rose-400">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          <span>Inactivo ({formatRelativeTime(item.last_seen_at)})</span>
                        </div>
                      )}
                      {item.health_status === 'NEW' && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/80 border border-border text-[11px] font-semibold text-foreground/60">
                          <Sparkles className="w-3 h-3 text-primary" />
                          <span>Sin estrenar (Sin movimientos)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Operational Metrics (Counts & Activity Frequency) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-3.5">
                    {/* Groups / Categories */}
                    <div className="bg-surface-elevated/70 border border-border/70 rounded-2xl p-2.5">
                      <div className="flex items-center gap-1.5 text-foreground/50 text-[10px] font-bold uppercase mb-1">
                        <FolderTree className="w-3 h-3 text-primary" />
                        <span>Grupos / Categorías</span>
                      </div>
                      <span className="text-sm font-extrabold text-foreground">
                        {item.metrics.total_categories} <span className="text-xs font-normal text-foreground/50">creadas</span>
                      </span>
                    </div>

                    {/* Accounts / Payment Methods */}
                    <div className="bg-surface-elevated/70 border border-border/70 rounded-2xl p-2.5">
                      <div className="flex items-center gap-1.5 text-foreground/50 text-[10px] font-bold uppercase mb-1">
                        <Wallet className="w-3 h-3 text-primary" />
                        <span>Cuentas & Bolsillos</span>
                      </div>
                      <span className="text-sm font-extrabold text-foreground">
                        {item.metrics.total_payment_methods} <span className="text-xs font-normal text-foreground/50">ctas</span>
                        {item.metrics.total_pockets > 0 && (
                          <span className="text-xs text-foreground/50 font-normal"> ({item.metrics.total_pockets} bolsillos)</span>
                        )}
                      </span>
                    </div>

                    {/* Monthly Activity / Constant Movements */}
                    <div className="bg-surface-elevated/70 border border-border/70 rounded-2xl p-2.5">
                      <div className="flex items-center gap-1.5 text-foreground/50 text-[10px] font-bold uppercase mb-1">
                        <Activity className="w-3 h-3 text-emerald-400" />
                        <span>Mov. Últimos 30 días</span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-sm font-extrabold ${item.metrics.recent_movements_30d > 0 ? 'text-emerald-400' : 'text-foreground/40'}`}>
                          {item.metrics.recent_movements_30d}
                        </span>
                        <span className="text-[11px] text-foreground/50 font-medium">
                          ({item.metrics.total_movements} total)
                        </span>
                      </div>
                    </div>

                    {/* Last Movement Date */}
                    <div className="bg-surface-elevated/70 border border-border/70 rounded-2xl p-2.5">
                      <div className="flex items-center gap-1.5 text-foreground/50 text-[10px] font-bold uppercase mb-1">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>Último Movimiento</span>
                      </div>
                      <span className="text-xs font-bold text-foreground truncate block" title={item.latest_movement_at || 'Ninguno aún'}>
                        {item.latest_movement_at ? formatRelativeTime(item.latest_movement_at) : 'Ninguno registrado'}
                      </span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  {!isSelf && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/60">
                      <div className="text-[11px] text-foreground/50">
                        {isSuspended ? (
                          <span className="text-red-400 font-medium">🚫 Acceso bloqueado. No puede iniciar sesión.</span>
                        ) : (
                          <span className="text-foreground/50">Acceso concedido al sistema financiero.</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Password Reset */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={() => setUserToResetPassword(item)}
                          icon={KeyRound}
                          title="Restablecer contraseña del cliente"
                        >
                          Clave
                        </Button>

                        {/* Suspend / Reactivate for payments */}
                        <Button
                          type="button"
                          variant={isSuspended ? 'success' : 'danger'}
                          size="xs"
                          onClick={() => handleToggleStatus(item)}
                          icon={Power}
                          title={isSuspended ? 'Reactivar acceso al cliente' : 'Suspender acceso por falta de pago'}
                        >
                          {isSuspended ? 'Reactivar Acceso' : 'Suspender Acceso'}
                        </Button>

                        {/* Permanent Delete for test users */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={() => setUserToDelete(item)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          icon={Trash2}
                          title="Eliminar usuario y registros en cascada (Pruebas)"
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Modal: Crear Cuenta para Cliente / Amigo */}
      <Modal
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        title="Registrar Cuenta para Cliente o Amigo"
        icon={<UserPlus className="w-5 h-5 text-primary" />}
        size="md"
      >
        <form onSubmit={handleCreateFriend} className="space-y-3.5">
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
            <label className="block text-xs font-semibold text-foreground/80 mb-1">Correo Electrónico (Para Iniciar Sesión)</label>
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
                placeholder="Contraseña segura temporal"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface-elevated border border-border text-foreground text-xs pl-9 pr-3 py-2 rounded-xl focus:border-primary focus:outline-none font-mono"
                required
              />
            </div>
            <p className="text-[10px] text-foreground/50 mt-1">El cliente podrá cambiarla o usarla para ingresar en cualquier momento.</p>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddUserOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting} icon={UserPlus}>
              {isSubmitting ? 'Creando...' : 'Crear Usuario'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Resetear Contraseña */}
      <Modal
        isOpen={Boolean(userToResetPassword)}
        onClose={() => { setUserToResetPassword(null); setNewPassword(''); }}
        title={`Cambiar Contraseña: ${userToResetPassword?.name || ''}`}
        icon={<KeyRound className="w-5 h-5 text-primary" />}
        size="sm"
      >
        <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
          <p className="text-xs text-foreground/70">
            Establece una nueva contraseña para <strong>{userToResetPassword?.email}</strong> si el cliente la olvidó.
          </p>

          <div>
            <label className="block text-xs font-semibold text-foreground/80 mb-1">Nueva Contraseña</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Nueva clave"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-surface-elevated border border-border text-foreground text-xs pl-9 pr-3 py-2 rounded-xl focus:border-primary focus:outline-none font-mono"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => { setUserToResetPassword(null); setNewPassword(''); }}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isResettingPassword} icon={CheckCircle2}>
              {isResettingPassword ? 'Guardando...' : 'Actualizar Clave'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Confirmar Eliminación Permanente */}
      <Modal
        isOpen={Boolean(userToDelete)}
        onClose={() => setUserToDelete(null)}
        title="¿Eliminar usuario de prueba?"
        icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
        size="sm"
      >
        <div className="space-y-3.5">
          <p className="text-xs text-foreground/80 leading-relaxed">
            ¿Estás seguro de que deseas eliminar permanentemente la cuenta de <strong>{userToDelete?.name}</strong> ({userToDelete?.email})?
          </p>

          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-[11px] text-red-400 space-y-1">
            <span className="font-bold block">⚠️ Borrado en Cascada en Neon PostgreSQL</span>
            <p>
              Todos sus gastos, categorías, metas, cuentas de banco y préstamos vinculados se borrarán de forma definitiva. Esta acción no se puede deshacer.
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setUserToDelete(null)} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button type="button" variant="danger" size="sm" onClick={handleDeleteUser} disabled={isDeleting} icon={Trash2}>
              {isDeleting ? 'Eliminando...' : 'Sí, Eliminar Definitivamente'}
            </Button>
          </div>
        </div>
      </Modal>

      <BottomNav
        onOpenQuickExpense={() => setIsQuickExpenseOpen(true)}
        userRole={currentUser?.role}
      />
      <QuickExpenseModal
        isOpen={isQuickExpenseOpen}
        onClose={() => setIsQuickExpenseOpen(false)}
        onExpenseAdded={() => loadData(true)}
        categories={categories}
      />
    </div>
  );
}
