'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase'

type Status =
  | 'awaiting_proof'
  | 'under_review'
  | 'paid'
  | 'rejected'
  | 'canceled'
  | 'pending'

type Order = {
  id: string
  user_id: string
  email: string
  status: Status
  total_amount: number
  price_per_number: number
  created_at: string
  numbers: number[]
  proofUrl: string | null
}

type Counts = { free: number; held: number; sold: number }

type AdminOverviewResponse = {
  counts: Counts
  orders: Order[]
}

type ActionResponse = { ok?: boolean; error?: string }

const STATUS_LABEL: Record<Status, string> = {
  awaiting_proof: 'Esperando comprobante',
  under_review: 'En revisión',
  paid: 'Acreditada',
  rejected: 'Rechazada',
  canceled: 'Cancelada',
  pending: 'Pendiente',
}

const STATUS_STYLE: Record<Status, string> = {
  awaiting_proof: 'bg-amber-50 text-amber-800 border border-amber-200',
  under_review: 'bg-sky-50 text-sky-800 border border-sky-200',
  paid: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  rejected: 'bg-rose-50 text-rose-800 border border-rose-200',
  canceled: 'bg-gray-50 text-gray-700 border border-gray-200',
  pending: 'bg-zinc-50 text-zinc-700 border border-zinc-200',
}

export default function AdminPage() {
  const supa = useMemo(() => supabaseBrowser(), [])
  const router = useRouter()

  const [me, setMe] = useState<{ id: string; email: string } | null>(null)
  const [counts, setCounts] = useState<Counts | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [filter, setFilter] = useState('')

  const loadOverview = async (userId: string, opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setRefreshing(true)
      const res = await fetch('/api/admin/overview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      const body = (await res.json()) as Partial<AdminOverviewResponse> & { error?: string }
      if (!res.ok || !body.counts || !body.orders) {
        throw new Error(body.error || 'Error cargando admin')
      }

      setCounts(body.counts)
      setOrders(body.orders)
      setLastUpdated(new Date())
      setLoading(false)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error'
      alert(msg)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    ;(async () => {
      const { data: u } = await supa.auth.getUser()
      if (!u.user) { router.replace('/auth/login'); return }
      const { data: prof } = await supa
        .from('app_users')
        .select('id,email,is_admin')
        .eq('auth_user_id', u.user.id)
        .single()
      if (!prof?.is_admin) { alert('Solo administradores'); router.replace('/app'); return }
      setMe({ id: prof.id, email: prof.email })
      await loadOverview(prof.id)
    })()
  }, [supa, router])

  // atajo de teclado: R para actualizar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'r' || e.key === 'R') && me) {
        e.preventDefault()
        loadOverview(me.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [me])

  const sinceText = (() => {
    if (!lastUpdated) return '—'
    const secs = Math.max(0, Math.floor((Date.now() - lastUpdated.getTime()) / 1000))
    if (secs < 60) return `${secs}s`
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}m ${s}s`
  })()

  const filtered = orders.filter(o => {
    const q = filter.trim().toLowerCase()
    if (!q) return true
    return (
      o.id.toLowerCase().includes(q) ||
      o.email.toLowerCase().includes(q) ||
      String(o.total_amount).includes(q)
    )
  })

  const act = async (
    path: 'mark-paid' | 'reject' | 'cancel',
    orderId: string,
    payload: Record<string, unknown> = {}
  ) => {
    if (!me) return
    const res = await fetch(`/api/admin/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: me.id, orderId, ...payload }),
    })
    const j = (await res.json()) as ActionResponse
    if (!res.ok || j.error) { alert(j.error || 'Error'); return }
    // refresco suave inmediato
    loadOverview(me.id, { silent: true })
  }

  if (loading) return <div className="max-w-6xl mx-auto p-6">Cargando dashboard…</div>

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Admin · Rifa</h1>
          <span className="text-xs text-gray-500">Actualizado hace {sinceText}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => me && loadOverview(me.id)}
            className="px-3 py-2 border rounded-xl inline-flex items-center gap-2"
            disabled={refreshing}
            title="Actualizar (R)"
          >
            {/* icono refresh */}
            <svg
              className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <path d="M21 12a9 9 0 1 1-3-6.7" />
              <polyline points="21 3 21 9 15 9" />
            </svg>
            {refreshing ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border rounded-2xl p-4">
          <div className="text-sm text-gray-500">Libres</div>
          <div className="text-2xl font-semibold">{counts?.free ?? 0}</div>
        </div>
        <div className="bg-white border rounded-2xl p-4">
          <div className="text-sm text-gray-500">Reservados</div>
          <div className="text-2xl font-semibold">{counts?.held ?? 0}</div>
        </div>
        <div className="bg-white border rounded-2xl p-4">
          <div className="text-sm text-gray-500">Vendidos</div>
          <div className="text-2xl font-semibold">{counts?.sold ?? 0}</div>
        </div>
      </div>

      {/* Filtro */}
      <div className="bg-white border rounded-2xl p-4 flex items-center gap-3">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Buscar por email, ID de orden o total…"
          className="flex-1 border rounded-xl px-3 py-2"
        />
      </div>

      {/* Órdenes */}
      <div className="bg-white border rounded-2xl p-4">
        <h2 className="font-semibold mb-3">Órdenes recientes</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="p-2">Orden</th>
                <th className="p-2">Usuario</th>
                <th className="p-2">Números</th>
                <th className="p-2">Total</th>
                <th className="p-2">Estado</th>
                <th className="p-2">Comprobante</th>
                <th className="p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id} className="border-t">
                  <td className="p-2">
                    {o.id.slice(0, 8)}…
                    <div className="text-xs text-gray-500">
                      {new Date(o.created_at).toLocaleString('es-AR')}
                    </div>
                  </td>
                  <td className="p-2">{o.email}</td>
                  <td className="p-2">{o.numbers.length}</td>
                  <td className="p-2">${o.total_amount?.toLocaleString('es-AR')}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded-lg text-xs ${STATUS_STYLE[o.status]}`}>
                      {STATUS_LABEL[o.status]}
                    </span>
                  </td>
                  <td className="p-2">
                    {o.proofUrl
                      ? (
                        <a href={o.proofUrl} target="_blank" rel="noreferrer" className="underline">
                          Ver
                        </a>
                        )
                      : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-2">
                      {o.status !== 'paid' && o.status !== 'canceled' && (
                        <>
                          <button
                            onClick={() => act('mark-paid', o.id)}
                            className="px-2 py-1 rounded-lg bg-emerald-600 text-white"
                          >
                            Acreditar
                          </button>
                          <button
                            onClick={() => act('reject', o.id)}
                            className="px-2 py-1 rounded-lg bg-amber-500 text-white"
                          >
                            Rechazar
                          </button>
                          <button
                            onClick={() => act('cancel', o.id)}
                            className="px-2 py-1 rounded-lg bg-rose-600 text-white"
                          >
                            Cancelar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td className="p-4 text-center text-gray-500" colSpan={7}>
                    No hay coincidencias
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
