'use client';

import React from 'react';
import { AlertTriangle, ShieldCheck, Flame, Calendar, Info } from 'lucide-react';
import { formatCOP } from '@/lib/utils';
import { Badge } from '@/components/ui';

interface HealthData {
  safeDailySpend: number;
  rawDailySpend?: number;
  dailyBurnAverage: number;
  daysRemaining: number;
  daysOfCashRemaining: number;
  statusLevel: 'CRITICAL' | 'WARNING' | 'HEALTHY';
  message: string;
  paydayLabel?: string;
  totalPendingCommitments?: number;
  freeCashForPeriod?: number;
}

interface CashFlowData {
  nextIncome?: {
    name: string;
    amount: number;
    dateStr: string;
    daysRemaining: number;
    label: string;
  };
  upcomingCommitments?: {
    categoryId: string;
    name: string;
    amount: number;
    dateStr: string;
    daysUntil: number;
    frequency: string;
    isPaid: boolean;
  }[];
  totalPendingCommitments?: number;
  freeCashForPeriod?: number;
}

interface DailyBurnCardProps {
  health: HealthData;
  currentCash: number;
  cashFlow?: CashFlowData;
}

export function DailyBurnCard({ health, currentCash, cashFlow }: DailyBurnCardProps) {
  const isCritical = health.statusLevel === 'CRITICAL';
  const isWarning = health.statusLevel === 'WARNING';

  const nextIncome = cashFlow?.nextIncome;
  const pendingCommitments = cashFlow?.totalPendingCommitments ?? health.totalPendingCommitments ?? 0;
  const freeCash = cashFlow?.freeCashForPeriod ?? Math.max(0, currentCash - pendingCommitments);
  const daysRemaining = health.daysRemaining || 1;

  const borderColor = isCritical
    ? 'border-rose-500/50 bg-rose-950/20'
    : isWarning
    ? 'border-amber-500/50 bg-amber-950/20'
    : 'border-primary/50 bg-surface-elevated/70';

  const statusBadge = isCritical ? (
    <Badge variant="danger">
      <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Estado Crítico
    </Badge>
  ) : isWarning ? (
    <Badge variant="warning">
      <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Gasto Ajustado
    </Badge>
  ) : (
    <Badge variant="success">
      <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Control Estable
    </Badge>
  );

  return (
    <div className={`rounded-3xl border ${borderColor} p-5 shadow-xl backdrop-blur-md relative overflow-hidden`}>
      {/* Glow highlight */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-surface-elevated border border-border flex items-center justify-center text-primary">
            <Flame className="w-4 h-4 text-primary" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-foreground/80">Gasto Diario Seguro</span>
        </div>
        {statusBadge}
      </div>

      {/* Hero Metric */}
      <div className="mt-2 mb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
            {formatCOP(health.safeDailySpend)}
          </span>
          <span className="text-sm font-semibold text-foreground/50">/ día</span>
        </div>

        {/* Dynamic calculation explanation */}
        {pendingCommitments > 0 ? (
          <div className="mt-2.5 p-2.5 rounded-xl bg-surface border border-border text-xs">
            <div className="flex flex-wrap items-center gap-1.5 text-foreground/80 font-medium">
              <span>Fondo: <strong className="text-foreground">{formatCOP(currentCash)}</strong></span>
              <span className="text-foreground/40">-</span>
              <span>Compromisos fijos: <strong className="text-amber-300">{formatCOP(pendingCommitments)}</strong></span>
              <span className="text-foreground/40">=</span>
              <span>Libre: <strong className="text-primary">{formatCOP(freeCash)}</strong></span>
              <span className="text-foreground/50">({daysRemaining} {daysRemaining === 1 ? 'día' : 'días'})</span>
            </div>
            <p className="text-[11px] text-foreground/50 mt-1">
              Descontamos tus pagos programados antes del próximo ingreso para proteger tu dinero.
            </p>
          </div>
        ) : (
          <p className="text-xs text-foreground/60 mt-1">
            Límite máximo diario para que tu saldo de {formatCOP(currentCash)} te alcance hasta el próximo ingreso.
          </p>
        )}
      </div>

      {/* Next Income Badge (if available) */}
      {nextIncome && (
        <div className="mb-3.5 px-3 py-2 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Calendar className="w-3.5 h-3.5 text-accent shrink-0" />
            <span className="text-foreground/80 truncate">
              Próximo Ingreso: <strong className="text-foreground">{nextIncome.name}</strong>
            </span>
          </div>
          <span className="text-[11px] font-bold text-accent shrink-0 ml-2">
            {nextIncome.daysRemaining === 1 ? '¡Mañana o Hoy!' : `En ${nextIncome.daysRemaining} días`} ({nextIncome.dateStr})
          </span>
        </div>
      )}

      {/* Upcoming Commitments Mini-List */}
      {cashFlow?.upcomingCommitments && cashFlow.upcomingCommitments.length > 0 && (
        <div className="mb-3.5 space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 block">
            Compromisos fijos antes del próximo ingreso ({cashFlow.upcomingCommitments.length}):
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {cashFlow.upcomingCommitments.map((c, i) => (
              <div 
                key={i} 
                className={`p-2 rounded-xl text-xs flex items-center justify-between border ${
                  c.isPaid 
                    ? 'bg-emerald-950/20 border-emerald-800/30 text-emerald-300' 
                    : 'bg-surface border-border text-foreground/80'
                }`}
              >
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold truncate">{c.name}</span>
                    {c.isPaid && <Badge variant="success" size="sm">Pagado</Badge>}
                  </div>
                  <span className="text-[10px] text-foreground/50 block mt-0.5">
                    {c.daysUntil === 0 ? 'Vence hoy' : c.daysUntil === 1 ? 'Vence mañana' : `En ${c.daysUntil} días`} ({c.dateStr})
                  </span>
                </div>
                <span className="font-extrabold text-foreground shrink-0">
                  {formatCOP(c.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-3 border-t border-border">
        <div className="bg-surface border border-border rounded-xl p-2.5">
          <div className="flex items-center gap-1.5 text-foreground/50 mb-1">
            <Calendar className="w-3.5 h-3.5 text-accent" />
            <span className="text-[10px] font-medium uppercase">Días al Ingreso</span>
          </div>
          <span className="text-sm font-bold text-foreground">{daysRemaining} días</span>
        </div>

        <div className="bg-surface border border-border rounded-xl p-2.5">
          <div className="flex items-center gap-1.5 text-foreground/50 mb-1">
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-[10px] font-medium uppercase">Ritmo Actual</span>
          </div>
          <span className="text-sm font-bold text-foreground">{formatCOP(health.dailyBurnAverage)}/día</span>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-surface border border-border rounded-xl p-2.5">
          <div className="flex items-center gap-1.5 text-foreground/50 mb-1">
            <Info className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] font-medium uppercase">Autonomía</span>
          </div>
          <span className="text-sm font-bold text-foreground">
            {health.daysOfCashRemaining > 90 ? '+90 días' : `${health.daysOfCashRemaining} días de efectivo`}
          </span>
        </div>
      </div>

      {/* Actionable message */}
      <div className="mt-3.5 p-3 rounded-xl bg-surface border border-border flex items-start gap-2.5">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-foreground/80 leading-relaxed font-normal">
          {health.message}
        </p>
      </div>
    </div>
  );
}
