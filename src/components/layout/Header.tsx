'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { LogOut, Wallet, Edit3, X, Check, Shield } from 'lucide-react';
import { formatCOP } from '@/lib/utils';
import { toast } from 'sonner';
import { InstallPwaButton } from './InstallPwaButton';

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

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch {
      toast.error('Error al cerrar sesión');
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
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00ADB5] to-[#06B6D4] flex items-center justify-center shadow-md shadow-[#00ADB5]/20 shrink-0">
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

          {user && (
            <>
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

              {/* Role Badge (Desktop) */}
              {user.role === 'ADMIN' && (
                <div className="hidden sm:flex items-center gap-1 bg-[#00ADB5]/10 border border-[#00ADB5]/30 px-2 py-1 rounded-lg">
                  <Shield className="w-3 h-3 text-[#00ADB5]" />
                  <span className="text-[10px] font-bold text-[#00ADB5]">ADMIN</span>
                </div>
              )}

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all shrink-0"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
