import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { firstName, lastName, dni, email, phone, password } = await req.json();

    if (!firstName || !lastName || !dni || !email || !password) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const admin = supabaseAdmin();

    // 1) Crear usuario en Auth (confirmado para evitar verificación por email)
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authErr || !authData?.user) {
      return NextResponse.json({ error: authErr?.message || 'Error al crear usuario' }, { status: 400 });
    }

    // 2) Insertar perfil app_users (DNI/Email únicos)
    const { error: upsertErr } = await admin.from('app_users').insert({
      auth_user_id: authData.user.id,
      first_name: firstName,
      last_name: lastName,
      dni,
      email,
      phone,
      role: 'user',
    });

    if (upsertErr) {
      // limpiar usuario auth si falla por unique, etc.
      await admin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: upsertErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error del servidor' }, { status: 500 });
  }
}
