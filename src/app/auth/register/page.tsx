'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', dni: '', email: '', phone: '', password: ''
  });

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Error');
      alert('Cuenta creada. Ahora iniciá sesión.');
      setDone(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="max-w-md mx-auto bg-white border-2 border-blue-200 rounded-2xl p-8 shadow-lg text-center">
        <div className="inline-block p-4 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 mb-4">
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-blue-600 mb-2">¡Registro exitoso!</h2>
        <p className="text-gray-600 mb-6">Tu cuenta fue creada correctamente</p>
        <a 
          href="/auth/login" 
          className="inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-semibold hover:opacity-90 transition-all shadow-lg"
        >
          Ir a Iniciar sesión
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white border-2 border-blue-200 rounded-2xl p-6 shadow-lg">
      <div className="text-center mb-6">
        <div className="inline-block p-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 mb-3">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
          Crear cuenta
        </h2>
        <p className="text-sm text-gray-600 mt-1">Unite a la rifa cooperativa</p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nombre</label>
            <input 
              name="firstName" 
              placeholder="Juan" 
              className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-blue-500 focus:outline-none transition-colors"
              value={form.firstName} 
              onChange={onChange}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Apellido</label>
            <input 
              name="lastName" 
              placeholder="Pérez" 
              className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-blue-500 focus:outline-none transition-colors"
              value={form.lastName} 
              onChange={onChange}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">DNI</label>
          <input 
            name="dni" 
            placeholder="12345678" 
            className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-blue-500 focus:outline-none transition-colors"
            value={form.dni} 
            onChange={onChange}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
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
          <label className="block text-xs font-medium text-gray-700 mb-1">Teléfono</label>
          <input 
            name="phone" 
            placeholder="1123456789" 
            className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-blue-500 focus:outline-none transition-colors"
            value={form.phone} 
            onChange={onChange}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Contraseña</label>
          <input 
            name="password" 
            type="password" 
            placeholder="••••••••" 
            className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-blue-500 focus:outline-none transition-colors"
            value={form.password} 
            onChange={onChange}
            required
            minLength={6}
          />
          <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres</p>
        </div>

        <button 
          disabled={loading} 
          className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-semibold disabled:opacity-50 hover:opacity-90 transition-all shadow-lg mt-4"
        >
          {loading ? 'Creando cuenta...' : '🎟️ Crear cuenta'}
        </button>

        <p className="text-center text-sm text-gray-600 mt-4">
          ¿Ya tenés cuenta?{' '}
          <a href="/auth/login" className="text-blue-600 hover:text-cyan-500 font-medium underline">
            Iniciá sesión
          </a>
        </p>
      </form>
    </div>
  );
}