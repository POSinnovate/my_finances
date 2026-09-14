'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Wallet, Lock, Mail, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, Input } from '@/components/ui';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Ingresa tu correo y contraseña');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`¡Bienvenido de nuevo, ${data.user.name}!`);
        window.location.href = '/';
      } else {
        toast.error(data.error || 'Credenciales incorrectas');
      }
    } catch {
      toast.error('Error al comunicarse con el servidor');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-background shadow-xl shadow-primary/30 mb-3">
            <Wallet className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">POSINNOVATE</h1>
          <p className="text-xs uppercase tracking-widest text-primary font-bold mt-0.5">Control de Gastos & Finanzas</p>
          <p className="text-xs text-foreground/60 mt-2 max-w-xs mx-auto">
            Recupera el control de tu dinero, frena las fugas hormiga y alcanza tus metas.
          </p>
        </div>

        {/* Login Card */}
        <Card variant="glass" padding="lg">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground/80 mb-1.5">Correo Electrónico</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                icon={<Mail className="w-4 h-4" />}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground/80 mb-1.5">Contraseña</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                icon={<Lock className="w-4 h-4" />}
                required
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={isLoading}
            >
              {isLoading ? (
                <span>Iniciando sesión...</span>
              ) : (
                <>
                  <span>Ingresar a mis Finanzas</span>
                  <ArrowRight className="w-4 h-4 stroke-[3px]" />
                </>
              )}
            </Button>
          </form>

          {/* Register Link */}
          <div className="mt-5 pt-4 border-t border-border/60 text-center">
            <p className="text-xs text-foreground/60">
              ¿No tienes una cuenta aún?{' '}
              <Link href="/register" className="text-primary font-bold hover:underline">
                Regístrate aquí
              </Link>
            </p>
          </div>
        </Card>

        {/* Footer info */}
        <p className="text-center text-[11px] text-foreground/40 mt-6">
          Multi-usuario independiente • Diseñado para celular y web
        </p>
      </div>
    </div>
  );
}
