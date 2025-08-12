import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

type Body = { userId: string; numbers: number[] }
const PRICE = 1000 // ARS

// usar Web Crypto (funciona en Node y Edge)
async function sha256Hex(text: string) {
  const enc = new TextEncoder().encode(text)
  const buf = await crypto.subtle.digest('SHA-256', enc)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32)
}

export async function POST(req: Request) {
  try {
    const { userId, numbers } = (await req.json()) as Body
    if (!userId || !Array.isArray(numbers) || numbers.length === 0) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const ids = Array.from(new Set(numbers.map(n => Number(n)))).filter(Number.isFinite).sort((a,b)=>a-b)
    if (ids.length === 0 || ids.length > 10) {
      return NextResponse.json({ error: 'Cantidad inválida (1 a 10)' }, { status: 400 })
    }

    const admin = supabaseAdmin()
    const nowIso = new Date().toISOString()

    // estado actual de esos números
    const { data: rows, error: rowsErr } = await admin
      .from('raffle_numbers')
      .select('id,status,held_by,order_id')
      .in('id', ids)
    if (rowsErr) return NextResponse.json({ error: rowsErr.message }, { status: 400 })

    // validar que sean tuyos (held_by tú) o ya estén en una orden (chequeamos dueño abajo)
    const invalid = ids.filter(id => {
      const r = rows?.find(x => x.id === id)
      return !r || !((r.status === 'held' && r.held_by === userId) || r.order_id)
    })
    if (invalid.length) {
      return NextResponse.json({ error: 'Algunos números no están reservados por vos', missing: invalid }, { status: 409 })
    }

    // si ya están en una orden, reutilizarla (y validar dueño)
    const inOrderIds = Array.from(new Set((rows || []).filter(r => r.order_id).map(r => String(r.order_id))))
    if (inOrderIds.length) {
      if (inOrderIds.length > 1) {
        return NextResponse.json({ error: 'Los números pertenecen a órdenes distintas' }, { status: 409 })
      }
      const existingOrderId = inOrderIds[0]
      const { data: ord, error: ordErr } = await admin
        .from('orders')
        .select('id,user_id,status,price_per_number,total_amount')
        .eq('id', existingOrderId)
        .single()
      if (ordErr || !ord) return NextResponse.json({ error: 'Orden existente no encontrada' }, { status: 404 })
      if (ord.user_id !== userId) return NextResponse.json({ error: 'No autorizado (orden de otro usuario)' }, { status: 403 })
      if (['paid','canceled'].includes(String(ord.status))) {
        return NextResponse.json({ error: 'La orden ya fue cerrada' }, { status: 409 })
      }

      // adjuntar cualquier número HELD por vos aún sin order_id
      const attachIds = (rows || []).filter(r => r.status === 'held' && r.held_by === userId && !r.order_id).map(r => r.id as number)
      if (attachIds.length) {
        await admin
          .from('raffle_numbers')
          .update({ order_id: existingOrderId, updated_at: nowIso })
          .in('id', attachIds)
          .eq('status', 'held')
          .eq('held_by', userId)
          .is('order_id', null)
      }

      const { data: numsInOrder } = await admin.from('raffle_numbers').select('id').eq('order_id', existingOrderId)
      const price = ord.price_per_number ?? PRICE
      const total = (numsInOrder?.length || 0) * price
      return NextResponse.json({
        orderId: existingOrderId,
        total,
        price,
        numbers: (numsInOrder || []).map((r: any) => Number(r.id))
      })
    }

    // no había orden -> crear 1 sola (idempotente)
    const fingerprint = await sha256Hex(`${userId}:${ids.join(',')}`)

    // intentamos INSERT; si choca por índice único (otro request ganó), seleccionamos la existente
    let orderId: string | null = null
    const tryInsert = await admin
      .from('orders')
      .insert({
        user_id: userId,
        status: 'awaiting_proof',
        total_amount: ids.length * PRICE,
        price_per_number: PRICE,
        fingerprint
      })
      .select('id')
      .single()

    if (tryInsert.error) {
      // ¿índice único violado? (23505)
      const msg = String(tryInsert.error.message || '')
      if (!msg.includes('duplicate key') && tryInsert.error.code !== '23505') {
        return NextResponse.json({ error: tryInsert.error.message }, { status: 400 })
      }
      const existing = await admin
        .from('orders')
        .select('id')
        .eq('user_id', userId)
        .eq('fingerprint', fingerprint)
        .in('status', ['awaiting_proof','under_review'])
        .single()
      if (existing.error || !existing.data) {
        return NextResponse.json({ error: existing.error?.message || 'No se pudo reutilizar la orden' }, { status: 400 })
      }
      orderId = existing.data.id as string
    } else {
      orderId = tryInsert.data!.id as string
    }

    // asociar números a esa orden (si otro request ya los asoció, esta query no toca nada)
    await admin
      .from('raffle_numbers')
      .update({ order_id: orderId, updated_at: nowIso })
      .in('id', ids)
      .eq('status', 'held')
      .eq('held_by', userId)
      .is('order_id', null)

    // leer números efectivos en la orden
    const { data: numsNow } = await admin.from('raffle_numbers').select('id').eq('order_id', orderId)
    const numbersInOrder = (numsNow || []).map((r: any) => Number(r.id))

    const price = PRICE
    const total = (numbersInOrder.length || ids.length) * price

    return NextResponse.json({
      orderId,
      total,
      price,
      numbers: numbersInOrder.length ? numbersInOrder : ids
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error servidor' }, { status: 500 })
  }
}
