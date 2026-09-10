'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, AlertTriangle, AlertCircle, Calendar, CheckCircle2, ChevronRight, X } from 'lucide-react';
import { formatCOP } from '@/lib/utils';
import Link from 'next/link';

interface AlertItem {
  id: string;
  type: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  message: string;
  date?: string;
}

export function NotificationCenter() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load dismissed alerts from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('posinnovate_dismissed_alerts');
      if (saved) {
        setDismissedIds(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        if (data.alerts && Array.isArray(data.alerts)) {
          setAlerts(data.alerts);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // Refresh alerts periodically (every 60 seconds)
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const activeAlerts = alerts.filter(a => !dismissedIds.includes(a.id));
  const criticalCount = activeAlerts.filter(a => a.type === 'CRITICAL').length;
  const warningCount = activeAlerts.filter(a => a.type === 'WARNING').length;

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    try {
      localStorage.setItem('posinnovate_dismissed_alerts', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleDismissAll = () => {
    const allIds = alerts.map(a => a.id);
    setDismissedIds(allIds);
    try {
      localStorage.setItem('posinnovate_dismissed_alerts', JSON.stringify(allIds));
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1.5 sm:p-2 rounded-xl text-slate-300 hover:text-[#00ADB5] hover:bg-[#102A43] border border-transparent hover:border-[#1E3A5F] transition-all shrink-0"
        title="Notificaciones y avisos inteligentes"
        aria-label="Notificaciones"
      >
        <Bell className="w-4 h-4" />
        {activeAlerts.length > 0 && (
          <span
            className={`absolute top-1 right-1 flex h-2.5 w-2.5 items-center justify-center rounded-full ${
              criticalCount > 0 ? 'bg-rose-500 ring-2 ring-rose-500/20' : 'bg-[#00ADB5] ring-2 ring-[#00ADB5]/20'
            }`}
          >
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                criticalCount > 0 ? 'bg-rose-400' : 'bg-[#00ADB5]'
              }`}
            />
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[92vw] bg-[#0B192C] border border-[#1E3A5F] rounded-2xl shadow-2xl shadow-black/60 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-[#1E3A5F] flex items-center justify-between bg-[#102A43]/50">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#00ADB5]" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Avisos y Compromisos
              </span>
              {activeAlerts.length > 0 && (
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-[#102A43] text-[#00ADB5] border border-[#00ADB5]/30">
                  {activeAlerts.length}
                </span>
              )}
            </div>

            {activeAlerts.length > 0 && (
              <button
                onClick={handleDismissAll}
                className="text-[11px] text-slate-400 hover:text-white transition-colors"
              >
                Limpiar todo
              </button>
            )}
          </div>

          {/* Alert List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-[#1E3A5F]/50 p-1">
            {activeAlerts.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-2 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-white">Todo está al día</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  No tienes pagos urgentes pendientes ni desbalances en tus fechas programadas.
                </p>
              </div>
            ) : (
              activeAlerts.map(alert => {
                const isCritical = alert.type === 'CRITICAL';
                const isWarning = alert.type === 'WARNING';

                return (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-xl transition-colors relative group hover:bg-[#102A43]/60 ${
                      isCritical
                        ? 'bg-rose-950/15 border-l-2 border-l-rose-500'
                        : isWarning
                        ? 'bg-amber-950/15 border-l-2 border-l-amber-500'
                        : 'bg-cyan-950/10 border-l-2 border-l-[#00ADB5]'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="shrink-0 mt-0.5">
                        {isCritical ? (
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                        ) : isWarning ? (
                          <AlertCircle className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Calendar className="w-4 h-4 text-[#00ADB5]" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center justify-between">
                          <h4
                            className={`text-xs font-bold leading-tight ${
                              isCritical
                                ? 'text-rose-300'
                                : isWarning
                                ? 'text-amber-300'
                                : 'text-slate-200'
                            }`}
                          >
                            {alert.title}
                          </h4>
                          {alert.date && (
                            <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-1">
                              {alert.date}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                          {alert.message}
                        </p>
                      </div>

                      {/* Dismiss item button */}
                      <button
                        onClick={(e) => handleDismiss(alert.id, e)}
                        className="opacity-60 hover:opacity-100 text-slate-400 hover:text-white p-1 rounded transition-opacity"
                        title="Descartar aviso"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Link to Budgets / Schedules */}
          <div className="p-2.5 border-t border-[#1E3A5F] bg-[#070F1E] text-center">
            <Link
              href="/budgets"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#00ADB5] hover:text-[#06B6D4] transition-colors"
            >
              <span>Gestionar grupos y fechas programadas</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
