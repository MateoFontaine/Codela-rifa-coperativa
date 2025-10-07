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
    <div className="max-w-md mx-auto bg-white border rounded-2xl p-6 shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Iniciar sesión</h2>
      
      <form onSubmit={submit} className="space-y-3">
        <input 
          name="email" 
          type="email"
          placeholder="Email" 
          className="w-full border rounded-xl p-3"
          value={form.email} 
          onChange={onChange} 
          required
        />
        <input 
          name="password" 
          type="password" 
          placeholder="Contraseña" 
          className="w-full border rounded-xl p-3"
          value={form.password} 
          onChange={onChange}
          required
        />
        
        <button 
          type="submit"
          disabled={loading} 
          className="w-full px-4 py-3 rounded-xl bg-black text-white disabled:opacity-50"
        >
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>

        {/* Botón de olvidé mi contraseña */}
        <button
          type="button"
          onClick={() => setShowForgotPassword(true)}
          className="w-full text-sm text-gray-600 hover:text-gray-800 underline"
        >
          ¿Olvidaste tu contraseña?
        </button>
      </form>

      {/* Modal de recuperación de contraseña */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Recuperar contraseña</h3>
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetSent(false);
                  setResetEmail('');
                }}
                className="text-gray-500 hover:text-gray-700"
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
                  className="w-full border rounded-xl p-3"
                  required
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetEmail('');
                    }}
                    className="flex-1 px-4 py-2 rounded-xl border"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50"
                  >
                    {resetLoading ? 'Enviando...' : 'Enviar link'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">✅</div>
                <h4 className="font-semibold mb-2">¡Email enviado!</h4>
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