'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase'

export default function MyNumbers({ userId }: { userId?: string | null }) {
  const supa = useMemo(() => supabaseBrowser(), [])
  const [loading, setLoading] = useState(true)
  const [nums, setNums] = useState<number[]>([])

  useEffect(() => {
    if (!userId) return
    ;(async () => {
      setLoading(true)
      // buscar órdenes acreditadas del usuario
      const { data: ords } = await supa
        .from('orders')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'paid')
      const orderIds = (ords || []).map(o => o.id)
      if (!orderIds.length) { setNums([]); setLoading(false); return }

      const { data: rows } = await supa
        .from('raffle_numbers')
        .select('id')
        .in('order_id', orderIds)

      const list = (rows || []).map(r => Number(r.id)).sort((a,b)=>a-b)
      setNums(list)
      setLoading(false)
    })()
  }, [userId, supa])

  return (
    <div className="bg-white border rounded-2xl p-5 shadow-sm">
      <h3 className="font-semibold mb-2">Mis números</h3>
      {loading ? (
        <div className="h-16 rounded-xl bg-gray-100 animate-pulse" />
      ) : nums.length === 0 ? (
        <p className="text-sm text-gray-600">Se verán acá cuando tu pago esté acreditado.</p>
      ) : (
        <>
          <p className="text-sm text-gray-600 mb-2">Acreditados ({nums.length}):</p>
          <div className="max-h-40 overflow-auto flex flex-wrap gap-2">
            {nums.map(n => (
              <span key={n} className="px-2 py-1 rounded-lg bg-emerald-100 border text-sm">{n}</span>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
