import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

type Body = { userId: string; orderId: string }

export async function POST(req: Request) {
  try {
    const { userId, orderId } = (await req.json()) as Body
    if (!userId || !orderId) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

    const admin = supabaseAdmin()

    // validar orden
    const { data: ord, error: ordErr } = await admin
      .from('orders')
      .select('id,user_id,status')
      .eq('id', orderId)
      .single()
    if (ordErr || !ord) return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    if (ord.user_id !== userId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    // traer proof (para borrar archivo)
    const { data: proof } = await admin
      .from('payment_proofs')
      .select('file_path')
      .eq('order_id', orderId)
      .single()

    if (proof?.file_path) {
      await admin.storage.from('proofs').remove([proof.file_path])
    }

    // borrar registro de proof
    await admin.from('payment_proofs').delete().eq('order_id', orderId)

    // devolver orden a awaiting_proof (si estaba en under_review)
    await admin.from('orders').update({ status: 'awaiting_proof', updated_at: new Date().toISOString() }).eq('id', orderId)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error servidor' }, { status: 500 })
  }
}
