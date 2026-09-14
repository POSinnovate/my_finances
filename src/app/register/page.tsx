'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Wallet, Lock, Mail, User, ArrowRight, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, Input } from '@/components/ui';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`¡Cuenta creada con éxito! Bienvenido, ${data.user.name}`);
        window.location.href = '/';
      } else {
        toast.error(data.error || 'Error al registrarte');
      }
    } catch {
      toast.error('Error al conectarse con el servidor');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-background shadow-xl shadow-primary/30 mb-3">
            <Wallet className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Crea tu Cuenta</h1>
          <p className="text-xs uppercase tracking-widest text-primary font-bold mt-0.5">Control de Finanzas Personales</p>
          <p className="text-xs text-foreground/60 mt-2 max-w-xs mx-auto">
            Registra tus gastos, establece presupuestos y controla tu dinero de forma 100% privada.
          </p>
        </div>

        {/* Register Card */}
        <Card variant="glass" padding="lg">
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-foreground/80 mb-1.5">Nombre Completo</label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                icon={<User className="w-4 h-4" />}
                required
              />
            </div>

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
                placeholder="Crea una contraseña segura"
                icon={<Lock className="w-4 h-4" />}
                required
              />
            </div>

            <div className="p-3 rounded-xl bg-surface-elevated/70 border border-border/70 flex items-center gap-2.5 text-xs text-foreground/70">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
              <span>Tu información y gastos son estrictamente privados e independientes.</span>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={isLoading}
              className="mt-1"
            >
              {isLoading ? (
                <span>Creando tu cuenta...</span>
              ) : (
                <>
                  <span>Crear mi Cuenta Gratis</span>
                  <ArrowRight className="w-4 h-4 stroke-[3px]" />
                </>
              )}
            </Button>
          </form>

          {/* Link to Login */}
          <div className="mt-5 pt-4 border-t border-border/60 text-center">
            <p className="text-xs text-foreground/60">
              ¿Ya tienes una cuenta?{' '}
              <Link href="/login" className="text-primary font-bold hover:underline">
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
