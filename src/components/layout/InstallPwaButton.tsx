'use client';

import React, { useEffect, useState } from 'react';
import { Smartphone, Share2, PlusSquare, Check, Sparkles, ArrowRight } from 'lucide-react';
import { Modal, Button } from '@/components/ui';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface InstallPwaButtonProps {
  className?: string;
  variant?: 'compact' | 'full';
  onClicked?: () => void;
}

export function InstallPwaButton({ className, variant = 'compact', onClicked }: InstallPwaButtonProps = {}) {
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
      {variant === 'full' ? (
        <button
          type="button"
          onClick={() => {
            handleInstallClick();
            if (onClicked) onClicked();
          }}
          className={className || "w-full flex items-center justify-between p-3 rounded-2xl bg-surface-elevated hover:bg-secondary/60 border border-border text-foreground text-xs font-bold transition-all group cursor-pointer"}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="block font-black text-foreground text-xs">Descargar App Móvil</span>
              <span className="block text-[10px] text-foreground/50">Acceso rápido en tu pantalla de inicio</span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-foreground/40 group-hover:text-accent transition-colors" />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleInstallClick}
          className={className || "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-primary/15 border border-primary/40 text-primary hover:text-foreground hover:bg-primary/25 hover:border-primary text-xs font-bold transition-all shadow-sm shadow-primary/10 shrink-0 cursor-pointer"}
          title="Instalar como App de acceso directo en tu móvil"
        >
          <Smartphone className="w-3.5 h-3.5 text-primary" />
          <span className="hidden sm:inline">Instalar App</span>
          <span className="sm:hidden">App</span>
        </button>
      )}

      {/* Modal de instrucciones de instalación / acceso directo */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-elevated border border-primary/40 flex items-center justify-center shrink-0">
              <img src="/icon-192.png" alt="PosInnovate" className="w-9 h-9 rounded-xl" />
            </div>
            <div>
              <h3 className="text-base font-black text-foreground flex items-center gap-1.5">
                Acceso Directo Móvil
                <Sparkles className="w-4 h-4 text-primary" />
              </h3>
              <p className="text-xs text-foreground/60">Instala PosInnovate Finanzas en tu pantalla de inicio</p>
            </div>
          </div>

          <div className="bg-surface-elevated/70 border border-border rounded-2xl p-4 space-y-3 text-xs text-foreground/80">
            <p className="font-semibold text-foreground">
              Disfruta de la experiencia de aplicación nativa:
            </p>
            <ul className="space-y-1.5 text-foreground/70">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary shrink-0" />
                <span>Sin barra de navegación, pantalla completa.</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary shrink-0" />
                <span>Apertura instantánea desde tus aplicaciones.</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary shrink-0" />
                <span>Carga ultrarrápida con caché inteligente.</span>
              </li>
            </ul>
          </div>

          {/* Guía según dispositivo */}
          <div className="space-y-3 pt-1">
            <h4 className="text-xs font-bold text-foreground/90 uppercase tracking-wider">
              {isIOS ? '🍎 En iPhone / iPad (Safari):' : '🤖 En Android (Chrome / Edge / Samsung):'}
            </h4>

            {isIOS ? (
              <div className="space-y-2.5 text-xs text-foreground/80 bg-surface-elevated/40 p-3 rounded-2xl border border-border/70">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-primary text-background font-black text-[11px] flex items-center justify-center shrink-0">1</span>
                  <span>Toca el botón <strong className="text-foreground">Compartir</strong> (<Share2 className="w-3.5 h-3.5 inline text-primary" /> en la barra inferior de Safari).</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-primary text-background font-black text-[11px] flex items-center justify-center shrink-0">2</span>
                  <span>Desliza hacia abajo y elige <strong className="text-foreground">"Agregar al inicio"</strong> (<PlusSquare className="w-3.5 h-3.5 inline text-primary" />).</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-primary text-background font-black text-[11px] flex items-center justify-center shrink-0">3</span>
                  <span>Presiona <strong className="text-primary">Agregar</strong> arriba a la derecha. ¡Y listo!</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 text-xs text-foreground/80 bg-surface-elevated/40 p-3 rounded-2xl border border-border/70">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-primary text-background font-black text-[11px] flex items-center justify-center shrink-0">1</span>
                  <span>Toca los <strong className="text-foreground">3 puntos (⋮)</strong> en la esquina superior derecha del navegador.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-primary text-background font-black text-[11px] flex items-center justify-center shrink-0">2</span>
                  <span>Selecciona <strong className="text-foreground">"Instalar aplicación"</strong> o <strong className="text-foreground">"Agregar a la pantalla principal"</strong>.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-primary text-background font-black text-[11px] flex items-center justify-center shrink-0">3</span>
                  <span>Confirma y el icono se colocará directamente en tu escritorio móvil.</span>
                </div>
              </div>
            )}
          </div>

          <Button
            variant="primary"
            onClick={() => setIsModalOpen(false)}
            fullWidth
          >
            Entendido
          </Button>
        </div>
      </Modal>
    </>
  );
}
