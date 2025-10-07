'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase';

function ResetPasswordContent() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Verificar si hay un token de recuperación en la URL
    const hash = window.location.hash;
    if (!hash) {
      alert('Link inválido o expirado');
      router.push('/auth/login');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const supa = supabaseBrowser();
      const { error } = await supa.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setSuccess(true);
      
      // Redirigir al login después de 2 segundos
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    } catch (err: any) {
      alert(err.message || 'Error al actualizar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto bg-white border rounded-2xl p-6 shadow-sm text-center">
        <div className="text-4xl mb-4">✅</div>
        <h2 className="text-xl font-semibold mb-2">¡Contraseña actualizada!</h2>
        <p className="text-gray-600 mb-4">
          Tu contraseña se actualizó correctamente. Redirigiendo al login...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white border rounded-2xl p-6 shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Nueva contraseña</h2>
      <p className="text-sm text-gray-600 mb-4">
        Ingresá tu nueva contraseña a continuación.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <input
            type="password"
            placeholder="Nueva contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-xl p-3"
            required
            minLength={6}
          />
          <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres</p>
        </div>

        <input
          type="password"
          placeholder="Confirmar contraseña"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full border rounded-xl p-3"
          required
          minLength={6}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-3 rounded-xl bg-black text-white disabled:opacity-50"
        >
          {loading ? 'Actualizando...' : 'Actualizar contraseña'}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="max-w-md mx-auto bg-white border rounded-2xl p-6 shadow-sm">
        Cargando...
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}