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

      {/* Popover Dropdown (Mobile-first responsive modal & desktop dropdown) */}
      {isOpen && (
        <>
          {/* Mobile Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 sm:hidden"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed inset-x-3 top-16 max-h-[82vh] flex flex-col z-50 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-3 sm:w-105 sm:max-h-135 bg-[#0B192C] border border-[#1E3A5F] rounded-3xl shadow-2xl shadow-black/80 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#1E3A5F] flex items-center justify-between bg-[#102A43]/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-[#00ADB5]/20 flex items-center justify-center text-[#00ADB5]">
                  <Bell className="w-4 h-4" />
                </div>
                {activeAlerts.length > 0 && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#102A43] text-[#00ADB5] border border-[#00ADB5]/30 ml-1">
                    {activeAlerts.length}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {activeAlerts.length > 0 && (
                  <button
                    onClick={handleDismissAll}
                    className="text-xs text-slate-400 hover:text-white font-medium px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors text-nowrap"
                  >
                    Limpiar todo
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors sm:hidden"
                  title="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Alert List with Generous Padding */}
            <div className="max-h-100 overflow-y-auto p-4 space-y-3">
              {activeAlerts.length === 0 ? (
                <div className="py-12 px-6 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 shadow-sm">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-white">Todo está al día</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
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
                      className={`p-4 rounded-2xl transition-all relative group border shadow-sm ${
                        isCritical
                          ? 'bg-rose-500/5 border-rose-500/40 text-rose-300'
                          : isWarning
                          ? 'bg-amber-500/5 border-amber-500/40 text-amber-300'
                          : 'bg-cyan-500/5 border-[#00ADB5]/40 text-cyan-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 mt-0.5">
                          {isCritical ? (
                            <AlertTriangle className="w-4 h-4 text-rose-400" />
                          ) : isWarning ? (
                            <AlertCircle className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Calendar className="w-4 h-4 text-[#00ADB5]" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-center justify-between gap-2">
                            <h4
                              className={`text-xs font-black leading-tight ${
                                isCritical
                                  ? 'text-rose-200'
                                  : isWarning
                                  ? 'text-amber-200'
                                  : 'text-white'
                              }`}
                            >
                              {alert.title}
                            </h4>
                            {alert.date && (
                              <span className="text-[10px] text-slate-400 font-medium shrink-0">
                                {alert.date}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed font-normal">
                            {alert.message}
                          </p>
                        </div>

                        {/* Dismiss item button */}
                        <button
                          onClick={(e) => handleDismiss(alert.id, e)}
                          className="opacity-70 hover:opacity-100 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-black/20 transition-all shrink-0"
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

            {/* Footer Link to Budgets */}
            <div className="p-3.5 border-t border-[#1E3A5F] bg-[#070F1E] text-center">
              <Link
                href="/budgets"
                onClick={() => setIsOpen(false)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00ADB5] hover:text-[#06B6D4] transition-colors"
              >
                <span>Gestionar grupos y fechas programadas</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
      </>
    )}
    </div>
  );
}
