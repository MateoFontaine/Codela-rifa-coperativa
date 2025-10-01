import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { updateActivePurchasesCount } from '@/lib/purchase-limits' // 👈 AGREGAR

type Body = { userId: string; orderId: string }

export async function POST(req: Request) {
  try {
    const { userId, orderId } = (await req.json()) as Body
    if (!userId || !orderId) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const admin = supabaseAdmin()

    // check admin
    const { data: au } = await admin
      .from('app_users')
      .select('is_admin')
      .eq('id', userId)
      .single()
    if (!au?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 👇 AGREGAR: obtener el user_id de la orden
    const { data: order } = await admin
      .from('orders')
      .select('user_id')
      .eq('id', orderId)
      .single()

    // liberar números de la orden
    const { error: numsErr } = await admin
      .from('raffle_numbers')
      .update({
        status: 'free',
        held_by: null,
        hold_expires_at: null,
        order_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', orderId)
    if (numsErr) {
      return NextResponse.json({ error: numsErr.message }, { status: 400 })
    }

    // marcar orden como cancelada
    const { error: upErr } = await admin
      .from('orders')
      .update({ status: 'canceled', updated_at: new Date().toISOString() })
      .eq('id', orderId)
    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 400 })
    }

    // 👇 AGREGAR: actualizar contador del usuario
    if (order?.user_id) {
      await updateActivePurchasesCount(order.user_id)
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}