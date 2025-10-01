import { NextResponse } from 'next/server'
import { checkPurchaseLimits } from '@/lib/purchase-limits'

export async function POST(req: Request) {
  try {
    const { userId } = await req.json()
    if (!userId) {
      return NextResponse.json({ error: 'Falta userId' }, { status: 400 })
    }

    const limitCheck = await checkPurchaseLimits(userId, 1)

    return NextResponse.json(limitCheck)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}