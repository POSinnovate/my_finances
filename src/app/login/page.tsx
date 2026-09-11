'use client';

import React, { useState } from 'react';
import { Wallet, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

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
    <div className="min-h-screen bg-[#070F1E] flex flex-col justify-center items-center px-4 py-8">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#00ADB5]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-linear-to-tr from-[#00ADB5] to-[#06B6D4] text-[#0B192C] shadow-xl shadow-[#00ADB5]/30 mb-3">
            <Wallet className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">POSINNOVATE</h1>
          <p className="text-xs uppercase tracking-widest text-[#00ADB5] font-bold mt-0.5">Control de Gastos & Finanzas</p>
          <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto">
            Recupera el control de tu dinero, frena las fugas hormiga y alcanza tus metas.
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[#0B192C] border border-[#1E3A5F] rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Correo Electrónico</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="w-full bg-[#102A43] border border-[#243B55] focus:border-[#00ADB5] text-white text-sm pl-10 pr-4 py-3 rounded-xl focus:outline-none transition-all placeholder:text-slate-600"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#102A43] border border-[#243B55] focus:border-[#00ADB5] text-white text-sm pl-10 pr-4 py-3 rounded-xl focus:outline-none transition-all placeholder:text-slate-600"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-linear-to-r from-[#00ADB5] to-[#06B6D4] text-[#0B192C] font-extrabold text-sm shadow-lg shadow-[#00ADB5]/20 flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <span>Iniciando sesión...</span>
              ) : (
                <>
                  <span>Ingresar a mis Finanzas</span>
                  <ArrowRight className="w-4 h-4 stroke-[3px]" />
                </>
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-5 pt-4 border-t border-[#1E3A5F] text-center">
            <p className="text-xs text-slate-400">
              ¿No tienes una cuenta aún?{' '}
              <a href="/register" className="text-[#00ADB5] font-bold hover:underline">
                Regístrate aquí
              </a>
            </p>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-slate-500 mt-6">
          Multi-usuario independiente • Diseñado para celular y web
        </p>
      </div>
    </div>
  );
}
