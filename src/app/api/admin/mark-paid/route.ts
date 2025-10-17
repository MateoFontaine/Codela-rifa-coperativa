import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { updateActivePurchasesCount } from '@/lib/purchase-limits'

type Body = { userId: string; orderId: string }

export async function POST(req: Request) {
  try {
    const { userId, orderId } = await req.json()
    
    if (!userId || !orderId) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const admin = supabaseAdmin()

    // Verificar que el admin existe
    const { data: adminUser } = await admin
      .from('app_users')
      .select('is_admin, email')  // 👈 CAMBIO: Seleccionar email también
      .eq('id', userId)
      .single()

    if (!adminUser?.is_admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Obtener la orden y su dueño
    const { data: order } = await admin
      .from('orders')
      .select('id, user_id, status, total_amount')  // 👈 CAMBIO: Agregar total_amount
      .eq('id', orderId)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    // Actualizar orden a 'paid'
    const { error: updateErr } = await admin
      .from('orders')
      .update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('id', orderId)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 })
    }

    // Marcar números como 'sold'
    await admin
      .from('raffle_numbers')
      .update({ status: 'sold', updated_at: new Date().toISOString() })
      .eq('order_id', orderId)

    // Actualizar contador de compras activas del usuario
    await updateActivePurchasesCount(order.user_id)

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
      admin_email: adminUser.email || 'unknown',  // 👈 CAMBIO: Usar adminUser del inicio
      action: 'mark_paid',
      order_id: orderId,
      order_user_email: orderUser?.email || 'unknown',
      order_total: order.total_amount,
      numbers_count: orderNums?.length || 0,
      metadata: { numbers: orderNums?.map(n => n.id) || [] }
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