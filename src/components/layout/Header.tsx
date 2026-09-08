'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { LogOut, Wallet, User as UserIcon, Shield, Edit3, X, Check } from 'lucide-react';
import { formatCOP } from '@/lib/utils';
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
        toast.success('Saldo disponible actualizado');
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
    <header className="sticky top-0 z-40 bg-[#0B192C]/90 backdrop-blur-md border-b border-[#1E3A5F] px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00ADB5] to-[#06B6D4] flex items-center justify-center shadow-lg shadow-[#00ADB5]/20">
            <Wallet className="w-5 h-5 text-[#0B192C]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold tracking-tight text-white text-base">POSINNOVATE</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00ADB5]/20 text-[#00ADB5] font-semibold">FINANZAS</span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Control de Gastos & Presupuestos</p>
          </div>
        </Link>

        {/* User Info & Live Cash Pill */}
        {user && (
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Quick cash pill */}
            <div className="bg-[#102A43] border border-[#243B55] px-3 py-1.5 rounded-xl flex items-center gap-2">
              <Wallet className="w-4 h-4 text-[#00ADB5]" />
              <div className="text-right">
                <span className="block text-[10px] text-slate-400 font-medium leading-none">Saldo en Mano</span>
                {isEditingCash ? (
                  <div className="flex items-center gap-1 mt-0.5">
                    <input
                      type="number"
                      value={cashValue}
                      onChange={(e) => setCashValue(e.target.value)}
                      className="w-24 text-xs bg-[#0B192C] text-white border border-[#00ADB5] rounded px-1 py-0.5 focus:outline-none"
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
                    <span className="text-xs sm:text-sm font-bold text-white">{formatCOP(user.current_cash)}</span>
                    <button
                      onClick={() => {
                        setCashValue(user.current_cash.toString());
                        setIsEditingCash(true);
                      }}
                      className="text-slate-400 hover:text-[#00ADB5] transition-colors p-0.5"
                      title="Editar saldo real"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Profile badge */}
            <div className="hidden md:flex items-center gap-2 border-l border-[#243B55] pl-3">
              <div className="w-8 h-8 rounded-full bg-[#152E4D] border border-[#243B55] flex items-center justify-center text-slate-300">
                {user.role === 'ADMIN' ? <Shield className="w-4 h-4 text-[#00ADB5]" /> : <UserIcon className="w-4 h-4" />}
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-white leading-tight">{user.name}</p>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${user.role === 'ADMIN' ? 'text-[#00ADB5]' : 'text-slate-400'}`}>
                  {user.role === 'ADMIN' ? 'Admin' : 'Usuario'}
                </span>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
