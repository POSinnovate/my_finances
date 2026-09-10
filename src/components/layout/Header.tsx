'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { LogOut, Wallet, Edit3, X, Check } from 'lucide-react';
import { formatCOP } from '@/lib/utils';
import { toast } from 'sonner';
import { InstallPwaButton } from './InstallPwaButton';
import { NotificationCenter } from './NotificationCenter';

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
  const [isEditingCash, setIsEditingCash] = useState(false);
  const [cashValue, setCashValue] = useState(user?.current_cash?.toString() || '0');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isLogoutModalOpen) setIsLogoutModalOpen(false);
        if (isEditingCash) setIsEditingCash(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLogoutModalOpen, isEditingCash]);

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

  const handleUpdateCash = async () => {
    const parsed = Number(cashValue);
    if (isNaN(parsed) || parsed < 0) {
      toast.error('Ingresa un monto válido');
      return;
    }
    setIsUpdating(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_cash: parsed }),
      });
      if (res.ok) {
        toast.success('Fondo disponible actualizado');
        setIsEditingCash(false);
        if (onUserUpdate) onUserUpdate();
      } else {
        toast.error('Error actualizando saldo');
      }
    } catch {
      toast.error('Error de red');
    } finally {
      setIsUpdating(false);
    }
  };

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
          <InstallPwaButton />

          {user ? (
            <>
              {/* Intelligent Notification Bell */}
              <NotificationCenter />

              {/* Clean, Breathable Live Cash Fund Pill */}
              <button
                type="button"
                onClick={() => {
                  setCashValue(user.current_cash?.toString() || '0');
                  setIsEditingCash(true);
                }}
                className="group bg-[#102A43] hover:bg-[#152E4D] border border-[#243B55] hover:border-[#00ADB5]/50 px-2.5 sm:px-3 py-1.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer text-left shrink-0 shadow-sm"
                title="Click para ajustar fondo disponible"
              >
                <div className="w-7 h-7 rounded-lg bg-[#00ADB5]/10 border border-[#00ADB5]/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Wallet className="w-3.5 h-3.5 text-[#00ADB5]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider leading-none">
                    Fondo Disponible
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs sm:text-sm font-black text-white group-hover:text-[#00ADB5] transition-colors leading-tight">
                      {formatCOP(user.current_cash)}
                    </span>
                    <Edit3 className="w-3 h-3 text-slate-500 group-hover:text-[#00ADB5] transition-colors shrink-0" />
                  </div>
                </div>
              </button>

              {/* Logout button */}
              <button
                onClick={() => setIsLogoutModalOpen(true)}
                className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all shrink-0"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
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

      {/* Cash Adjustment Modal rendered via Portal */}
      {isEditingCash && mounted && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => !isUpdating && setIsEditingCash(false)}
          className="fixed inset-0 z-99999 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#0B192C] border border-[#1E3A5F] rounded-3xl p-6 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-150 mx-auto"
          >
            {/* Top Accent Glow */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-linear-to-r from-[#00ADB5] via-[#06B6D4] to-emerald-400" />

            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#00ADB5]/15 border border-[#00ADB5]/30 flex items-center justify-center text-[#00ADB5] shadow-lg shadow-[#00ADB5]/10 shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Ajustar Fondo Disponible</h3>
                  <p className="text-xs text-slate-400">Actualiza tu saldo real actual</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingCash(false)}
                disabled={isUpdating}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#102A43] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Indica el saldo real con el que cuentas hoy entre cuentas y efectivo. El sistema lo utilizará para recalcular tu gasto diario seguro y tus días de cobertura financiera.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateCash();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nuevo Saldo Disponible (COP)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={cashValue}
                    onChange={(e) => setCashValue(e.target.value)}
                    className="w-full bg-[#102A43] border border-[#243B55] focus:border-[#00ADB5] rounded-xl pl-8 pr-3.5 py-2.5 text-sm font-black text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#00ADB5] transition-all"
                    placeholder="0"
                    autoFocus
                    required
                  />
                </div>
                {/* Live Formatted COP Preview */}
                <div className="mt-2 flex items-center justify-between text-xs px-1">
                  <span className="text-slate-400">Monto formateado:</span>
                  <span className="font-black text-[#00ADB5]">
                    {formatCOP(Number(cashValue) || 0)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingCash(false)}
                  disabled={isUpdating}
                  className="flex-1 py-2.5 rounded-xl bg-[#102A43] hover:bg-[#152E4D] border border-[#243B55] text-xs font-bold text-slate-300 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 py-2.5 rounded-xl bg-linear-to-r from-[#00ADB5] to-[#06B6D4] hover:opacity-95 text-[#0B192C] text-xs font-black shadow-lg shadow-[#00ADB5]/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isUpdating ? (
                    <span>Guardando...</span>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3px]" />
                      <span>Actualizar Fondo</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
