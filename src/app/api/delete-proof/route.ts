import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

type Body = { userId: string; orderId: string }

type OrderRow = {
  id: string
  user_id: string
  status: 'awaiting_proof' | 'under_review' | 'paid' | 'rejected' | 'canceled' | 'pending'
}

type ProofRow = { file_path: string | null }

export async function POST(req: Request) {
  try {
    const { userId, orderId } = (await req.json()) as Body
    if (!userId || !orderId) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const admin = supabaseAdmin()

    // validar orden
    const { data: ordRaw, error: ordErr } = await admin
      .from('orders')
      .select('id,user_id,status')
      .eq('id', orderId)
      .single()

    const ord = ordRaw as OrderRow | null
    if (ordErr || !ord) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }
    if (ord.user_id !== userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // traer proof (para borrar archivo)
    const { data: proofRaw } = await admin
      .from('payment_proofs')
      .select('file_path')
      .eq('order_id', orderId)
      .single()

    const proof = proofRaw as ProofRow | null
    if (proof?.file_path) {
      await admin.storage.from('proofs').remove([proof.file_path])
    }

    // borrar registro de proof
    await admin.from('payment_proofs').delete().eq('order_id', orderId)

    // devolver orden a awaiting_proof (si estaba en under_review)
    await admin
      .from('orders')
      .update({ status: 'awaiting_proof', updated_at: new Date().toISOString() })
      .eq('id', orderId)

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error servidor'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
