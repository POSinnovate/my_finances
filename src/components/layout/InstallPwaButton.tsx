'use client';

import React, { useEffect, useState } from 'react';
import { Smartphone, Download, Share2, PlusSquare, Check, X, Sparkles } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function InstallPwaButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIosDevice);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsModalOpen(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
          return;
        }
      } catch (err) {
        console.error('Error al solicitar instalación:', err);
      }
    }
    // Show instruction modal if prompt not available or on iOS
    setIsModalOpen(true);
  };

  // If already running as standalone app, show a small badge or hide
  if (isInstalled) {
    return null;
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-[#00ADB5]/20 to-[#06B6D4]/20 border border-[#00ADB5]/40 text-[#00ADB5] hover:text-white hover:border-[#00ADB5] text-xs font-bold transition-all shadow-sm shadow-[#00ADB5]/10 shrink-0"
        title="Instalar como App de acceso directo en tu móvil"
      >
        <Smartphone className="w-3.5 h-3.5 text-[#00ADB5]" />
        <span className="hidden sm:inline">Instalar App</span>
        <span className="sm:hidden">App</span>
      </button>

      {/* Modal de instrucciones de instalación / acceso directo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-[#0B192C] border border-[#243B55] rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl relative space-y-4">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#102A43] border border-[#00ADB5]/40 flex items-center justify-center shrink-0">
                <img src="/icon-192.png" alt="PosInnovate" className="w-9 h-9 rounded-xl" />
              </div>
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-1.5">
                  Acceso Directo Móvil
                  <Sparkles className="w-4 h-4 text-[#00ADB5]" />
                </h3>
                <p className="text-xs text-slate-400">Instala PosInnovate Finanzas en tu pantalla de inicio</p>
              </div>
            </div>

            <div className="bg-[#102A43]/70 border border-[#243B55] rounded-2xl p-4 space-y-3 text-xs text-slate-300">
              <p className="font-semibold text-white">
                Disfruta de la experiencia de aplicación nativa:
              </p>
              <ul className="space-y-1.5 text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#00ADB5] shrink-0" />
                  <span>Sin barra de navegación, pantalla completa.</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#00ADB5] shrink-0" />
                  <span>Apertura instantánea desde tus aplicaciones.</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#00ADB5] shrink-0" />
                  <span>Carga ultrarrápida con caché inteligente.</span>
                </li>
              </ul>
            </div>

            {/* Guía según dispositivo */}
            <div className="space-y-3 pt-1">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                {isIOS ? '🍎 En iPhone / iPad (Safari):' : '🤖 En Android (Chrome / Edge / Samsung):'}
              </h4>

              {isIOS ? (
                <div className="space-y-2.5 text-xs text-slate-300 bg-[#102A43]/40 p-3 rounded-2xl border border-[#243B55]/70">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#00ADB5] text-[#0B192C] font-black text-[11px] flex items-center justify-center shrink-0">1</span>
                    <span>Toca el botón <strong className="text-white">Compartir</strong> (<Share2 className="w-3.5 h-3.5 inline text-[#00ADB5]" /> en la barra inferior de Safari).</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#00ADB5] text-[#0B192C] font-black text-[11px] flex items-center justify-center shrink-0">2</span>
                    <span>Desliza hacia abajo y elige <strong className="text-white">"Agregar al inicio"</strong> (<PlusSquare className="w-3.5 h-3.5 inline text-[#00ADB5]" />).</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#00ADB5] text-[#0B192C] font-black text-[11px] flex items-center justify-center shrink-0">3</span>
                    <span>Presiona <strong className="text-[#00ADB5]">Agregar</strong> arriba a la derecha. ¡Y listo!</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 text-xs text-slate-300 bg-[#102A43]/40 p-3 rounded-2xl border border-[#243B55]/70">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#00ADB5] text-[#0B192C] font-black text-[11px] flex items-center justify-center shrink-0">1</span>
                    <span>Toca los <strong className="text-white">3 puntos (⋮)</strong> en la esquina superior derecha del navegador.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#00ADB5] text-[#0B192C] font-black text-[11px] flex items-center justify-center shrink-0">2</span>
                    <span>Selecciona <strong className="text-white">"Instalar aplicación"</strong> o <strong className="text-white">"Agregar a la pantalla principal"</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#00ADB5] text-[#0B192C] font-black text-[11px] flex items-center justify-center shrink-0">3</span>
                    <span>Confirma y el icono se colocará directamente en tu escritorio móvil.</span>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsModalOpen(false)}
              className="w-full py-2.5 bg-[#00ADB5] hover:bg-[#00ADB5]/90 text-[#0B192C] rounded-2xl font-black text-xs transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
