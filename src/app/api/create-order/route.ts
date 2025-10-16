import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { checkPurchaseLimits } from '@/lib/purchase-limits'

type Body = { userId: string; numbers: number[]; notes?: string }
type OrderLite = {
  id: string
  user_id: string
  status: string
  price_per_number: number | null
  total_amount: number | null
}
type RaffleRow = {
  id: number
  status: 'free' | 'held' | 'sold'
  held_by: string | null
  order_id: string | null
}

const PRICE = 1000 // ARS
const MAX_PER_ORDER = 50

async function sha256Hex(text: string) {
  const enc = new TextEncoder().encode(text)
  const buf = await crypto.subtle.digest('SHA-256', enc)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32)
}

export async function POST(req: Request) {
  try {
    const { userId, numbers, notes } = (await req.json()) as Body
    if (!userId || !Array.isArray(numbers) || numbers.length === 0) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const ids = Array.from(new Set(numbers.map((n) => Number(n))))
      .filter(Number.isFinite)
      .sort((a, b) => a - b)

    if (ids.length === 0 || ids.length > MAX_PER_ORDER) {
      return NextResponse.json(
        { error: `Cantidad inválida (1 a ${MAX_PER_ORDER})` },
        { status: 400 }
      )
    }

    const admin = supabaseAdmin()
    const nowIso = new Date().toISOString()

    // 👇 NUEVO: Verificar si es vendedor AL INICIO
    const { data: userData } = await admin
      .from('app_users')
      .select('role')
      .eq('id', userId)
      .single()

    const isVendedor = userData?.role === 'vendedor'

    // ✅ VALIDAR LÍMITES DE COMPRA (solo si NO es vendedor)
    if (!isVendedor) {
      const limitCheck = await checkPurchaseLimits(userId, ids.length)
      if (!limitCheck.canPurchase) {
        return NextResponse.json(
          {
            error: limitCheck.reason,
            limitExceeded: true,
            details: {
              activePurchases: limitCheck.activePurchases,
              maxPurchases: limitCheck.maxPurchases,
              nextAvailableAt: limitCheck.nextAvailableAt,
              hoursRemaining: limitCheck.hoursRemaining,
            },
          },
          { status: 429 }
        )
      }
    }

    // estado actual de esos números
    const { data: rows, error: rowsErr } = await admin
      .from('raffle_numbers')
      .select('id,status,held_by,order_id')
      .in('id', ids)

    if (rowsErr) {
      return NextResponse.json({ error: rowsErr.message }, { status: 400 })
    }

    const rlist: RaffleRow[] = (rows as RaffleRow[]) ?? []

    // validar que sean tuyos (held_by tú) o ya estén en una orden (chequeamos dueño abajo)
    const invalid = ids.filter((id) => {
      const r = rlist.find((x) => x.id === id)
      return !r || !((r.status === 'held' && r.held_by === userId) || r.order_id)
    })
    if (invalid.length) {
      return NextResponse.json(
        {
          error: 'Algunos números no están reservados por vos',
          missing: invalid,
        },
        { status: 409 }
      )
    }

    // si ya están en una orden, reutilizarla (y validar dueño)
    const inOrderIds = Array.from(
      new Set(rlist.filter((r) => r.order_id).map((r) => String(r.order_id)))
    )

    if (inOrderIds.length) {
      if (inOrderIds.length > 1) {
        return NextResponse.json(
          { error: 'Los números pertenecen a órdenes distintas' },
          { status: 409 }
        )
      }

      const existingOrderId = inOrderIds[0]
      const { data: ord, error: ordErr } = await admin
        .from('orders')
        .select('id,user_id,status,price_per_number,total_amount')
        .eq('id', existingOrderId)
        .single()

      const orderRow = ord as OrderLite | null
      if (ordErr || !orderRow) {
        return NextResponse.json(
          { error: 'Orden existente no encontrada' },
          { status: 404 }
        )
      }
      if (orderRow.user_id !== userId) {
        return NextResponse.json(
          { error: 'No autorizado (orden de otro usuario)' },
          { status: 403 }
        )
      }
      if (['paid', 'canceled'].includes(String(orderRow.status))) {
        return NextResponse.json(
          { error: 'La orden ya fue cerrada' },
          { status: 409 }
        )
      }

      if (notes !== undefined) {
        await admin
          .from('orders')
          .update({ notes: notes?.trim() || null, updated_at: nowIso })
          .eq('id', existingOrderId)
      }

      // adjuntar cualquier número HELD por vos aún sin order_id
      const attachIds = rlist
        .filter((r) => r.status === 'held' && r.held_by === userId && !r.order_id)
        .map((r) => r.id)

      if (attachIds.length) {
        await admin
          .from('raffle_numbers')
          .update({ 
            order_id: existingOrderId, 
            hold_expires_at: null,
            status: isVendedor ? 'sold' : 'held',  // 👈 NUEVO
            updated_at: nowIso 
          })
          .in('id', attachIds)
          .eq('status', 'held')
          .eq('held_by', userId)
          .is('order_id', null)
      }

      const { data: numsInOrder } = await admin
        .from('raffle_numbers')
        .select('id')
        .eq('order_id', existingOrderId)

      const price = orderRow.price_per_number ?? PRICE
      const list = (numsInOrder ?? []).map((r) => Number(r.id))
      const total = list.length * price

      return NextResponse.json({
        orderId: existingOrderId,
        total,
        price,
        numbers: list,
      })
    }

    // no había orden -> crear 1 sola (idempotente)
    const fingerprint = await sha256Hex(`${userId}:${ids.join(',')}`)

    let orderId: string

    // 👇 NUEVO: Estado inicial según si es vendedor
    const tryInsert = await admin
      .from('orders')
      .insert({
        user_id: userId,
        status: isVendedor ? 'paid' : 'awaiting_proof',  // 👈 CAMBIO
        total_amount: ids.length * PRICE,
        price_per_number: PRICE,
        fingerprint,
        notes: notes?.trim() || null,
      })
      .select('id')
      .single()

    if (tryInsert.error) {
      const msg = String(tryInsert.error.message || '')
      if (!msg.includes('duplicate key') && tryInsert.error.code !== '23505') {
        return NextResponse.json({ error: tryInsert.error.message }, { status: 400 })
      }
      const existing = await admin
        .from('orders')
        .select('id')
        .eq('user_id', userId)
        .eq('fingerprint', fingerprint)
        .in('status', ['awaiting_proof', 'under_review', 'paid'])  // 👈 AGREGADO 'paid'
        .single()

      if (existing.error || !existing.data) {
        return NextResponse.json(
          { error: existing.error?.message || 'No se pudo reutilizar la orden' },
          { status: 400 }
        )
      }
      orderId = (existing.data as { id: string }).id
      
      if (notes !== undefined) {
        await admin
          .from('orders')
          .update({ notes: notes?.trim() || null, updated_at: nowIso })
          .eq('id', orderId)
      }
    } else {
      orderId = (tryInsert.data as { id: string }).id
    }

    // 👇 NUEVO: Estado de números según si es vendedor
    await admin
      .from('raffle_numbers')
      .update({ 
        order_id: orderId, 
        hold_expires_at: null,
        status: isVendedor ? 'sold' : 'held',  // 👈 CAMBIO
        updated_at: nowIso 
      })
      .in('id', ids)
      .eq('status', 'held')
      .eq('held_by', userId)
      .is('order_id', null)

    const { data: numsNow } = await admin
      .from('raffle_numbers')
      .select('id')
      .eq('order_id', orderId)

    const numbersInOrder = (numsNow ?? []).map((r) => Number(r.id))
    const price = PRICE
    const total = (numbersInOrder.length || ids.length) * price

    return NextResponse.json({
      orderId,
      total,
      price,
      numbers: numbersInOrder.length ? numbersInOrder : ids,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error servidor'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}