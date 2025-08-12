import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const { userId } = await req.json() as { userId?: string }
    if (!userId) return NextResponse.json({ error: 'No userId' }, { status: 400 })

    const admin = supabaseAdmin()

    // check admin
    const { data: au } = await admin.from('app_users').select('is_admin').eq('id', userId).single()
    if (!au?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // counts de números
    const [freeQ, heldQ, soldQ] = await Promise.all([
      admin.from('raffle_numbers').select('*', { count: 'exact', head: true }).eq('status', 'free'),
      admin.from('raffle_numbers').select('*', { count: 'exact', head: true }).eq('status', 'held'),
      admin.from('raffle_numbers').select('*', { count: 'exact', head: true }).eq('status', 'sold'),
    ])

    // últimas órdenes
    const { data: orders } = await admin
      .from('orders')
      .select('id,user_id,status,total_amount,price_per_number,created_at')
      .order('created_at', { ascending: false })
      .limit(30)

    const orderIds = (orders || []).map(o => o.id)
    const userIds  = (orders || []).map(o => o.user_id)

    // números por orden
    const { data: rowsNums } = await admin
      .from('raffle_numbers')
      .select('id,order_id')
      .in('order_id', orderIds)

    const numsByOrder: Record<string, number[]> = {}
    ;(rowsNums || []).forEach(r => {
      const k = String(r.order_id)
      ;(numsByOrder[k] ||= []).push(Number(r.id))
    })

    // emails
    const { data: users } = await admin
      .from('app_users')
      .select('id,email')
      .in('id', userIds)

    const emailById: Record<string, string> = {}
    ;(users || []).forEach(u => { emailById[String(u.id)] = u.email })

    // proofs
    const { data: proofs } = await admin
      .from('payment_proofs')
      .select('order_id,file_url')
      .in('order_id', orderIds)

    const proofByOrder: Record<string, string> = {}
    ;(proofs || []).forEach(p => { proofByOrder[String(p.order_id)] = p.file_url })

    return NextResponse.json({
      counts: {
        free: freeQ.count || 0,
        held: heldQ.count || 0,
        sold: soldQ.count || 0,
      },
      orders: (orders || []).map(o => ({
        ...o,
        email: emailById[String(o.user_id)] || '',
        numbers: numsByOrder[String(o.id)] || [],
        proofUrl: proofByOrder[String(o.id)] || null,
      })),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
