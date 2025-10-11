import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

type SearchResult = {
  id: number
  status: 'free' | 'held' | 'sold'
  held_by: string | null
  order_id: string | null
}

export async function POST(req: Request) {
  try {
    const { query, limit = 20 } = await req.json()
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query inválido' }, { status: 400 })
    }

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

    // Buscar números que empiecen con el query
    // Convertimos el id a texto para hacer la búsqueda
    const { data, error } = await admin
      .from('raffle_numbers')
      .select('id, status, held_by, order_id')
      .gte('id', parseInt(query))
      .lt('id', parseInt(query + '9'.repeat(6 - query.length)))
      .order('id', { ascending: true })
      .limit(limit)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ results: data as SearchResult[] })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}