// src/app/api/admin/users/route.ts
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

type AppUserBase = { id: string; email: string }
// Si existen en tu DB, los usaremos. Si no existen, devolvemos null sin romper.
type MaybeProfileFields = { name?: string | null; dni?: string | number | null }

type OrderRow = { id: string; user_id: string; status: string }
type RaffleNumberByOrder = { id: number; order_id: string }
type RaffleHeldRow = { id: number; held_by: string; status: 'held' | 'free' | 'sold' }

type UserOut = {
  id: string
  nombre: string | null
  email: string
  dni: string | number | null
  numeros: number[]
  ordenesPendientes: number
}

export async function POST(req: Request) {
  try {
    const { userId } = (await req.json()) as { userId?: string }
    if (!userId) return NextResponse.json({ error: 'Falta userId' }, { status: 400 })

    const admin = supabaseAdmin()

    // 1) Validar que sea admin
    const { data: au } = await admin.from('app_users').select('is_admin').eq('id', userId).single()
    if (!au?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // 2) Traer usuarios (intenta name,dni; si no existen, fallback a id,email)
    let users: (AppUserBase & MaybeProfileFields)[] = []
    const tryFull = await admin.from('app_users').select('id,email,name,dni').limit(500)
    if (tryFull.error) {
      // Fallback si columnas no existen
      const fallback = await admin.from('app_users').select('id,email').limit(500)
      if (fallback.error || !fallback.data) {
        return NextResponse.json({ error: fallback.error?.message || 'No se pudo leer usuarios' }, { status: 400 })
      }
      users = fallback.data as (AppUserBase & MaybeProfileFields)[]
    } else {
      users = (tryFull.data || []) as (AppUserBase & MaybeProfileFields)[]
    }

    if (users.length === 0) {
      return NextResponse.json({ users: [] })
    }

    const userIds = users.map(u => u.id)

    // 3) Órdenes de estos usuarios
    const { data: orders, error: ordErr } = await admin
      .from('orders')
      .select('id,user_id,status')
      .in('user_id', userIds)
    if (ordErr) return NextResponse.json({ error: ordErr.message }, { status: 400 })

    const orderIds = (orders || []).map(o => o.id)

    // 4) Números vendidos (por orden)
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

    // 5) Números actualmente en HOLD por cada usuario
    const { data: heldRows, error: heldErr } = await admin
      .from('raffle_numbers')
      .select('id,held_by,status')
      .in('held_by', userIds)
      .eq('status', 'held')

    if (heldErr) return NextResponse.json({ error: heldErr.message }, { status: 400 })

    const heldByUser: Record<string, number[]> = {}
    ;(heldRows || []).forEach((r: RaffleHeldRow) => {
      ;(heldByUser[r.held_by] ||= []).push(Number(r.id))
    })

    // 6) Pendientes por usuario (awaiting_proof | under_review | pending)
    const pendingByUser: Record<string, number> = {}
    ;(orders || []).forEach((o: OrderRow) => {
      const isPending = ['awaiting_proof', 'under_review', 'pending'].includes(String(o.status))
      if (isPending) pendingByUser[o.user_id] = (pendingByUser[o.user_id] || 0) + 1
    })

    // 7) Armar salida
    const result: UserOut[] = users.map(u => {
      // Números por órdenes del usuario
      const myOrderIds = (orders || []).filter(o => o.user_id === u.id).map(o => o.id)
      const soldNums = myOrderIds.flatMap(oid => numsByOrder[oid] || [])
      const heldNums = heldByUser[u.id] || []
      const numeros = Array.from(new Set([...soldNums, ...heldNums])).sort((a, b) => a - b)

      return {
        id: u.id,
        nombre: (u as MaybeProfileFields).name ?? null,
        email: u.email,
        dni: (u as MaybeProfileFields).dni ?? null,
        numeros,
        ordenesPendientes: pendingByUser[u.id] || 0,
      }
    })

    return NextResponse.json({ users: result })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
