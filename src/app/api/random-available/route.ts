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

    // 👇 ELIMINADO: Ya NO liberamos números vencidos porque no expiran
    // (Todo el bloque de líneas 13-23 se elimina)

    // Contar números disponibles
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