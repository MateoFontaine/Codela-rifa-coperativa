'use client';
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
      <div className="max-w-md mx-auto bg-white border rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Registro exitoso</h2>
        <a href="/auth/login" className="text-blue-600 underline">Ir a Iniciar sesión</a>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white border rounded-2xl p-6 shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Crear cuenta</h2>
      <form onSubmit={submit} className="space-y-3">
        <input name="firstName" placeholder="Nombre" className="w-full border rounded-xl p-3"
               value={form.firstName} onChange={onChange} />
        <input name="lastName" placeholder="Apellido" className="w-full border rounded-xl p-3"
               value={form.lastName} onChange={onChange} />
        <input name="dni" placeholder="DNI" className="w-full border rounded-xl p-3"
               value={form.dni} onChange={onChange} />
        <input name="email" placeholder="Email" className="w-full border rounded-xl p-3"
               value={form.email} onChange={onChange} />
        <input name="phone" placeholder="Teléfono" className="w-full border rounded-xl p-3"
               value={form.phone} onChange={onChange} />
        <input name="password" type="password" placeholder="Contraseña" className="w-full border rounded-xl p-3"
               value={form.password} onChange={onChange} />
        <button disabled={loading} className="w-full px-4 py-3 rounded-xl bg-black text-white">
          {loading ? 'Creando...' : 'Crear cuenta'}
        </button>
      </form>
    </div>
  );
}
