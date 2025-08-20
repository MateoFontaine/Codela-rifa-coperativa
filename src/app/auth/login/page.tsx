'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
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

  return (
    <div className="max-w-md mx-auto bg-white border rounded-2xl p-6 shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Iniciar sesión</h2>
      <form onSubmit={submit} className="space-y-3">
        <input name="email" placeholder="Email" className="w-full border rounded-xl p-3"
               value={form.email} onChange={onChange} />
        <input name="password" type="password" placeholder="Contraseña" className="w-full border rounded-xl p-3"
               value={form.password} onChange={onChange} />
        <button disabled={loading} className="w-full px-4 py-3 rounded-xl bg-black text-white">
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
