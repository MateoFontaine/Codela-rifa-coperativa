import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const { userId, orderId, reason } = await req.json() as { userId?: string; orderId?: string; reason?: string }
    if (!userId || !orderId) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

    const admin = supabaseAdmin()
    const { data: au } = await admin.from('app_users').select('is_admin').eq('id', userId).single()
    if (!au?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { error } = await admin.from('orders')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', orderId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // opcional: guardar observación en la tabla payment_proofs (notes)
    if (reason) {
      await admin.from('payment_proofs').update({ notes: reason }).eq('order_id', orderId)
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
  const msg = e instanceof Error ? e.message : 'Error'
  return NextResponse.json({ error: msg }, { status: 500 })
}
}
