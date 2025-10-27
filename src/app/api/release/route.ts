import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

type Body = { userId: string; numbers: number[] }
type RaffleRow = {
  id: number
  status: 'free' | 'held' | 'sold'
  held_by: string | null
  order_id: string | null
}

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

    if (rowsErr) {
      return NextResponse.json({ error: rowsErr.message }, { status: 400 })
    }

    const list = (rows as RaffleRow[]) ?? []

    // Se pueden liberar sólo los que están en HOLD por el usuario y no tienen order_id
    const releasable = list
      .filter(r => r.status === 'held' && r.held_by === userId && !r.order_id)
      .map(r => Number(r.id))

    if (releasable.length) {
      const { error: upErr } = await admin
        .from('raffle_numbers')
        .update({
          status: 'free',
          held_by: null,
          hold_expires_at: null,  // 👈 Ya no es necesario pero no hace daño
          updated_at: new Date().toISOString(),
        })
        .in('id', releasable)

      if (upErr) {
        return NextResponse.json({ error: upErr.message }, { status: 400 })
      }
    }

    // Devolvemos exactamente qué IDs se liberaron y cuáles quedaron sin tocar
    const released = releasable
    const skipped = ids.filter(id => !released.includes(id))

    return NextResponse.json({ released, skipped })
    
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error servidor'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}