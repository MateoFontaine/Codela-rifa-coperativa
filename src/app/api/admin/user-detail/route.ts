// src/app/api/admin/user-detail/route.ts
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

type Status = 'awaiting_proof' | 'under_review' | 'paid' | 'rejected' | 'canceled' | 'pending'

type AppUserBase = { id: string; email: string }
type MaybeProfileFields = { name?: string | null; dni?: string | number | null }

type OrderRow = { id: string; user_id: string; status: Status; total_amount: number | null; created_at: string }
type RaffleNumberByOrder = { id: number; order_id: string }
type RaffleHeldRow = { id: number; held_by: string; status: 'held' | 'free' | 'sold' }
type ProofRow = { order_id: string; file_url: string }

type UserDetailResponse = {
  user: { id: string; nombre: string | null; email: string; dni: string | number | null }
  numbers: number[]                  // todos los números del usuario (vendidos + held)
  pendingCount: number               // órdenes pendientes
  orders: Array<{
    id: string
    status: Status
    total_amount: number
    created_at: string
    numbers: number[]
    proofUrl: string | null
  }>
}

export async function POST(req: Request) {
  try {
    const { userId, targetId } = (await req.json()) as { userId?: string; targetId?: string }
    if (!userId || !targetId) return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })

    const admin = supabaseAdmin()

    // 1) Validar admin
    const { data: au } = await admin.from('app_users').select('is_admin').eq('id', userId).single()
    if (!au?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // 2) Traer usuario (con name/dni si existen)
    let userRow: (AppUserBase & MaybeProfileFields) | null = null
    const tryFull = await admin.from('app_users').select('id,email,name,dni').eq('id', targetId).single()
    if (tryFull.error) {
      const fb = await admin.from('app_users').select('id,email').eq('id', targetId).single()
      if (fb.error || !fb.data) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
      userRow = fb.data as (AppUserBase & MaybeProfileFields)
    } else {
      userRow = (tryFull.data || null) as (AppUserBase & MaybeProfileFields) | null
      if (!userRow) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // 3) Órdenes del usuario
    const { data: orders, error: ordErr } = await admin
      .from('orders')
      .select('id,user_id,status,total_amount,created_at')
      .eq('user_id', targetId)
      .order('created_at', { ascending: false })

    if (ordErr) return NextResponse.json({ error: ordErr.message }, { status: 400 })

    const orderIds = (orders || []).map(o => o.id)

    // 4) Números vendidos por orden
    let numsByOrder: Record<string, number[]> = {}
    if (orderIds.length) {
      const { data: rowsNums, error: numsErr } = await admin
        .from('raffle_numbers')
        .select('id,order_id')
        .in('order_id', orderIds)

      if (numsErr) return NextResponse.json({ error: numsErr.message }, { status: 400 })

      numsByOrder = {}
      ;(rowsNums || []).forEach((r: RaffleNumberByOrder) => {
        const k = String(r.order_id)
        ;(numsByOrder[k] ||= []).push(Number(r.id))
      })
    }

    // 5) Números en HOLD del usuario
    const { data: heldRows, error: heldErr } = await admin
      .from('raffle_numbers')
      .select('id,held_by,status')
      .eq('held_by', targetId)
      .eq('status', 'held')

    if (heldErr) return NextResponse.json({ error: heldErr.message }, { status: 400 })

    const heldNums = (heldRows || []).map((r: RaffleHeldRow) => Number(r.id))

    // 6) Proofs por orden (si existen)
    let proofByOrder: Record<string, string> = {}
    if (orderIds.length) {
      const { data: proofs } = await admin
        .from('payment_proofs')
        .select('order_id,file_url')
        .in('order_id', orderIds)
      proofByOrder = {}
      ;(proofs || []).forEach((p: ProofRow) => { proofByOrder[p.order_id] = p.file_url })
    }

    // 7) Armar detalle de órdenes
    const ordersOut = (orders || []).map((o: OrderRow) => ({
      id: o.id,
      status: o.status,
      total_amount: o.total_amount ?? 0,
      created_at: o.created_at,
      numbers: numsByOrder[o.id] ? numsByOrder[o.id].slice().sort((a, b) => a - b) : [],
      proofUrl: proofByOrder[o.id] || null,
    }))

    // 8) Pendientes
    const pendingCount = (orders || []).filter(o =>
      ['awaiting_proof', 'under_review', 'pending'].includes(o.status)
    ).length

    // 9) Todos los números del usuario (vendidos + held)
    const soldAll = ordersOut.flatMap(o => o.numbers)
    const allNumbers = Array.from(new Set([...soldAll, ...heldNums])).sort((a, b) => a - b)

    const payload: UserDetailResponse = {
      user: {
        id: userRow.id,
        nombre: (userRow as MaybeProfileFields).name ?? null,
        email: userRow.email,
        dni: (userRow as MaybeProfileFields).dni ?? null,
      },
      numbers: allNumbers,
      pendingCount,
      orders: ordersOut,
    }

    return NextResponse.json(payload)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
