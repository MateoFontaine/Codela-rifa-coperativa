import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

type Body = {
  userId: string
  targetEmail: string
  newPassword: string
}

export async function POST(req: Request) {
  try {
    const { userId, targetEmail, newPassword } = (await req.json()) as Body

    if (!userId || !targetEmail || !newPassword) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const admin = supabaseAdmin()

    // Verificar que quien hace la request es admin
    const { data: adminUser } = await admin
      .from('app_users')
      .select('is_admin')
      .eq('id', userId)
      .single()

    if (!adminUser?.is_admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Buscar el auth_user_id del usuario target
    const { data: targetUser } = await admin
      .from('app_users')
      .select('auth_user_id, email')
      .eq('email', targetEmail)
      .single()

    if (!targetUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Resetear la contraseña usando Supabase Admin API
    const { error: updateError } = await admin.auth.admin.updateUserById(
      targetUser.auth_user_id,
      { password: newPassword }
    )

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ 
      ok: true,
      message: `Contraseña actualizada para ${targetEmail}`
    })

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}