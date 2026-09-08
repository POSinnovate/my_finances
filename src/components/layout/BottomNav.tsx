'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Receipt, PieChart, Target, Plus } from 'lucide-react';

interface BottomNavProps {
  onOpenQuickExpense: () => void;
  userRole?: 'ADMIN' | 'USER';
}

export function BottomNav({ onOpenQuickExpense }: BottomNavProps) {
  const pathname = usePathname();

  const leftNavItems = [
    { label: 'Inicio', href: '/', icon: LayoutDashboard },
    { label: 'Movimientos', href: '/expenses', icon: Receipt },
  ];

  const rightNavItems = [
    { label: 'Fijos & Grupos', href: '/budgets', icon: PieChart },
    { label: 'Metas', href: '/goals', icon: Target },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0B192C]/95 backdrop-blur-xl border-t border-[#1E3A5F] px-2 py-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] shadow-2xl">
      <div className="max-w-md mx-auto grid grid-cols-5 items-center">
        {/* Left 2 items */}
        {leftNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
                isActive ? 'text-[#00ADB5] font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[65px] text-center">
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Center Action Button */}
        <div className="flex justify-center items-center">
          <button
            onClick={onOpenQuickExpense}
            className="flex flex-col items-center justify-center -mt-5 group focus:outline-none"
            title="Registrar Ingreso o Egreso"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#00ADB5] to-[#06B6D4] text-[#0B192C] flex items-center justify-center shadow-lg shadow-[#00ADB5]/35 group-active:scale-95 transition-transform">
              <Plus className="w-6 h-6 stroke-[3px]" />
            </div>
            <span className="text-[10px] font-extrabold text-[#00ADB5] mt-0.5">
              Registrar
            </span>
          </button>
        </div>

        {/* Right 2 items */}
        {rightNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
                isActive ? 'text-[#00ADB5] font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[70px] text-center">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
