import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
// import { sendComprobantRecibido } from '@/lib/email' // 👈 COMENTADO

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
  filePath: string // p.ej. "ORDERID/1723494450000.jpg"
  publicUrl: string // URL pública (dev) o firmada (prod)
  fileType?: string
  sizeBytes?: number
  notes?: string | null
}

type OrderRow = {
  id: string
  user_id: string
  status: Status
  total_amount: number
}

export async function POST(req: Request) {
  try {
    const { userId, orderId, filePath, publicUrl, fileType, sizeBytes, notes } = (await req.json()) as Body
    
    if (!userId || !orderId || !filePath || !publicUrl) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const admin = supabaseAdmin()

    // 1) Validar orden y dueño
    const { data: ordRaw, error: ordErr } = await admin
      .from('orders')
      .select('id,user_id,status,total_amount')
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

    // 2) Guardar/actualizar comprobante (único por orden) con notas
    const { error: upErr } = await admin
      .from('payment_proofs')
      .upsert(
        {
          order_id: orderId,
          user_id: ord.user_id,
          file_url: publicUrl,
          file_path: filePath,
          file_type: fileType ?? null,
          size_bytes: sizeBytes ?? null,
          notes: notes ?? null,
          uploaded_at: new Date().toISOString(),
        },
        { onConflict: 'order_id' }
      )

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 400 })
    }

    // 3) 👇 NUEVO: Verificar si es vendedor
    const { data: userData } = await admin
      .from('app_users')
      .select('role')
      .eq('id', ord.user_id)
      .single()

    const isVendedor = userData?.role === 'vendedor'

    // Si es vendedor → paid, si no → under_review
    const newStatus = isVendedor ? 'paid' : 'under_review'

    const { error: upOrd } = await admin
      .from('orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId)

    if (upOrd) {
      return NextResponse.json({ error: upOrd.message }, { status: 400 })
    }

    // 👇 NUEVO: Si es vendedor, marcar números como sold
    if (isVendedor) {
      await admin
        .from('raffle_numbers')
        .update({ status: 'sold', updated_at: new Date().toISOString() })
        .eq('order_id', orderId)
    }

    // 4) Email deshabilitado temporalmente
    /*
    try {
      const { data: userRow, error: userErr } = await admin
        .from('app_users')
        .select('email')
        .eq('id', userId)
        .single()
      if (userErr || !userRow?.email) {
        console.error('Error obteniendo email del usuario:', userErr)
      } else {
        const emailResult = await sendComprobantRecibido(
          userRow.email,
          orderId,
          ord.total_amount || 0
        )
        if (!emailResult.success) {
          console.error('Error enviando email de comprobante:', emailResult.error)
        }
      }
    } catch (emailError) {
      console.error('Error en proceso de email:', emailError)
    }
    */

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error servidor'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}