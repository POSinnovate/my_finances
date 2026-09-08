'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Receipt, PieChart, Target, Users, Plus } from 'lucide-react';

interface BottomNavProps {
  onOpenQuickExpense: () => void;
  userRole?: 'ADMIN' | 'USER';
}

export function BottomNav({ onOpenQuickExpense, userRole }: BottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Inicio', href: '/', icon: LayoutDashboard },
    { label: 'Gastos', href: '/expenses', icon: Receipt },
    { label: 'Presupuesto', href: '/budgets', icon: PieChart },
    { label: 'Metas', href: '/goals', icon: Target },
  ];

  if (userRole === 'ADMIN') {
    navItems.push({ label: 'Amigos', href: '/admin/users', icon: Users });
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0B192C]/95 backdrop-blur-lg border-t border-[#1E3A5F] px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
      <div className="max-w-md mx-auto flex items-center justify-around relative">
        {navItems.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                isActive ? 'text-[#00ADB5] font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              <span className="text-[10px] mt-1">{item.label}</span>
            </Link>
          );
        })}

        {/* Center Quick Expense Floating Button */}
        <button
          onClick={onOpenQuickExpense}
          className="flex flex-col items-center justify-center -mt-5 group"
          title="Registrar Gasto Rápido"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#00ADB5] to-[#06B6D4] text-[#0B192C] flex items-center justify-center shadow-lg shadow-[#00ADB5]/40 group-active:scale-95 transition-transform">
            <Plus className="w-7 h-7 stroke-[3px]" />
          </div>
          <span className="text-[10px] font-bold text-[#00ADB5] mt-1">Registrar</span>
        </button>

        {navItems.slice(2).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                isActive ? 'text-[#00ADB5] font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              <span className="text-[10px] mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
