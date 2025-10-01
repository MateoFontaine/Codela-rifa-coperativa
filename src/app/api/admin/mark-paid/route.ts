import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendPagoConfirmado } from '@/lib/email'

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
      .from('orders')
      .update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('id', orderId)
    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 400 })
    }

    // marcar números como sold
    const { error: numsErr } = await admin
      .from('raffle_numbers')
      .update({
        status: 'sold',
        held_by: null,
        hold_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', orderId)
    if (numsErr) {
      return NextResponse.json({ error: numsErr.message }, { status: 400 })
    }

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