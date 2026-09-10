'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Wallet, Lock, Mail, User, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

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
    <div className="min-h-screen bg-[#070F1E] flex flex-col justify-center items-center px-4 py-8">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#00ADB5]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#00ADB5] to-[#06B6D4] text-[#0B192C] shadow-xl shadow-[#00ADB5]/30 mb-2.5">
            <Wallet className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Crea tu Cuenta</h1>
          <p className="text-xs uppercase tracking-widest text-[#00ADB5] font-bold mt-0.5">Control de Finanzas Personales</p>
          <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto">
            Registra tus gastos, establece presupuestos y controla tu dinero de forma 100% privada.
          </p>
        </div>

        {/* Register Card */}
        <div className="bg-[#0B192C] border border-[#1E3A5F] rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre Completo</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full bg-[#102A43] border border-[#243B55] focus:border-[#00ADB5] text-white text-base sm:text-xs pl-10 pr-4 py-2.5 rounded-xl focus:outline-none transition-all placeholder:text-slate-600"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="w-full bg-[#102A43] border border-[#243B55] focus:border-[#00ADB5] text-white text-base sm:text-xs pl-10 pr-4 py-2.5 rounded-xl focus:outline-none transition-all placeholder:text-slate-600"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Crea una contraseña segura"
                  className="w-full bg-[#102A43] border border-[#243B55] focus:border-[#00ADB5] text-white text-base sm:text-xs pl-10 pr-4 py-2.5 rounded-xl focus:outline-none transition-all placeholder:text-slate-600"
                  required
                />
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#102A43]/60 border border-[#243B55] flex items-center gap-2 text-[11px] text-slate-300">
              <ShieldCheck className="w-4 h-4 text-[#00ADB5] shrink-0" />
              <span>Tu información y gastos son estrictamente privados e independientes.</span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#00ADB5] to-[#06B6D4] text-[#0B192C] font-extrabold text-xs shadow-lg shadow-[#00ADB5]/20 flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50 mt-1"
            >
              {isLoading ? (
                <span>Creando tu cuenta...</span>
              ) : (
                <>
                  <span>Crear mi Cuenta Gratis</span>
                  <ArrowRight className="w-4 h-4 stroke-[3px]" />
                </>
              )}
            </button>
          </form>

          {/* Link to Login */}
          <div className="mt-4 pt-4 border-t border-[#1E3A5F] text-center">
            <p className="text-xs text-slate-400">
              ¿Ya tienes una cuenta?{' '}
              <Link href="/login" className="text-[#00ADB5] font-bold hover:underline">
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
