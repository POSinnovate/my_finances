'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  LogOut,
  Wallet,
  Smartphone,
  Building2,
  CreditCard,
  Banknote,
  ArrowRight,
  Users,
  Menu,
  X,
  Check
} from 'lucide-react';
import { formatCOP } from '@/lib/utils';
import { toast } from 'sonner';
import { InstallPwaButton, InstallPwaModal } from './InstallPwaButton';
import { NotificationCenter } from './NotificationCenter';
import { usePaymentMethods, useInvalidateFinance } from '@/lib/api-hooks';
import { Modal, Button, Badge, Input } from '@/components/ui';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
  current_cash: number;
}

interface HeaderProps {
  user: UserData | null;
  onUserUpdate?: () => void;
}

export function Header({ user }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isEditingCash, setIsEditingCash] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // TanStack Query hooks for real-time payment methods and invalidation
  const { data: paymentMethods = [], refetch: refetchPaymentMethods } = usePaymentMethods();

  // Inline Calibration / Rebalance state for individual accounts
  const [calibratingMethodId, setCalibratingMethodId] = useState<string | null>(null);
  const [calibratingValue, setCalibratingValue] = useState<string>('');
  const [isSavingRebalance, setIsSavingRebalance] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isMobileMenuOpen) setIsMobileMenuOpen(false);
        if (isLogoutModalOpen) setIsLogoutModalOpen(false);
        if (isEditingCash) {
          setIsEditingCash(false);
          setCalibratingMethodId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen, isLogoutModalOpen, isEditingCash]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch {
      toast.error('Error al cerrar sesión');
      setIsLoggingOut(false);
    }
  };

  // Calculate dynamic cash fund from the actual accounts
  const totalCalculatedCash =
    paymentMethods.length > 0
      ? paymentMethods.reduce((acc: number, m: any) => acc + (m.net_balance ?? 0), 0)
      : (user?.current_cash || 0);

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border px-3 sm:px-4 py-2.5">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
        {/* Brand Logo & Name */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-linear-to-tr from-primary to-accent flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
            <Wallet className="w-4 h-4 text-background" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-black tracking-tight text-foreground text-sm sm:text-base">POSINNOVATE</span>
            <span className="text-[10px] text-primary font-semibold tracking-wider uppercase">
              Finanzas
            </span>
          </div>
        </Link>

        {/* Right Section: Mobile App Install, Available Fund Pill & Logout */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <div className="hidden sm:block">
            <InstallPwaButton onRequestModal={() => setIsInstallModalOpen(true)} />
          </div>

          {user ? (
            <>
              {/* Intelligent Notification Bell */}
              <NotificationCenter />

              {/* Dynamic Cash Fund Pill (Calculated from accounts) */}
              <button
                type="button"
                onClick={() => {
                  setCalibratingMethodId(null);
                  setIsEditingCash(true);
                }}
                className="group bg-surface-elevated hover:bg-secondary/60 border border-border hover:border-primary/50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer text-left shrink-0 shadow-sm"
                title="Click para ver el desglose de cuentas y equilibrar saldos"
              >
                <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[8px] sm:text-[9px] text-foreground/50 font-semibold uppercase tracking-wider leading-none">
                    Fondo
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-xs sm:text-sm font-black text-foreground group-hover:text-primary transition-colors leading-tight font-mono whitespace-nowrap">
                      {formatCOP(totalCalculatedCash)}
                    </span>
                  </div>
                </div>
              </button>

              {/* Admin Users Link (Desktop) */}
              {user.role === 'ADMIN' && (
                <Link
                  href="/admin/users"
                  className="hidden sm:flex p-1.5 sm:p-2 rounded-xl text-foreground/60 hover:text-purple-400 hover:bg-purple-500/10 border border-transparent hover:border-purple-500/20 transition-all shrink-0 cursor-pointer"
                  title="Administrar Usuarios / Amigos"
                >
                  <Users className="w-4 h-4" />
                </Link>
              )}

              {/* Logout button (Desktop) */}
              <button
                onClick={() => setIsLogoutModalOpen(true)}
                className="hidden sm:flex p-1.5 sm:p-2 rounded-xl text-foreground/60 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all shrink-0 cursor-pointer"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>

              {/* Mobile Menu Button (Shows Drawer) */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="sm:hidden p-2 rounded-xl text-foreground/80 hover:text-foreground bg-surface-elevated hover:bg-secondary/60 border border-border hover:border-primary/50 transition-all shrink-0 cursor-pointer shadow-sm"
                aria-label="Abrir menú"
              >
                <Menu className="w-4 h-4 text-primary" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-secondary/60 border border-border text-foreground/80 hover:text-foreground transition-colors whitespace-nowrap"
              >
                Ingresar
              </Link>
              <Link
                href="/register"
                className="text-xs font-black px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-background transition-colors whitespace-nowrap shadow-sm shadow-primary/20"
              >
                Registrarse
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={isLogoutModalOpen}
        onClose={() => !isLoggingOut && setIsLogoutModalOpen(false)}
        maxWidth="sm"
      >
        <div className="text-center py-2">
          {/* Warning Icon Badge */}
          <div className="w-14 h-14 rounded-2xl bg-danger/15 border border-danger/30 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-danger/10">
            <LogOut className="w-7 h-7 text-danger" />
          </div>

          <h3 className="text-lg font-black text-foreground">¿Cerrar Sesión?</h3>
          <p className="text-xs text-foreground/70 mt-2 leading-relaxed">
            Estás a punto de salir de tu panel financiero. Deberás volver a ingresar tus credenciales para acceder a tus movimientos y cuentas.
          </p>

          <div className="mt-6 flex items-center gap-2.5">
            <Button
              variant="secondary"
              onClick={() => setIsLogoutModalOpen(false)}
              disabled={isLoggingOut}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex-1"
            >
              {isLoggingOut ? 'Saliendo...' : 'Sí, Salir'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Account Breakdown & Rebalancing Modal */}
      <Modal
        isOpen={isEditingCash}
        onClose={() => {
          if (!isSavingRebalance) {
            setIsEditingCash(false);
            setCalibratingMethodId(null);
          }
        }}
        title="Desglose de Fondo Disponible"
        icon={<Wallet className="w-5 h-5 text-primary" />}
        description="Calculado dinámicamente según tus cuentas reales"
        maxWidth="lg"
      >
        {/* Total Balance Hero Card */}
        <div className="my-3 p-4 rounded-2xl bg-linear-to-r from-surface-elevated to-surface border border-accent/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-accent font-bold uppercase tracking-wider block">
              Fondo Disponible Total
            </span>
            <span className="text-2xl sm:text-3xl font-black text-foreground font-mono tracking-tight">
              {formatCOP(totalCalculatedCash)}
            </span>
          </div>
          <div className="text-right text-xs text-foreground/80">
            <span className="block font-semibold">{paymentMethods.length} cuentas sumadas</span>
            <span className="text-[10px] text-foreground/50">100% sincronizado</span>
          </div>
        </div>

        <p className="text-xs text-foreground/70 leading-relaxed mb-3">
          Tu saldo disponible ya no es un valor manual; es la <strong>suma viva de los balances</strong> de tus cuentas. Puedes calibrar o equilibrar cualquier cuenta aquí:
        </p>

        {/* Accounts List (Scrollable) */}
        <div className="overflow-y-auto space-y-2.5 pr-1 min-h-[140px] max-h-[300px]">
          {paymentMethods.map((pm: any) => {
            const IconComponent =
              pm.type === 'WALLET'
                ? Smartphone
                : pm.type === 'CASH'
                  ? Banknote
                  : pm.type === 'CARD'
                    ? CreditCard
                    : Building2;

            return (
              <div
                key={pm.id}
                className="p-3 rounded-2xl bg-surface-elevated/70 border border-border hover:border-accent/40 transition-all space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-background shrink-0"
                      style={{ backgroundColor: pm.color || '#00ADB5' }}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-foreground truncate">{pm.name}</h4>
                      <span className="text-[9px] text-foreground/50 uppercase font-semibold">
                        {pm.type === 'WALLET'
                          ? 'Billetera'
                          : pm.type === 'CASH'
                            ? 'Efectivo'
                            : pm.type === 'CARD'
                              ? 'Tarjeta'
                              : 'Banco'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-xs sm:text-sm font-black font-mono ${(pm.net_balance ?? 0) >= 0 ? 'text-accent' : 'text-danger'
                        }`}
                    >
                      {formatCOP(pm.net_balance ?? 0)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Navigation to Detailed Accounts Management */}
        <div className="pt-4 border-t border-border flex items-center justify-between gap-2 mt-3">
          <Link
            href="/accounts"
            onClick={() => {
              setIsEditingCash(false);
              setCalibratingMethodId(null);
            }}
            className="text-xs font-bold text-accent hover:text-accent/80 flex items-center gap-1.5 transition-colors"
          >
            <span>Administrar todas las cuentas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setIsEditingCash(false);
              setCalibratingMethodId(null);
            }}
          >
            Cerrar
          </Button>
        </div>
      </Modal>

      {/* Mobile Drawer Menu */}
      {mounted && isMobileMenuOpen && user && createPortal(
        <div className="fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-200 sm:hidden">
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-[82%] max-w-xs h-full bg-surface border-l border-border shadow-2xl flex flex-col p-5 overflow-y-auto animate-in slide-in-from-right duration-300 z-10"
          >
            {/* Header: User Profile & Close */}
            <div className="flex items-start justify-between gap-3 pt-2 pb-4 border-b border-border">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-primary to-accent flex items-center justify-center font-black text-background text-sm shrink-0 shadow-md shadow-primary/20">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-sm font-black text-foreground truncate max-w-[130px]">{user.name}</h3>
                    <Badge variant={user.role === 'ADMIN' ? 'accent' : 'secondary'} size="sm">
                      {user.role}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-foreground/60 truncate max-w-[150px]">{user.email}</p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Cerrar menú"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Action Items */}
            <div className="py-4 space-y-2.5 flex-1">
              <span className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider block px-1">
                Opciones
              </span>

              {/* Botón de Descargar App Móvil */}
              <InstallPwaButton
                variant="full"
                onRequestModal={() => {
                  setIsMobileMenuOpen(false);
                  setIsInstallModalOpen(true);
                }}
                onClicked={() => setIsMobileMenuOpen(false)}
              />

              {/* Botón de Usuarios (Exclusivo Administrador) */}
              {user.role === 'ADMIN' && (
                <Link
                  href="/admin/users"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-surface-elevated hover:bg-secondary/60 border border-border text-foreground text-xs font-bold transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <span className="block font-black text-foreground text-xs">Gestión de Usuarios</span>
                      <span className="block text-[10px] text-foreground/60">Amigos, accesos y roles</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-foreground/40 group-hover:text-foreground transition-colors" />
                </Link>
              )}

              {/* Desglose de Fondos y Cuentas */}
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsEditingCash(true);
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-surface-elevated hover:bg-secondary/60 border border-border text-foreground text-xs font-bold transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="block font-black text-foreground text-xs">Desglose de Fondo</span>
                    <span className="block text-[10px] text-accent font-mono font-bold">{formatCOP(totalCalculatedCash)}</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-foreground/40 group-hover:text-accent transition-colors" />
              </button>
            </div>

            {/* Bottom: Cerrar Sesión */}
            <div className="pt-4 border-t border-border mt-auto">
              <Button
                variant="danger"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsLogoutModalOpen(true);
                }}
                fullWidth
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión</span>
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Standalone PWA Guide / Install Modal */}
      <InstallPwaModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />
    </header>
  );
}
