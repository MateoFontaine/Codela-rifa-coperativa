import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

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

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
