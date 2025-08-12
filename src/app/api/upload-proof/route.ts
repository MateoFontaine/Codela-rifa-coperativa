import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

type Body = {
  userId: string
  orderId: string
  filePath: string      // p.ej. "ORDERID/1723494450000.jpg"
  publicUrl: string     // URL pública (en dev) o firmada (en prod)
  fileType?: string
  sizeBytes?: number
}

export async function POST(req: Request) {
  try {
    const { userId, orderId, filePath, publicUrl, fileType, sizeBytes } = (await req.json()) as Body
    if (!userId || !orderId || !filePath || !publicUrl) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const admin = supabaseAdmin()

    // 1) Validar orden y dueño
    const { data: ord, error: ordErr } = await admin
      .from('orders')
      .select('id,user_id,status')
      .eq('id', orderId)
      .single()

    if (ordErr || !ord) return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    if (ord.user_id !== userId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    if (['paid', 'canceled'].includes(String(ord.status))) {
      return NextResponse.json({ error: 'La orden ya está cerrada' }, { status: 409 })
    }

    // 2) Guardar/actualizar comprobante (unico por orden)
    const { error: upErr } = await admin
      .from('payment_proofs')
      .upsert(
        {
          order_id: orderId,
          user_id: ord.user_id,     // <- importante si la columna es NOT NULL
          file_url: publicUrl,
          file_path: filePath,
          file_type: fileType || null,
          size_bytes: sizeBytes ?? null,
          // created_at lo pone DEFAULT now()
        },
        { onConflict: 'order_id' }
      )
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 })

    // 3) Pasar orden a "under_review"
    const { error: upOrd } = await admin
      .from('orders')
      .update({ status: 'under_review', updated_at: new Date().toISOString() })
      .eq('id', orderId)

    if (upOrd) return NextResponse.json({ error: upOrd.message }, { status: 400 })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error servidor' }, { status: 500 })
  }
}
