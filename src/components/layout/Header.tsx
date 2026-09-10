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
      if (e.key === 'Escape' && isLogoutModalOpen) {
        setIsLogoutModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLogoutModalOpen]);

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

              {/* Live Cash Fund Pill */}
              <div className="bg-[#102A43] border border-[#243B55] px-2.5 py-1 rounded-xl flex items-center gap-1.5 sm:gap-2 shrink-0">
                <div className="w-2 h-2 rounded-full bg-[#00ADB5] animate-pulse shrink-0" />
                <div className="text-right">
                  <span className="block text-[9px] text-slate-400 font-medium leading-none">Fondo Disponible</span>
                  {isEditingCash ? (
                    <div className="flex items-center gap-1 mt-0.5">
                      <input
                        type="number"
                        value={cashValue}
                        onChange={(e) => setCashValue(e.target.value)}
                        className="w-20 text-xs bg-[#0B192C] text-white border border-[#00ADB5] rounded px-1 py-0.5 focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={handleUpdateCash}
                        disabled={isUpdating}
                        className="p-0.5 text-emerald-400 hover:text-emerald-300"
                        title="Guardar"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setIsEditingCash(false)}
                        className="p-0.5 text-rose-400 hover:text-rose-300"
                        title="Cancelar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-xs sm:text-sm font-black text-white">
                        {formatCOP(user.current_cash)}
                      </span>
                      <button
                        onClick={() => {
                          setCashValue(user.current_cash?.toString() || '0');
                          setIsEditingCash(true);
                        }}
                        className="text-slate-400 hover:text-[#00ADB5] transition-colors p-0.5"
                        title="Ajustar fondo manualmente"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

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
    </header>
  );
}
