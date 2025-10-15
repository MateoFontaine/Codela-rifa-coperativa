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

    // Buscar números que terminen con el query
    const queryNum = parseInt(query)
    const modulo = Math.pow(10, query.length)
    
    // Generar lista de números que terminan con el query
    // Por ejemplo si query es "123" y tenemos hasta 99999:
    // Buscamos: 123, 1123, 2123, 3123... hasta encontrar suficientes
    const idsToSearch: number[] = []
    for (let i = queryNum; i <= 99999 && idsToSearch.length < limit * 2; i += modulo) {
      idsToSearch.push(i)
    }

    const { data, error } = await admin
      .from('raffle_numbers')
      .select('id, status, held_by, order_id')
      .in('id', idsToSearch)
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