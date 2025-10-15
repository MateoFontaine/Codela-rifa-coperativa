'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase'

type OrderStatus =
  | 'awaiting_proof'
  | 'under_review'
  | 'paid'
  | 'rejected'
  | 'canceled'
  | 'pending'

type Order = {
  id: string
  status: OrderStatus
  total_amount: number
  created_at: string
  notes: string | null
}

type NumRow = { id: number; order_id: string }
type ProofRow = { order_id: string; file_url: string | null }

const ORDERS_PER_PAGE = 10

export default function OrderHistory({ userId }: { userId?: string | null }) {
  const router = useRouter()
  const supa = useMemo(() => supabaseBrowser(), [])

  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [numsByOrder, setNumsByOrder] = useState<Record<string, number[]>>({})
  const [proofUrlByOrder, setProofUrlByOrder] = useState<Record<string, string>>({})
  const [confirmOrderId, setConfirmOrderId] = useState<string | null>(null)
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({})
  
  // 👇 NUEVO: Control de paginación
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)

  // 👇 NUEVO: Función para cargar órdenes
  const loadOrders = async (isLoadMore = false) => {
    if (!userId) return
    
    if (isLoadMore) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }

    const currentOffset = isLoadMore ? offset : 0

    // Obtener órdenes con paginación
    const { data: ords } = await supa
      .from('orders')
      .select('id,status,total_amount,created_at,notes')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(currentOffset, currentOffset + ORDERS_PER_PAGE - 1)

    const ordList: Order[] = (ords as Order[]) ?? []
    
    // Si recibimos menos de ORDERS_PER_PAGE, no hay más
    if (ordList.length < ORDERS_PER_PAGE) {
      setHasMore(false)
    }

    if (ordList.length === 0) {
      if (!isLoadMore) {
        setOrders([])
        setNumsByOrder({})
        setProofUrlByOrder({})
      }
      setLoading(false)
      setLoadingMore(false)
      return
    }

    // Actualizar offset para próxima carga
    setOffset(currentOffset + ordList.length)

    // Agregar nuevas órdenes a las existentes
    if (isLoadMore) {
      setOrders(prev => [...prev, ...ordList])
    } else {
      setOrders(ordList)
    }

    const ids = ordList.map(o => o.id)

    // Números de esas órdenes
    const { data: nums } = await supa
      .from('raffle_numbers')
      .select('id,order_id')
      .in('order_id', ids)

    const mapNums: Record<string, number[]> = {}
    ;(((nums as NumRow[]) ?? [])).forEach((r) => {
      const k = r.order_id
      ;(mapNums[k] ||= []).push(Number(r.id))
    })

    // Comprobantes
    const { data: proofs } = await supa
      .from('payment_proofs')
      .select('order_id,file_url')
      .in('order_id', ids)

    const mapProof: Record<string, string> = {}
    ;(((proofs as ProofRow[]) ?? [])).forEach((p) => {
      if (p.file_url) mapProof[p.order_id] = p.file_url
    })

    // Merge con datos existentes
    setNumsByOrder(prev => ({ ...prev, ...mapNums }))
    setProofUrlByOrder(prev => ({ ...prev, ...mapProof }))

    setLoading(false)
    setLoadingMore(false)
  }

  // 👇 MODIFICADO: Cargar órdenes iniciales
  useEffect(() => {
    if (!userId) return
    loadOrders(false)
  }, [userId])

  const badge = (s: OrderStatus) => {
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
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'awaiting_proof' as OrderStatus } : o))
      alert('Comprobante eliminado. Podés subir uno nuevo.')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al eliminar comprobante'
      alert(msg)
    }
  }

  const toggleNote = (orderId: string) => {
    setExpandedNotes(prev => ({ ...prev, [orderId]: !prev[orderId] }))
  }

  if (!userId) return null

  return (
    <div className="bg-white border rounded-2xl p-5 shadow-sm">
      <h3 className="font-semibold mb-2">Historial de compras</h3>
      <p className="text-sm text-gray-600 mb-4">Todas tus órdenes</p>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <p className="text-sm text-gray-600">Todavía no tenés compras.</p>
      ) : (
        <>
          <ul className="space-y-3">
            {orders.map(o => {
              const numbers = (numsByOrder[o.id] || []).slice().sort((a,b)=>a-b)
              const totalFmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(o.total_amount || 0)
              const proofUrl = proofUrlByOrder[o.id]
              const created = new Date(o.created_at).toLocaleString('es-AR')
              const isExpanded = expandedNotes[o.id]

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

                  {o.notes && (
                    <div className="mt-3 border-t pt-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-gray-600">📝 Nota:</p>
                        {o.notes.length > 100 && (
                          <button
                            onClick={() => toggleNote(o.id)}
                            className="text-xs text-blue-600 hover:text-blue-700"
                          >
                            {isExpanded ? 'Ver menos' : 'Ver más'}
                          </button>
                        )}
                      </div>
                      <p className={`text-sm text-gray-700 bg-gray-50 p-2 rounded-lg ${!isExpanded && o.notes.length > 100 ? 'line-clamp-2' : ''}`}>
                        {o.notes}
                      </p>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => router.push(`/checkout?order=${o.id}`)}
                      className="px-3 py-2 rounded-xl border hover:bg-gray-50 text-sm flex items-center gap-1"
                    >
                      Ver detalle
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    {!proofUrl && o.status === 'awaiting_proof' && (
                      <button
                        onClick={() => router.push(`/checkout?order=${o.id}`)}
                        className="px-3 py-2 rounded-xl bg-black text-white text-sm"
                      >
                        Subir comprobante
                      </button>
                    )}

                    {proofUrl && (
                      <>
                        <a href={proofUrl} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-xl border text-sm">
                          Ver comprobante
                        </a>

                        {(o.status === 'under_review' || o.status === 'rejected') && (
                          <button
                            onClick={() => setConfirmOrderId(o.id)}
                            className="px-3 py-2 rounded-xl bg-rose-600 text-white text-sm"
                          >
                            Eliminar comprobante
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  <div className="mt-2">
                    {o.status === 'under_review' && (
                      <p className="text-xs text-blue-700">⏳ Estamos revisando tu pago</p>
                    )}
                    {o.status === 'paid' && (
                      <p className="text-xs text-emerald-700">✓ Pago acreditado</p>
                    )}
                    {o.status === 'rejected' && (
                      <p className="text-xs text-rose-700">✗ Pago rechazado - Podés subir un nuevo comprobante</p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>

          {/* 👇 NUEVO: Botón "Cargar más" */}
          {hasMore && (
            <div className="mt-4 text-center">
              <button
                onClick={() => loadOrders(true)}
                disabled={loadingMore}
                className="px-6 py-3 rounded-xl border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
              >
                {loadingMore ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Cargando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    Cargar más órdenes
                  </>
                )}
              </button>
            </div>
          )}

          {/* 👇 NUEVO: Mensaje cuando no hay más */}
          {!hasMore && orders.length > 0 && (
            <p className="text-center text-sm text-gray-500 mt-4">
              ✓ Mostrando todas tus órdenes ({orders.length})
            </p>
          )}
        </>
      )}

      {confirmOrderId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
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