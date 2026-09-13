'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Receipt, 
  Layers,
  Plus, 
  HandCoins, 
  Target,
  Wallet
} from 'lucide-react';

interface BottomNavProps {
  onOpenQuickExpense: () => void;
  userRole?: 'ADMIN' | 'USER';
}

export function BottomNav({ onOpenQuickExpense }: BottomNavProps) {
  const pathname = usePathname();
  const [currentSearch, setCurrentSearch] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentSearch(window.location.search);
      const handlePop = () => setCurrentSearch(window.location.search);
      window.addEventListener('popstate', handlePop);
      return () => window.removeEventListener('popstate', handlePop);
    }
  }, [pathname]);

  const leftNavItems = [
    { label: 'Inicio', href: '/', icon: LayoutDashboard },
    { label: 'Movs', href: '/expenses', icon: Receipt },
    { label: 'Grupos', href: '/budgets', icon: Layers },
  ];

  const rightNavItems = [
    { label: 'Préstamos', href: '/loans', icon: HandCoins },
    { label: 'Metas', href: '/goals', icon: Target },
    { label: 'Cuentas', href: '/accounts', icon: Wallet },
  ];

  const isItemActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0B192C]/95 backdrop-blur-xl border-t border-[#1E3A5F] px-1 py-1.5 pb-[calc(0.4rem+env(safe-area-inset-bottom,0px))] shadow-2xl">
      <div className="max-w-lg mx-auto grid grid-cols-7 items-center gap-0.5">
        {/* Left 3 items: Inicio, Movs, Grupos */}
        {leftNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = isItemActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
                isActive ? 'text-[#00ADB5] font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-4.5 h-4.5 sm:w-5 sm:h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              <span className="text-[9px] sm:text-[10px] mt-0.5 tracking-tight truncate max-w-[46px] sm:max-w-[58px] text-center">
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Center Action Button (Protruding Upwards, Exact 50% Center) */}
        <div className="flex justify-center items-center">
          <button
            onClick={onOpenQuickExpense}
            className="flex flex-col items-center justify-center -mt-5 group focus:outline-none cursor-pointer"
            title="Registrar Ingreso o Egreso"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-linear-to-tr from-[#00ADB5] to-[#06B6D4] text-[#0B192C] flex items-center justify-center shadow-lg shadow-[#00ADB5]/35 group-active:scale-95 transition-transform border-2 border-[#0B192C]">
              <Plus className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3px]" />
            </div>
            <span className="text-[9px] sm:text-[10px] font-extrabold text-[#00ADB5] mt-0.5">
              Registrar
            </span>
          </button>
        </div>

        {/* Right 3 items: Préstamos, Metas, Cuentas */}
        {rightNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = isItemActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
                isActive ? 'text-[#00ADB5] font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-4.5 h-4.5 sm:w-5 sm:h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              <span className="text-[9px] sm:text-[10px] mt-0.5 tracking-tight truncate max-w-[48px] sm:max-w-[58px] text-center">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
