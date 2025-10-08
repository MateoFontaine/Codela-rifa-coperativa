'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supa = supabaseBrowser();
    supa.auth.getSession().then(({ data }) => {
      if (data.session) router.push('/app');
    });
  }, [router]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const supa = supabaseBrowser();
      const { error } = await supa.auth.signInWithPassword(form);
      if (error) throw new Error(error.message);
      router.push('/app');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      alert('Por favor ingresá tu email');
      return;
    }

    setResetLoading(true);
    try {
      const supa = supabaseBrowser();
      const { error } = await supa.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      setResetSent(true);
      setTimeout(() => {
        setShowForgotPassword(false);
        setResetSent(false);
        setResetEmail('');
      }, 3000);
    } catch (err: any) {
      alert(err.message || 'Error al enviar el email de recuperación');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white border-2 border-blue-200 rounded-2xl p-6 shadow-lg">
      <div className="text-center mb-6">
        <div className="inline-block p-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 mb-3">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
          Iniciar sesión
        </h2>
        <p className="text-sm text-gray-600 mt-1">Ingresá a tu cuenta</p>
      </div>
      
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input 
            name="email" 
            type="email"
            placeholder="tu@email.com" 
            className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-blue-500 focus:outline-none transition-colors"
            value={form.email} 
            onChange={onChange} 
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
          <input 
            name="password" 
            type="password" 
            placeholder="••••••••" 
            className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-blue-500 focus:outline-none transition-colors"
            value={form.password} 
            onChange={onChange}
            required
          />
        </div>
        
        <button 
          type="submit"
          disabled={loading} 
          className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-semibold disabled:opacity-50 hover:opacity-90 transition-all shadow-lg"
        >
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>

        <button
          type="button"
          onClick={() => setShowForgotPassword(true)}
          className="w-full text-sm text-blue-600 hover:text-cyan-500 underline transition-colors"
        >
          ¿Olvidaste tu contraseña?
        </button>
      </form>

      {/* Modal de recuperación de contraseña */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md border-2 border-blue-200 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-blue-600">Recuperar contraseña</h3>
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetSent(false);
                  setResetEmail('');
                }}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>

            {!resetSent ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-sm text-gray-600">
                  Ingresá tu email y te enviaremos un link para restablecer tu contraseña.
                </p>
                <input
                  type="email"
                  placeholder="tu@email.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-blue-500 focus:outline-none"
                  required
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetEmail('');
                    }}
                    className="flex-1 px-4 py-2 rounded-xl border-2 border-gray-300 hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-semibold disabled:opacity-50 hover:opacity-90 transition-all"
                  >
                    {resetLoading ? 'Enviando...' : 'Enviar link'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-4">
                <div className="inline-block p-4 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 mb-3">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h4 className="font-bold text-lg text-blue-600 mb-2">¡Email enviado!</h4>
                <p className="text-sm text-gray-600">
                  Revisá tu casilla de correo. Te enviamos un link para restablecer tu contraseña.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}