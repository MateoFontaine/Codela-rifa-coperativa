import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId requerido' }, { status: 400 })
    }

    const admin = supabaseAdmin()

    // Obtener órdenes del usuario
    const { data: orders, error } = await admin
      .from('orders')
      .select('id, status, total_amount, price_per_number, created_at, updated_at, notes')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Para cada orden, obtener los números
    const ordersWithNumbers = await Promise.all(
      (orders || []).map(async (order) => {
        const { data: numbers } = await admin
          .from('raffle_numbers')
          .select('id')
          .eq('order_id', order.id)
          .order('id', { ascending: true })

        return {
          ...order,
          numbers: (numbers || []).map(n => n.id)
        }
      })
    )

    return NextResponse.json({ orders: ordersWithNumbers })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error servidor'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}