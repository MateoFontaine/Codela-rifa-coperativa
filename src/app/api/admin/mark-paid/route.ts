import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
<<<<<<< HEAD
import { updateActivePurchasesCount } from '@/lib/purchase-limits'
=======
import { sendPagoConfirmado } from '@/lib/email'

type Body = { userId: string; orderId: string }
>>>>>>> 780e146ce83e5483030f596501dcf70a2162ab42

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
      .select('is_admin')
      .eq('id', userId)
      .single()

    if (!adminUser?.is_admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

<<<<<<< HEAD
    // Obtener la orden y su dueño
    const { data: order } = await admin
      .from('orders')
      .select('id, user_id, status')
      .eq('id', orderId)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    // Actualizar orden a 'paid'
    const { error: updateErr } = await admin
=======
    // 🚀 NUEVO: Obtener datos de la orden ANTES de marcar como paid
    const { data: orderData, error: orderErr } = await admin
      .from('orders')
      .select('id,user_id,total_amount')
      .eq('id', orderId)
      .single()

    if (orderErr || !orderData) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    // Obtener email del usuario
    const { data: userData, error: userErr } = await admin
      .from('app_users')
      .select('email')
      .eq('id', orderData.user_id)
      .single()

    if (userErr || !userData) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Obtener números de la orden
    const { data: numbersData, error: numbersErr } = await admin
      .from('raffle_numbers')
      .select('id')
      .eq('order_id', orderId)

    if (numbersErr) {
      return NextResponse.json({ error: 'Error obteniendo números' }, { status: 400 })
    }

    const numbers = (numbersData || []).map(row => Number(row.id))

    // set paid
    const { error: upErr } = await admin
>>>>>>> 780e146ce83e5483030f596501dcf70a2162ab42
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

    // 🚀 NUEVO: Enviar email de pago confirmado
    try {
      const userEmail = userData.email
      
      if (!userEmail) {
        console.error('Email del usuario no encontrado para orden:', orderId)
      } else {
        const emailResult = await sendPagoConfirmado(
          userEmail,
          orderId,
          numbers,
          Number(orderData.total_amount) || 0
        )
        
        if (!emailResult.success) {
          console.error('Error enviando email de confirmación:', emailResult.error)
          // No fallar la request por error de email
        }
      }
    } catch (emailError) {
      console.error('Error en proceso de email de confirmación:', emailError)
      // No fallar la request por error de email
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}