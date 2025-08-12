// src/app/api/random-hold/route.ts
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

type Body = { userId: string; qty: number }
type RpcRow = { num: number }

const MAX_PER_ORDER = 50
const HOLD_MINUTES = 10

export async function POST(req: Request) {
  try {
    const { userId, qty } = (await req.json()) as Body
    if (!userId || typeof qty !== 'number' || !Number.isFinite(qty)) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const clamp = Math.max(1, Math.min(MAX_PER_ORDER, Math.floor(qty)))

    const admin = supabaseAdmin()
    const { data, error } = await admin.rpc('hold_random_numbers', {
      p_user: userId,
      p_qty: clamp,
      p_minutes: HOLD_MINUTES,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const rows = (data as RpcRow[]) ?? []
    const held = rows.map(r => Number(r.num))
    const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60_000).toISOString()

    return NextResponse.json({ held, expiresAt })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error servidor'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
