import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

type Status =
  | 'awaiting_proof'
  | 'under_review'
  | 'paid'
  | 'rejected'
  | 'canceled'
  | 'pending'

type Body = {
  userId: string
  orderId: string
  filePath: string      // p.ej. "ORDERID/1723494450000.jpg"
  publicUrl: string     // URL pública (dev) o firmada (prod)
  fileType?: string
  sizeBytes?: number
}

type OrderRow = {
  id: string
  user_id: string
  status: Status
}

export async function POST(req: Request) {
  try {
    const { userId, orderId, filePath, publicUrl, fileType, sizeBytes } = (await req.json()) as Body
    if (!userId || !orderId || !filePath || !publicUrl) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const admin = supabaseAdmin()

    // 1) Validar orden y dueño
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
    if (ord.status === 'paid' || ord.status === 'canceled') {
      return NextResponse.json({ error: 'La orden ya está cerrada' }, { status: 409 })
    }

    // 2) Guardar/actualizar comprobante (único por orden)
    const { error: upErr } = await admin
      .from('payment_proofs')
      .upsert(
        {
          order_id: orderId,
          user_id: ord.user_id,   // si es NOT NULL en la tabla
          file_url: publicUrl,
          file_path: filePath,
          file_type: fileType ?? null,
          size_bytes: sizeBytes ?? null,
        },
        { onConflict: 'order_id' }
      )

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 400 })
    }

    // 3) Pasar orden a "under_review"
    const { error: upOrd } = await admin
      .from('orders')
      .update({ status: 'under_review', updated_at: new Date().toISOString() })
      .eq('id', orderId)

    if (upOrd) {
      return NextResponse.json({ error: upOrd.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error servidor'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
