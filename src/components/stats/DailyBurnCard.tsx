'use client';

import React from 'react';
import { AlertTriangle, ShieldCheck, Flame, Calendar, Info } from 'lucide-react';
import { formatCOP } from '@/lib/utils';

interface HealthData {
  safeDailySpend: number;
  dailyBurnAverage: number;
  daysRemaining: number;
  daysOfCashRemaining: number;
  statusLevel: 'CRITICAL' | 'WARNING' | 'HEALTHY';
  message: string;
}

interface DailyBurnCardProps {
  health: HealthData;
  currentCash: number;
}

export function DailyBurnCard({ health, currentCash }: DailyBurnCardProps) {
  const isCritical = health.statusLevel === 'CRITICAL';
  const isWarning = health.statusLevel === 'WARNING';

  const borderColor = isCritical
    ? 'border-rose-500/50 bg-rose-950/20'
    : isWarning
    ? 'border-amber-500/50 bg-amber-950/20'
    : 'border-[#00ADB5]/50 bg-[#102A43]/60';

  const statusBadge = isCritical ? (
    <span className="flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/20 px-2.5 py-1 rounded-full border border-rose-500/30">
      <AlertTriangle className="w-3.5 h-3.5" /> Estado Crítico
    </span>
  ) : isWarning ? (
    <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/20 px-2.5 py-1 rounded-full border border-amber-500/30">
      <AlertTriangle className="w-3.5 h-3.5" /> Gasto Ajustado
    </span>
  ) : (
    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-500/30">
      <ShieldCheck className="w-3.5 h-3.5" /> Control Estable
    </span>
  );

  return (
    <div className={`rounded-3xl border ${borderColor} p-5 shadow-xl backdrop-blur-md relative overflow-hidden`}>
      {/* Glow highlight */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-[#00ADB5]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#152E4D] border border-[#243B55] flex items-center justify-center text-[#00ADB5]">
            <Flame className="w-4 h-4 text-[#00ADB5]" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Gasto Diario Seguro</span>
        </div>
        {statusBadge}
      </div>

      {/* Hero Metric */}
      <div className="mt-2 mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {formatCOP(health.safeDailySpend)}
          </span>
          <span className="text-sm font-semibold text-slate-400">/ día</span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Límite máximo diario para que tu saldo de {formatCOP(currentCash)} te alcance hasta el próximo pago.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-3 border-t border-[#243B55]">
        <div className="bg-[#0B192C]/70 border border-[#243B55] rounded-xl p-2.5">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
            <Calendar className="w-3.5 h-3.5 text-[#06B6D4]" />
            <span className="text-[10px] font-medium uppercase">Días Restantes</span>
          </div>
          <span className="text-sm font-bold text-white">{health.daysRemaining} días</span>
        </div>

        <div className="bg-[#0B192C]/70 border border-[#243B55] rounded-xl p-2.5">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-[10px] font-medium uppercase">Ritmo Actual</span>
          </div>
          <span className="text-sm font-bold text-white">{formatCOP(health.dailyBurnAverage)}/día</span>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-[#0B192C]/70 border border-[#243B55] rounded-xl p-2.5">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
            <Info className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] font-medium uppercase">Autonomía</span>
          </div>
          <span className="text-sm font-bold text-white">
            {health.daysOfCashRemaining > 90 ? '+90 días' : `${health.daysOfCashRemaining} días de efectivo`}
          </span>
        </div>
      </div>

      {/* Actionable message */}
      <div className="mt-3.5 p-3 rounded-xl bg-[#0B192C]/90 border border-[#243B55] flex items-start gap-2.5">
        <Info className="w-4 h-4 text-[#00ADB5] shrink-0 mt-0.5" />
        <p className="text-xs text-slate-300 leading-relaxed font-normal">
          {health.message}
        </p>
      </div>
    </div>
  );
}
