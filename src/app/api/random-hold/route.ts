// src/app/api/random-hold/route.ts
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

type Body = { userId: string; qty: number }

export async function POST(req: Request) {
  try {
    const { userId, qty } = (await req.json()) as Body
    if (!userId || !Number.isFinite(qty)) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }
    const clamp = Math.max(1, Math.min(50, Math.floor(qty)))

    const admin = supabaseAdmin()
    const { data, error } = await admin.rpc('hold_random_numbers', {
      p_user: userId,
      p_qty: clamp,
      p_minutes: 10,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const held: number[] = (data || []).map((r: any) => Number(r.num)) // <- acá va 'num'
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString()
    return NextResponse.json({ held, expiresAt })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error servidor' }, { status: 500 })
  }
}
