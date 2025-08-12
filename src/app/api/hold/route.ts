import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

type Body = { userId: string; numbers: number[]; holdMinutes?: number }
type RaffleIdRow = { id: number }

const MAX_PER_ORDER = 50

export async function POST(req: Request) {
  try {
    const { userId, numbers, holdMinutes = 10 } = (await req.json()) as Body
    if (!userId || !Array.isArray(numbers) || numbers.length === 0) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    // normalizar + tope
    const unique = Array.from(new Set(numbers.map(n => Number(n))))
      .filter(Number.isFinite)
      .slice(0, MAX_PER_ORDER)

    if (unique.length === 0) {
      return NextResponse.json({ error: 'Números inválidos' }, { status: 400 })
    }

    const admin = supabaseAdmin()
    const nowIso = new Date().toISOString()
    const expiresAt = new Date(Date.now() + holdMinutes * 60_000).toISOString()

    // 1) liberar vencidos dentro del set (si alguno estaba HELD + vencido)
    await admin
      .from('raffle_numbers')
      .update({
        status: 'free',
        held_by: null,
        hold_expires_at: null,
        order_id: null,
        updated_at: nowIso,
      })
      .in('id', unique)
      .eq('status', 'held')
      .lt('hold_expires_at', nowIso)

    // 2) tomar todos los que estén libres ahora
    const { data: taken, error } = await admin
      .from('raffle_numbers')
      .update({
        status: 'held',
        held_by: userId,
        hold_expires_at: expiresAt,
        updated_at: nowIso,
      })
      .in('id', unique)
      .eq('status', 'free')
      .select('id')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const okIds = ((taken ?? []) as RaffleIdRow[]).map(r => Number(r.id))
    const results = unique.map(num => ({
      num,
      ok: okIds.includes(num),
      reason: okIds.includes(num) ? undefined : 'not_available',
    }))

    return NextResponse.json({ results, expiresAt })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
