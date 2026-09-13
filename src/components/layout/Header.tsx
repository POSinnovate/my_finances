'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { 
  LogOut, 
  Wallet, 
  Edit3, 
  X, 
  Check, 
  SlidersHorizontal, 
  Smartphone, 
  Building2, 
  CreditCard, 
  Banknote, 
  ArrowRight,
  Plus,
  Users,
  Menu
} from 'lucide-react';
import { formatCOP } from '@/lib/utils';
import { toast } from 'sonner';
import { InstallPwaButton } from './InstallPwaButton';
import { NotificationCenter } from './NotificationCenter';
import { usePaymentMethods, useInvalidateFinance } from '@/lib/api-hooks';

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

export function Header({ user, onUserUpdate }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isEditingCash, setIsEditingCash] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mounted, setMounted] = useState(false);

  // TanStack Query hooks for real-time payment methods and invalidation
  const { data: paymentMethods = [], refetch: refetchPaymentMethods } = usePaymentMethods();
  const invalidateFinance = useInvalidateFinance();

  // Inline Calibration / Rebalance state for individual accounts
  const [calibratingMethodId, setCalibratingMethodId] = useState<string | null>(null);
  const [calibratingValue, setCalibratingValue] = useState<string>('');
  const [isSavingRebalance, setIsSavingRebalance] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Start inline calibration for a method
  const handleStartCalibrate = (pm: any) => {
    setCalibratingMethodId(pm.id);
    setCalibratingValue(
      pm.net_balance !== undefined ? String(pm.net_balance) : (pm.initial_balance ? String(pm.initial_balance) : '0')
    );
  };

  // Save the new calibrated balance of a payment method
  const handleSaveRebalance = async (pmId: string, pmName: string) => {
    const parsed = Number(calibratingValue);
    if (isNaN(parsed)) {
      toast.error('Ingresa un monto numérico válido');
      return;
    }

    setIsSavingRebalance(true);
    try {
      const res = await fetch('/api/payment-methods', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: pmId,
          target_balance: parsed,
        }),
      });

      if (res.ok) {
        toast.success(`Saldo de "${pmName}" equilibrado a ${formatCOP(parsed)}`);
        setCalibratingMethodId(null);
        await refetchPaymentMethods();
        invalidateFinance();
        if (onUserUpdate) onUserUpdate();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Error al calibrar saldo');
      }
    } catch {
      toast.error('Error de red al calibrar saldo');
    } finally {
      setIsSavingRebalance(false);
    }
  };

  // Consolidated total cash across all methods (or fallback to user.current_cash)
  const totalCalculatedCash =
    paymentMethods.length > 0
      ? paymentMethods.reduce((acc: number, pm: any) => acc + (Number(pm.net_balance) || 0), 0)
      : (user?.current_cash || 0);

  return (
    <header className="sticky top-0 z-40 bg-[#0B192C]/95 backdrop-blur-md border-b border-[#1E3A5F] px-3 sm:px-4 py-2.5">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
        {/* Brand Logo & Name */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-linear-to-tr from-[#00ADB5] to-[#06B6D4] flex items-center justify-center shadow-md shadow-[#00ADB5]/20 shrink-0">
            <Wallet className="w-4 h-4 text-[#0B192C]" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-black tracking-tight text-white text-sm sm:text-base">POSINNOVATE</span>
            <span className="text-[10px] text-[#00ADB5] font-semibold tracking-wider uppercase">
              Finanzas
            </span>
          </div>
        </Link>

        {/* Right Section: Mobile App Install, Available Fund Pill & Logout */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <div className="hidden sm:block">
            <InstallPwaButton />
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
                className="group bg-[#102A43] hover:bg-[#152E4D] border border-[#243B55] hover:border-[#00ADB5]/50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer text-left shrink-0 shadow-sm"
                title="Click para ver el desglose de cuentas y equilibrar saldos"
              >
                <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00ADB5]" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[8px] sm:text-[9px] text-slate-400 font-semibold uppercase tracking-wider leading-none">
                    Fondo
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-xs sm:text-sm font-black text-white group-hover:text-[#00ADB5] transition-colors leading-tight font-mono whitespace-nowrap">
                      {formatCOP(totalCalculatedCash)}
                    </span>
                  </div>
                </div>
              </button>

              {/* Admin Users Link (Desktop) */}
              {user.role === 'ADMIN' && (
                <Link
                  href="/admin/users"
                  className="hidden sm:flex p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 border border-transparent hover:border-purple-500/20 transition-all shrink-0 cursor-pointer"
                  title="Administrar Usuarios / Amigos"
                >
                  <Users className="w-4 h-4" />
                </Link>
              )}

              {/* Logout button (Desktop) */}
              <button
                onClick={() => setIsLogoutModalOpen(true)}
                className="hidden sm:flex p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all shrink-0 cursor-pointer"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>

              {/* Mobile Menu Button (Shows Drawer) */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="sm:hidden p-2 rounded-xl text-slate-300 hover:text-white bg-[#102A43] hover:bg-[#152E4D] border border-[#243B55] hover:border-[#00ADB5]/50 transition-all shrink-0 cursor-pointer shadow-sm"
                aria-label="Abrir menú"
              >
                <Menu className="w-4 h-4 text-[#00ADB5]" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-[#102A43] hover:bg-[#152E4D] border border-[#243B55] text-slate-200 hover:text-white transition-colors whitespace-nowrap"
              >
                Ingresar
              </Link>
              <Link
                href="/register"
                className="text-xs font-black px-3 py-1.5 rounded-xl bg-[#00ADB5] hover:bg-[#06B6D4] text-[#0B192C] transition-colors whitespace-nowrap shadow-sm shadow-[#00ADB5]/20"
              >
                Registrarse
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Logout Confirmation Modal rendered in document.body via Portal */}
      {isLogoutModalOpen && mounted && typeof document !== 'undefined' && createPortal(
        <div 
          onClick={() => !isLoggingOut && setIsLogoutModalOpen(false)}
          className="fixed inset-0 z-99999 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-[#0B192C] border border-[#1E3A5F] rounded-3xl p-6 shadow-2xl relative overflow-hidden text-center animate-in zoom-in-95 duration-150 mx-auto"
          >
            {/* Top Accent Glow */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-linear-to-r from-rose-500 via-red-500 to-amber-500" />

            {/* Warning Icon Badge */}
            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/10">
              <LogOut className="w-7 h-7 text-rose-400" />
            </div>

            {/* Title & Warning Text */}
            <h3 className="text-lg font-black text-white">¿Cerrar Sesión?</h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Estás a punto de salir de tu panel financiero. Deberás volver a ingresar tus credenciales para acceder a tus movimientos y cuentas.
            </p>

            {/* Action Buttons */}
            <div className="mt-6 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                disabled={isLoggingOut}
                className="flex-1 py-2.5 rounded-xl bg-[#102A43] hover:bg-[#152E4D] border border-[#243B55] text-xs font-bold text-slate-300 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex-1 py-2.5 rounded-xl bg-linear-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isLoggingOut ? (
                  <span>Saliendo...</span>
                ) : (
                  <>
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sí, Salir</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Account Breakdown & Rebalancing Modal rendered via Portal */}
      {isEditingCash && mounted && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => {
            if (!isSavingRebalance) {
              setIsEditingCash(false);
              setCalibratingMethodId(null);
            }
          }}
          className="fixed inset-0 z-99999 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#0B192C] border border-[#1E3A5F] rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-150 mx-auto flex flex-col max-h-[90vh]"
          >
            {/* Top Accent Glow */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-linear-to-r from-[#00ADB5] via-[#06B6D4] to-emerald-400" />

            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#1E3A5F]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#00ADB5]/15 border border-[#00ADB5]/30 flex items-center justify-center text-[#00ADB5] shadow-lg shadow-[#00ADB5]/10 shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">Desglose de Fondo Disponible</h3>
                  <p className="text-xs text-slate-400">Calculado dinámicamente según tus cuentas reales</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditingCash(false);
                  setCalibratingMethodId(null);
                }}
                disabled={isSavingRebalance}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#102A43] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Total Balance Hero Card */}
            <div className="my-4 p-4 rounded-2xl bg-linear-to-r from-[#102A43] to-[#0B192C] border border-cyan-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">
                  Fondo Disponible Total
                </span>
                <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                  {formatCOP(totalCalculatedCash)}
                </span>
              </div>
              <div className="text-right text-xs text-slate-300">
                <span className="block font-semibold">{paymentMethods.length} cuentas sumadas</span>
                <span className="text-[10px] text-slate-400">100% sincronizado</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              Tu saldo disponible ya no es un valor manual; es la <strong>suma viva de los balances</strong> de tus cuentas. Puedes calibrar o equilibrar cualquier cuenta aquí:
            </p>

            {/* Accounts List (Scrollable) */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[140px] max-h-[300px]">
              {paymentMethods.map((pm: any) => {
                const isCalibrating = calibratingMethodId === pm.id;
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
                    className="p-3 rounded-2xl bg-[#102A43]/50 border border-[#1E3A5F] hover:border-cyan-500/40 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0"
                          style={{ backgroundColor: pm.color || '#00ADB5' }}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-black text-white truncate">{pm.name}</h4>
                          <span className="text-[9px] text-slate-400 uppercase font-semibold">
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
                          className={`text-xs sm:text-sm font-black font-mono ${
                            (pm.net_balance ?? 0) >= 0 ? 'text-cyan-400' : 'text-rose-400'
                          }`}
                        >
                          {formatCOP(pm.net_balance ?? 0)}
                        </span>

                        {!isCalibrating && (
                          <button
                            type="button"
                            onClick={() => handleStartCalibrate(pm)}
                            className="p-1.5 rounded-lg bg-[#0B192C] hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-[#243B55] hover:border-cyan-500/40 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                            title="Equilibrar o calibrar saldo"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Calibrar</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inline Calibration Form */}
                    {isCalibrating && (
                      <div className="pt-2 border-t border-[#1E3A5F] space-y-2 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-cyan-300">
                            ¿Cuál es tu saldo real en {pm.name} hoy?
                          </label>
                          {calibratingValue !== '' && !isNaN(Number(calibratingValue)) && (
                            <span className="text-[10px] text-cyan-400 font-mono font-bold">
                              {formatCOP(Number(calibratingValue))}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={calibratingValue}
                            onChange={(e) => setCalibratingValue(e.target.value)}
                            placeholder="0"
                            autoFocus
                            className="flex-1 bg-[#0B192C] border border-cyan-500/50 text-white text-xs px-3 py-1.5 rounded-xl focus:outline-none font-mono font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRebalance(pm.id, pm.name)}
                            disabled={isSavingRebalance}
                            className="px-3 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs flex items-center gap-1 transition-all disabled:opacity-50 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3px]" />
                            <span>{isSavingRebalance ? 'Guardando...' : 'Aplicar'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setCalibratingMethodId(null)}
                            disabled={isSavingRebalance}
                            className="px-2.5 py-1.5 rounded-xl bg-[#0B192C] hover:bg-[#1E3A5F] text-slate-400 hover:text-white text-xs transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer Navigation to Detailed Accounts Management */}
            <div className="pt-4 border-t border-[#1E3A5F] flex items-center justify-between gap-2 mt-auto">
              <Link
                href="/budgets?tab=PAYMENT_METHODS"
                onClick={() => {
                  setIsEditingCash(false);
                  setCalibratingMethodId(null);
                }}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 transition-colors"
              >
                <span>Administrar todas las cuentas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => {
                  setIsEditingCash(false);
                  setCalibratingMethodId(null);
                }}
                className="px-4 py-2 rounded-xl bg-[#102A43] hover:bg-[#152E4D] border border-[#243B55] text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Mobile Drawer Menu (Slide over from right to left) */}
      {isMobileMenuOpen && mounted && typeof document !== 'undefined' && user && createPortal(
        <div className="fixed inset-0 z-99998 flex justify-end animate-in fade-in duration-200 sm:hidden">
          {/* Backdrop */}
          <div 
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Drawer Container */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative w-[82%] max-w-xs h-full bg-[#0B192C] border-l border-[#1E3A5F] shadow-2xl flex flex-col p-5 overflow-y-auto animate-in slide-in-from-right duration-300 z-10"
          >
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-linear-to-r from-[#00ADB5] via-[#06B6D4] to-purple-500" />

            {/* Header: User Profile & Close */}
            <div className="flex items-start justify-between gap-3 pt-2 pb-4 border-b border-[#1E3A5F]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-[#00ADB5] to-[#06B6D4] flex items-center justify-center font-black text-[#0B192C] text-sm shrink-0 shadow-md shadow-[#00ADB5]/20">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-sm font-black text-white truncate max-w-[130px]">{user.name}</h3>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${
                      user.role === 'ADMIN'
                        ? 'bg-purple-950/60 border-purple-500/40 text-purple-300'
                        : 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300'
                    }`}>
                      {user.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate max-w-[150px]">{user.email}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#102A43] border border-transparent hover:border-[#243B55] transition-colors cursor-pointer shrink-0"
                aria-label="Cerrar menú"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Action Items */}
            <div className="py-4 space-y-2.5 flex-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1">
                Opciones
              </span>

              {/* Botón de Descargar App Móvil */}
              <InstallPwaButton 
                variant="full" 
                onClicked={() => setIsMobileMenuOpen(false)} 
              />

              {/* Botón de Usuarios (Exclusivo Administrador) */}
              {user.role === 'ADMIN' && (
                <Link
                  href="/admin/users"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#102A43] hover:bg-purple-950/30 border border-[#243B55] hover:border-purple-500/40 text-white text-xs font-bold transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <span className="block font-black text-white text-xs">Gestión de Usuarios</span>
                      <span className="block text-[10px] text-purple-300">Amigos, accesos y roles</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-400 transition-colors" />
                </Link>
              )}

              {/* Desglose de Fondos y Cuentas */}
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsEditingCash(true);
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#102A43] hover:bg-cyan-950/30 border border-[#243B55] hover:border-[#00ADB5]/40 text-white text-xs font-bold transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="block font-black text-white text-xs">Desglose de Fondo</span>
                    <span className="block text-[10px] text-cyan-300 font-mono font-bold">{formatCOP(totalCalculatedCash)}</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
              </button>
            </div>

            {/* Bottom: Cerrar Sesión */}
            <div className="pt-4 border-t border-[#1E3A5F] mt-auto">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsLogoutModalOpen(true);
                }}
                className="w-full py-3 px-4 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
