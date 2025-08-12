import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

type Body = { userId: string; numbers: number[] }

export async function POST(req: Request) {
  try {
    const { userId, numbers } = (await req.json()) as Body
    if (!userId || !Array.isArray(numbers) || numbers.length === 0) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const ids = Array.from(new Set(numbers.map(n => Number(n)))).filter(Number.isFinite)
    const admin = supabaseAdmin()

    // Traer estado actual de esos números
    const { data: rows, error: rowsErr } = await admin
      .from('raffle_numbers')
      .select('id,status,held_by,order_id')
      .in('id', ids)

    if (rowsErr) return NextResponse.json({ error: rowsErr.message }, { status: 400 })

    // Se pueden liberar sólo los que están en HOLD por el usuario y no tienen order_id
    const releasable = (rows || [])
      .filter(r => r.status === 'held' && r.held_by === userId && !r.order_id)
      .map(r => Number(r.id))

    if (releasable.length) {
      const { error: upErr } = await admin
        .from('raffle_numbers')
        .update({ status: 'free', held_by: null, hold_expires_at: null, updated_at: new Date().toISOString() })
        .in('id', releasable)
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 })
    }

    // Devolvemos exactamente qué IDs se liberaron y cuáles quedaron sin tocar
    const released = releasable
    const skipped  = ids.filter(id => !released.includes(id))

    return NextResponse.json({ released, skipped })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error servidor' }, { status: 500 })
  }
}
