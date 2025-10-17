import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { updateActivePurchasesCount } from '@/lib/purchase-limits'

type Body = { userId: string; orderId: string }

export async function POST(req: Request) {
  try {
    const { userId, orderId } = (await req.json()) as Body
    
    if (!userId || !orderId) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const admin = supabaseAdmin()

    // Verificar admin
    const { data: au } = await admin
      .from('app_users')
      .select('is_admin')
      .eq('id', userId)
      .single()

    if (!au?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Obtener datos de la orden
    const { data: order } = await admin
      .from('orders')
      .select('user_id, total_amount') // ✅ Agregar total_amount
      .eq('id', orderId)
      .single()

    // ✅ Verificar que la orden existe
    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    // Liberar números de la orden
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

    // Marcar orden como cancelada
    const { error: upErr } = await admin
      .from('orders')
      .update({ status: 'canceled', updated_at: new Date().toISOString() })
      .eq('id', orderId)

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 400 })
    }

    // Actualizar contador del usuario
    await updateActivePurchasesCount(order.user_id)

    // Log de la acción
    const { data: adminUser } = await admin
      .from('app_users')
      .select('email')
      .eq('id', userId)
      .single()

    const { data: orderUser } = await admin
      .from('app_users')
      .select('email')
      .eq('id', order.user_id)
      .single()

    const { data: orderNums } = await admin
      .from('raffle_numbers')
      .select('id')
      .eq('order_id', orderId)

    await admin.from('admin_logs').insert({
      admin_id: userId,
      admin_email: adminUser?.email || 'unknown',
      action: 'cancel',
      order_id: orderId,
      order_user_email: orderUser?.email || 'unknown',
      order_total: order.total_amount, // ✅ Ahora existe
      numbers_count: orderNums?.length || 0,
      metadata: { numbers: orderNums?.map(n => n.id) || [] }
    })

    return NextResponse.json({ ok: true })
    
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}