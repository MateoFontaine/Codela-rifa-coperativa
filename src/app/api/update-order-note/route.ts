import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

type Body = {
  userId: string
  orderId: string
  notes: string
}

export async function POST(req: Request) {
  try {
    const { userId, orderId, notes } = (await req.json()) as Body

    if (!userId || !orderId) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const admin = supabaseAdmin()

    // Verificar que la orden pertenece al usuario
    const { data: order, error: orderErr } = await admin
      .from('orders')
      .select('id, user_id, status')
      .eq('id', orderId)
      .single()

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    if (order.user_id !== userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // No permitir editar si ya está pagada o cancelada
    if (order.status === 'paid' || order.status === 'canceled') {
      return NextResponse.json({ error: 'La orden ya está cerrada' }, { status: 409 })
    }

    // Actualizar la nota
    const { error: updateErr } = await admin
      .from('orders')
      .update({ 
        notes: notes.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error servidor'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}