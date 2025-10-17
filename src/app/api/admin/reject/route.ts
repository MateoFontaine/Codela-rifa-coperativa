import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { updateActivePurchasesCount } from '@/lib/purchase-limits'

type Body = { userId: string; orderId: string; reason?: string }

export async function POST(req: Request) {
  try {
    const { userId, orderId, reason } = (await req.json()) as Body
    
    if (!userId || !orderId) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const admin = supabaseAdmin()

    // check admin
    const { data: au } = await admin
      .from('app_users')
      .select('is_admin, email')  // 👈 CAMBIO: Agregar email
      .eq('id', userId)
      .single()

    if (!au?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 👇 CAMBIO: obtener user_id Y total_amount
    const { data: order } = await admin
      .from('orders')
      .select('user_id, total_amount')
      .eq('id', orderId)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    // marcar orden como rechazada
    const { error } = await admin
      .from('orders')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', orderId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // opcional: guardar observación en el comprobante
    if (reason) {
      await admin
        .from('payment_proofs')
        .update({ notes: reason })
        .eq('order_id', orderId)
    }

    // actualizar contador del usuario
    if (order.user_id) {
      await updateActivePurchasesCount(order.user_id)
    }

    // 👇 Log de la acción
    const { data: orderUser } = await admin
      .from('app_users')
      .select('email')
      .eq('id', order.user_id)
      .single()

    const { data: orderNums } = await admin
      .from('raffle_numbers')
      .select('id')
      .eq('order_id', orderId)

    const { error: logError } = await admin.from('admin_logs').insert({
      admin_id: userId,
      admin_email: au.email || 'unknown',  // 👈 CAMBIO: Usar au.email
      action: 'reject',
      order_id: orderId,
      order_user_email: orderUser?.email || 'unknown',
      order_total: order.total_amount,
      numbers_count: orderNums?.length || 0,
      metadata: { reason: reason || null }
    })

    if (logError) {
      console.error('❌ Error guardando log:', logError)
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}