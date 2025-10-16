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

  // 👇 NUEVO: Número de WhatsApp de soporte
  const WHATSAPP_SUPPORT = '5492254409082'; // 👈 CAMBIAR POR TU NÚMERO

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

      {/* 👇 NUEVO: Sección de soporte */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-xs text-center text-gray-600 mb-3">
          ¿Problemas para ingresar? Contactá a soporte
        </p>
        <a
          href={`https://wa.me/${WHATSAPP_SUPPORT}?text=Hola,%20necesito%20ayuda%20para%20recuperar%20mi%20contraseña`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border-2 border-green-500 text-green-600 font-medium hover:bg-green-50 transition-colors"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
          <span>Contactar Soporte</span>
        </a>
      </div>

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