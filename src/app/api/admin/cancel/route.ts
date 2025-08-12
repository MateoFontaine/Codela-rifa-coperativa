import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const { userId, orderId } = await req.json() as { userId?: string; orderId?: string }
    if (!userId || !orderId) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

    const admin = supabaseAdmin()
    const { data: au } = await admin.from('app_users').select('is_admin').eq('id', userId).single()
    if (!au?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // liberar números
    const { error: numsErr } = await admin.from('raffle_numbers')
      .update({ status: 'free', held_by: null, hold_expires_at: null, order_id: null, updated_at: new Date().toISOString() })
      .eq('order_id', orderId)
    if (numsErr) return NextResponse.json({ error: numsErr.message }, { status: 400 })

    // marcar orden cancelada
    const { error: upErr } = await admin.from('orders')
      .update({ status: 'canceled', updated_at: new Date().toISOString() })
      .eq('id', orderId)
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
