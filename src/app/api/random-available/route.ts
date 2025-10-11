import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

type RandomAvailableResult = {
  id: number
  status: 'free' | 'held' | 'sold'
  held_by: string | null
  order_id: string | null
}

export async function POST(req: Request) {
  try {
    const { limit = 100 } = await req.json()
    
    const admin = supabaseAdmin()
    const nowIso = new Date().toISOString()

    // Primero liberar números vencidos
    await admin
      .from('raffle_numbers')
      .update({
        status: 'free',
        held_by: null,
        hold_expires_at: null,
        order_id: null,
        updated_at: nowIso,
      })
      .eq('status', 'held')
      .lt('hold_expires_at', nowIso)

    // Traer números disponibles usando una query que genere un offset aleatorio
    // Primero contar cuántos hay disponibles
    const { count } = await admin
      .from('raffle_numbers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'free')

    if (!count || count === 0) {
      return NextResponse.json({ results: [] })
    }

    // Generar un offset aleatorio
    const maxOffset = Math.max(0, count - limit)
    const randomOffset = Math.floor(Math.random() * (maxOffset + 1))

    // Traer números desde ese offset aleatorio
    const { data, error } = await admin
      .from('raffle_numbers')
      .select('id, status, held_by, order_id')
      .eq('status', 'free')
      .range(randomOffset, randomOffset + limit - 1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Shuffle adicional para más aleatoriedad
    const shuffled = (data as RandomAvailableResult[])
      .sort(() => Math.random() - 0.5)

    return NextResponse.json({ results: shuffled })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}