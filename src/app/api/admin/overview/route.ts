import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Tipos de ayuda
type Status =
  | 'awaiting_proof'
  | 'under_review'
  | 'paid'
  | 'rejected'
  | 'canceled'
  | 'pending'

type Body = { userId: string }

type OrderRow = {
  id: string
  user_id: string
  status: Status
  total_amount: number
  price_per_number: number
  created_at: string
}

type RaffleRow = { id: number; order_id: string | null }
type AppUserRow = { id: string; email: string }
type ProofRow = { order_id: string; file_url: string | null }

export async function POST(req: Request) {
  try {
    const { userId } = (await req.json()) as Body
    if (!userId) return NextResponse.json({ error: 'No userId' }, { status: 400 })

    const admin = supabaseAdmin()

    // check admin
    const { data: au } = await admin
      .from('app_users')
      .select('is_admin')
      .eq('id', userId)
      .single()
    if (!au?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // counts de números
    const [freeQ, heldQ, soldQ] = await Promise.all([
      admin.from('raffle_numbers').select('*', { count: 'exact', head: true }).eq('status', 'free'),
      admin.from('raffle_numbers').select('*', { count: 'exact', head: true }).eq('status', 'held'),
      admin.from('raffle_numbers').select('*', { count: 'exact', head: true }).eq('status', 'sold'),
    ])

    // últimas órdenes
    const { data: ordersRaw } = await admin
      .from('orders')
      .select('id,user_id,status,total_amount,price_per_number,created_at')
      .order('created_at', { ascending: false })
      .limit(30)

    const orders: OrderRow[] = (ordersRaw as OrderRow[]) ?? []

    // Si no hay órdenes, devolver solo los counts
    if (orders.length === 0) {
      return NextResponse.json({
        counts: {
          free: freeQ.count ?? 0,
          held: heldQ.count ?? 0,
          sold: soldQ.count ?? 0,
        },
        orders: [],
      })
    }

    const orderIds = orders.map(o => o.id)
    const userIds = orders.map(o => o.user_id)

    // números por orden
    const { data: rowsNumsRaw } = await admin
      .from('raffle_numbers')
      .select('id,order_id')
      .in('order_id', orderIds)

    const rowsNums: RaffleRow[] = (rowsNumsRaw as RaffleRow[]) ?? []
    const numsByOrder: Record<string, number[]> = {}
    rowsNums.forEach(r => {
      const k = String(r.order_id)
      ;(numsByOrder[k] ||= []).push(Number(r.id))
    })

    // emails
    const { data: usersRaw } = await admin
      .from('app_users')
      .select('id,email')
      .in('id', userIds)

    const users: AppUserRow[] = (usersRaw as AppUserRow[]) ?? []
    const emailById: Record<string, string> = {}
    users.forEach(u => { emailById[String(u.id)] = u.email })

    // proofs
    const { data: proofsRaw } = await admin
      .from('payment_proofs')
      .select('order_id,file_url')
      .in('order_id', orderIds)

    const proofs: ProofRow[] = (proofsRaw as ProofRow[]) ?? []
    const proofByOrder: Record<string, string | null> = {}
    proofs.forEach(p => { proofByOrder[String(p.order_id)] = p.file_url })

    return NextResponse.json({
      counts: {
        free: freeQ.count ?? 0,
        held: heldQ.count ?? 0,
        sold: soldQ.count ?? 0,
      },
      orders: orders.map(o => ({
        ...o,
        email: emailById[String(o.user_id)] || '',
        numbers: numsByOrder[String(o.id)] || [],
        proofUrl: proofByOrder[String(o.id)] ?? null,
      })),
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
