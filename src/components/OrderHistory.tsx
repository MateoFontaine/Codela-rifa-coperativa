'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase'

type Order = {
  id: string
  status: 'awaiting_proof' | 'under_review' | 'paid' | 'rejected' | 'canceled' | 'pending'
  total_amount: number
  created_at: string
}

export default function OrderHistory({ userId }: { userId?: string | null }) {
  const router = useRouter()
  const supa = useMemo(() => supabaseBrowser(), [])

  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [numsByOrder, setNumsByOrder] = useState<Record<string, number[]>>({})
  const [proofUrlByOrder, setProofUrlByOrder] = useState<Record<string, string>>({})
  const [confirmOrderId, setConfirmOrderId] = useState<string | null>(null) // modal

  useEffect(() => {
    if (!userId) return
    ;(async () => {
      setLoading(true)

      // Últimas 5 órdenes del usuario
      const { data: ords } = await supa
        .from('orders')
        .select('id,status,total_amount,created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5)

      if (!ords?.length) {
        setOrders([])
        setNumsByOrder({})
        setProofUrlByOrder({})
        setLoading(false)
        return
      }
      setOrders(ords as Order[])
      const ids = ords.map(o => o.id)

      // Números de esas órdenes
      const { data: nums } = await supa
        .from('raffle_numbers')
        .select('id,order_id')
        .in('order_id', ids)

      const mapNums: Record<string, number[]> = {}
      ;(nums || []).forEach((r: any) => {
        const k = r.order_id as string
        mapNums[k] = mapNums[k] || []
        mapNums[k].push(Number(r.id))
      })

      // Comprobantes (si existen)
      const { data: proofs } = await supa
        .from('payment_proofs')
        .select('order_id,file_url')
        .in('order_id', ids)

      const mapProof: Record<string, string> = {}
      ;(proofs || []).forEach((p: any) => { mapProof[p.order_id] = p.file_url })

      setNumsByOrder(mapNums)
      setProofUrlByOrder(mapProof)
      setLoading(false)
    })()
  }, [userId, supa])

  const badge = (s: Order['status']) => {
    const base = 'px-2 py-1 rounded-lg text-xs border'
    switch (s) {
      case 'awaiting_proof': return <span className={`${base} bg-amber-100 border-amber-200`}>Esperando comprobante</span>
      case 'under_review':  return <span className={`${base} bg-blue-100 border-blue-200`}>En revisión</span>
      case 'paid':          return <span className={`${base} bg-emerald-100 border-emerald-200`}>Acreditada</span>
      case 'rejected':      return <span className={`${base} bg-rose-100 border-rose-200`}>Rechazada</span>
      case 'canceled':      return <span className={`${base} bg-gray-100 border-gray-200`}>Cancelada</span>
      default:              return <span className={`${base} bg-gray-100 border-gray-200`}>{s}</span>
    }
  }

  const deleteProof = async (orderId: string) => {
    setConfirmOrderId(null)
    try {
      const res = await fetch('/api/delete-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, orderId })
      })
      const j = await res.json()
      if (!res.ok && !j?.ok) throw new Error(j?.error || 'No se pudo eliminar el comprobante')

      setProofUrlByOrder(prev => {
        const copy = { ...prev }; delete copy[orderId]; return copy
      })
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'awaiting_proof' } : o))
      alert('Comprobante eliminado. Podés subir uno nuevo.')
    } catch (e: any) {
      alert(e?.message || 'Error al eliminar comprobante')
    }
  }

  if (!userId) return null

  return (
    <div className="bg-white border rounded-2xl p-5 shadow-sm">
      <h3 className="font-semibold mb-2">Historial de compras</h3>
      <p className="text-sm text-gray-600 mb-4">Últimas 5 órdenes</p>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <p className="text-sm text-gray-600">Todavía no tenés compras.</p>
      ) : (
        <ul className="space-y-3">
          {orders.map(o => {
            const numbers = (numsByOrder[o.id] || []).slice().sort((a,b)=>a-b)
            const totalFmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(o.total_amount || 0)
            const proofUrl = proofUrlByOrder[o.id]
            const created = new Date(o.created_at).toLocaleString('es-AR')

            return (
              <li key={o.id} className="border rounded-xl p-3">
                <div className="flex items-center gap-2 justify-between">
                  <div className="text-sm">
                    <div className="font-medium">Orden {o.id.slice(0,8)}…</div>
                    <div className="text-gray-600">{created}</div>
                  </div>
                  {badge(o.status)}
                </div>

                <div className="mt-2 text-sm">
                  <div className="text-gray-600">Números ({numbers.length}):</div>
                  <div className="flex flex-wrap gap-1 mt-1 max-h-24 overflow-auto">
                    {numbers.map(n => (
                      <span key={n} className="px-2 py-0.5 rounded bg-amber-100 border text-xs">{n}</span>
                    ))}
                  </div>
                  <div className="mt-2">Total: <b>{totalFmt}</b></div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {/* Subir/Ver/Eliminar comprobante según estado */}
                  {!proofUrl && o.status === 'awaiting_proof' && (
                    <button
                      onClick={() => router.push(`/checkout?order=${o.id}`)}
                      className="px-3 py-2 rounded-xl bg-black text-white"
                    >
                      Subir comprobante
                    </button>
                  )}

                  {proofUrl && (
                    <>
                      <a href={proofUrl} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-xl border">
                        Ver comprobante
                      </a>

                      {(o.status === 'under_review' || o.status === 'rejected') && (
                        <button
                          onClick={() => setConfirmOrderId(o.id)}
                          className="px-3 py-2 rounded-xl bg-rose-600 text-white"
                        >
                          Eliminar comprobante
                        </button>
                      )}
                    </>
                  )}

                  {o.status === 'under_review' && (
                    <span className="text-sm text-gray-600">Estamos revisando tu pago.</span>
                  )}
                  {o.status === 'paid' && (
                    <span className="text-sm text-emerald-700">Acreditada</span>
                  )}
                  {o.status === 'rejected' && (
                    <span className="text-sm text-rose-700">Rechazada</span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Modal de confirmación */}
      {confirmOrderId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h4 className="font-semibold mb-2">¿Eliminar comprobante?</h4>
            <p className="text-sm text-gray-600 mb-4">Esta acción no se puede deshacer.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmOrderId(null)} className="px-3 py-2 rounded-xl border">Cancelar</button>
              <button onClick={() => deleteProof(confirmOrderId)} className="px-3 py-2 rounded-xl bg-rose-600 text-white">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
