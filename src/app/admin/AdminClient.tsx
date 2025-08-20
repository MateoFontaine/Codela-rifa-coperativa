// src/app/admin/page.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase'
import { Phone, MessageCircle } from "lucide-react";

type Status = 'awaiting_proof' | 'under_review' | 'paid' | 'rejected' | 'canceled' | 'pending'

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
  // 👇 agregado para contacto
  phone?: string | null
}

type Counts = { free: number; held: number; sold: number }

type AdminOverviewResponse = {
  counts: Counts
  orders: Order[]
}

type ActionResponse = { ok?: boolean; error?: string }

// ---- Usuarios (card)
type UserRow = {
  id: string
  nombre: string | null
  email: string
  dni: string | number | null
  numeros: number[]
  ordenesPendientes: number
}

// ---- Detalle modal
type UserDetailResponse = {
  user: { id: string; nombre: string | null; email: string; dni: string | number | null; phone?: string | null } // 👈 phone agregado
  numbers: number[]
  pendingCount: number
  orders: Array<{
    id: string
    status: Status
    total_amount: number
    created_at: string
    numbers: number[]
    proofUrl: string | null
  }>
}

const STATUS_LABEL: Record<Status, string> = {
  awaiting_proof: 'sin comprobante',
  under_review: 'En revisión',
  paid: 'Acreditada',
  rejected: 'Rechazada',
  canceled: 'Cancelada',
  pending: 'Pendiente',
}

const STATUS_STYLE: Record<Status, string> = {
  awaiting_proof: 'bg-amber-50 text-amber-800 border border-amber-200 text-center',
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

  // ---- Usuarios (card)
  const [users, setUsers] = useState<UserRow[]>([])
  const [userFilter, setUserFilter] = useState('')

  // ---- Modal detalle
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState<UserDetailResponse | null>(null)
  const focusRef = useRef<'numbers' | 'orders' | null>(null)
  const numbersSecRef = useRef<HTMLDivElement | null>(null)
  const ordersSecRef = useRef<HTMLDivElement | null>(null)

  // === Helper: normalizar teléfono a link de WhatsApp (AR-friendly, pero sirve genérico si ya viene con país)
  function waHrefFrom(raw?: string | null): string | null {
    if (!raw) return null
    let num = raw.replace(/\D/g, '')
    // Normalización común para Argentina:
    // wa.me requiere: 549 + (área sin 0) + (línea sin 15)
    if (num.startsWith('549')) num = num.slice(3)
    else if (num.startsWith('54')) num = num.slice(2)
    num = num.replace(/^0/, '')
    num = num.replace(/^15/, '')
    return `https://wa.me/549${num}`
  }

  // === Traer phones desde app_users y “pegar” a las órdenes (sin tocar tu backend)
  async function enrichOrdersWithPhones(ordersIn: Order[]): Promise<Order[]> {
    const ids = Array.from(new Set(ordersIn.map(o => o.user_id))).filter(Boolean)
    if (ids.length === 0) return ordersIn

    const { data: usersData, error } = await supa
      .from('app_users')
      .select('id, phone')
      .in('id', ids)

    if (error || !usersData) return ordersIn

    const byId = new Map(usersData.map(u => [u.id, u.phone ?? null]))
    return ordersIn.map(o => ({ ...o, phone: byId.get(o.user_id) ?? null }))
  }

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

      // 👇 Enriquecemos las órdenes con el teléfono (frontend-only)
      const enriched = await enrichOrdersWithPhones(body.orders as Order[])
      setOrders(enriched)

      setLastUpdated(new Date())
      setLoading(false)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error')
    } finally {
      setRefreshing(false)
    }
  }

  const loadUsers = async (userId: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const body = (await res.json()) as { users?: UserRow[]; error?: string }
      if (!res.ok || !body.users) throw new Error(body.error || 'Error cargando usuarios')
      setUsers(body.users)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error')
    }
  }

  const openDetail = async (targetId: string, focus?: 'numbers' | 'orders') => {
    if (!me) return
    setDetailOpen(true)
    setDetailLoading(true)
    setDetail(null)
    focusRef.current = focus ?? null
    try {
      const res = await fetch('/api/admin/user-detail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: me.id, targetId }),
      })
      const body = (await res.json()) as UserDetailResponse & { error?: string }
      if (!res.ok || (body as unknown as { error?: string }).error) {
        throw new Error((body as unknown as { error?: string }).error || 'No se pudo cargar el detalle')
      }

      // 👇 Traigo el phone de app_users y lo agrego al detalle (frontend-only)
      const { data: urow } = await supa
        .from('app_users')
        .select('phone')
        .eq('id', targetId)
        .single()

      const bodyWithPhone: UserDetailResponse = {
        ...body,
        user: { ...body.user, phone: urow?.phone ?? null },
      }

      setDetail(bodyWithPhone)
      setDetailLoading(false)

      // pequeño scroll a la sección pedida
      setTimeout(() => {
        if (focusRef.current === 'numbers') numbersSecRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        if (focusRef.current === 'orders') ordersSecRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } catch (e: unknown) {
      setDetailLoading(false)
      alert(e instanceof Error ? e.message : 'Error')
    }
  }

  // Hago que "Actualizado hace ..." cuente en vivo (sin cambiar tu API)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const sinceText = (() => {
    if (!lastUpdated) return '—'
    const secs = Math.max(0, Math.floor((Date.now() - lastUpdated.getTime()) / 1000))
    if (secs < 60) return `${secs}s`
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}m ${s}s`
  })()

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
      await Promise.all([loadOverview(prof.id), loadUsers(prof.id)])
    })()
  }, [supa, router])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'r' || e.key === 'R') && me) {
        e.preventDefault()
        loadOverview(me.id)
        loadUsers(me.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [me])

  const filteredOrders = orders.filter(o => {
    const q = filter.trim().toLowerCase()
    if (!q) return true
    return o.id.toLowerCase().includes(q) ||
           o.email.toLowerCase().includes(q) ||
           String(o.total_amount).includes(q)
  })

const filteredUsers = users.filter(u => {
  const qRaw = userFilter.trim().toLowerCase()
  if (!qRaw) return true

  // Coincidencia por texto (nombre / email / DNI)
  const textMatch =
    (u.nombre || '').toLowerCase().includes(qRaw) ||
    u.email.toLowerCase().includes(qRaw) ||
    String(u.dni ?? '').toLowerCase().includes(qRaw)

  // Extraer tokens numéricos del query (soporta "123", "12 34", "12,34", etc.)
  const numTokens = qRaw
    .split(/[\s,;]+/)
    .map(t => t.trim())
    .filter(Boolean)
    .filter(t => /^\d+$/.test(t))

  if (numTokens.length === 0) {
    return textMatch
  }

  // Si hay números en el query: alcanza con que alguno esté entre los números del usuario
  const nums = numTokens.map(n => Number(n))
  const numberMatch = nums.some(n => u.numeros.includes(n))

  return textMatch || numberMatch
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
    loadOverview(me.id, { silent: true })
  }

  if (loading) return <div className="max-w-6xl mx-auto p-6">Cargando dashboard…</div>

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Admin · Rifa</h1>
          <span className="text-xs text-gray-500">Actualizado hace {sinceText}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => me && (loadOverview(me.id), loadUsers(me.id))}
            className="px-3 py-2 border rounded-xl inline-flex items-center gap-2"
            disabled={refreshing}
            title="Actualizar (R)"
          >
            <svg className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

      {/* Filtro órdenes */}
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
                <th className="p-2">Contacto</th>
                <th className="p-2">Números</th>
                <th className="p-2">Total</th>
                <th className="p-2">Estado</th>
                <th className="p-2">Comprobante</th>
                <th className="p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(o => {
                const wa = waHrefFrom(o.phone)
                const hasPhone = Boolean(o.phone && wa)
                return (
                  <tr key={o.id} className="border-t">
                    <td className="p-2">
                      {o.id.slice(0, 8)}…
                      <div className="text-xs text-gray-500">{new Date(o.created_at).toLocaleString('es-AR')}</div>
                    </td>
                    <td className="p-2">{o.email}</td>

                    {/* Contacto */}
                    <td className="p-2">
                      <div className="flex gap-2">
                        {/* WhatsApp */}
                        <a
                          href={hasPhone ? wa! : '#'}
                          target="_blank"
                          rel="noreferrer"
                          className={`text-green-600 hover:text-green-700 ${!hasPhone ? 'pointer-events-none opacity-40' : ''}`}
                          title={hasPhone ? `WhatsApp: ${o.phone}` : 'Sin teléfono'}
                        >
                          <MessageCircle size={20} />
                        </a>

                        {/* Teléfono */}
                        <a
                          href={o.phone ? `tel:${o.phone}` : '#'}
                          className={`text-blue-600 hover:text-blue-700 ${!o.phone ? 'pointer-events-none opacity-40' : ''}`}
                          title={o.phone ? `Llamar: ${o.phone}` : 'Sin teléfono'}
                        >
                          <Phone size={20} />
                        </a>
                      </div>
                    </td>

                    <td className="p-2">{o.numbers.length}</td>
                    <td className="p-2">${o.total_amount?.toLocaleString('es-AR')}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded-lg text-xs ${STATUS_STYLE[o.status]}`}>
                        {STATUS_LABEL[o.status]}
                      </span>
                    </td>
                    <td className="p-2">
                      {o.proofUrl
                        ? <a href={o.proofUrl} target="_blank" rel="noreferrer" className="underline">Ver</a>
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-2">
                        {o.status !== 'paid' && o.status !== 'canceled' && (
                          <>
                            <button onClick={() => act('mark-paid', o.id)} className="px-2 py-1 rounded-lg bg-emerald-600 text-white">Acreditar</button>
                            <button onClick={() => act('reject', o.id)} className="px-2 py-1 rounded-lg bg-amber-500 text-white">Rechazar</button>
                            <button onClick={() => act('cancel', o.id)} className="px-2 py-1 rounded-lg bg-rose-600 text-white">Cancelar</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filteredOrders.length === 0 && (
                <tr><td className="p-4 text-center text-gray-500" colSpan={7}>No hay coincidencias</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Usuarios registrados */}
      <div className="bg-white border rounded-2xl p-4">
        <h2 className="font-semibold mb-3">Usuarios registrados</h2>

        <div className="mb-3 flex gap-3">
          <input
            value={userFilter}
            onChange={e => setUserFilter(e.target.value)}
            placeholder="Buscar por nombre, email, DNI o número..."
            className="flex-1 border rounded-xl px-3 py-2"
          />
        </div>

        <div className="overflow-x-auto max-h-[28rem] overflow-y-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="p-2">Nombre</th>
                <th className="p-2">Email</th>
                <th className="p-2">Números</th>
                <th className="p-2">Pendiente</th>
                <th className="p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id} className="border-t align-middle">
                  <td className="p-2">{u.nombre ?? u.email.split('@')[0]}</td>
                  <td className="p-2">{u.email}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-block rounded-lg border px-2 py-0.5 bg-amber-50">
                        {u.numeros.length}
                      </span>
                      <button
                        onClick={() => openDetail(u.id, 'numbers')}
                        className="text-xs underline"
                        title="Ver números"
                      >
                        Ver
                      </button>
                    </div>
                  </td>
                  <td className="p-2">
                    {u.ordenesPendientes > 0
                      ? <span className="text-amber-700 font-medium">{u.ordenesPendientes}</span>
                      : <span className="text-gray-500">0</span>}
                  </td>
                  <td className="p-2">
                    <button
                      onClick={() => openDetail(u.id)}
                      className="px-2 py-1 rounded-lg border"
                      title="Ver detalle"
                    >
                      ⋮
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr><td className="p-4 text-center text-gray-500" colSpan={6}>No hay coincidencias</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detalle de Usuario */}
      {detailOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-3xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Detalle de usuario</h3>

                {detail && (
                  <>
                    <p className="text-sm text-gray-600">
                      {detail.user.nombre ? `${detail.user.nombre} · ` : ''}
                      {detail.user.email}
                      {detail.user.dni ? ` · DNI: ${detail.user.dni}` : ''}
                    </p>

                    {/* Contacto en header del modal */}
                    <div className="mt-1 flex items-center gap-3">
                      {detail.user.phone ? (
                        <>
                          <a
                            href={waHrefFrom(detail.user.phone) ?? '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="text-green-600 hover:text-green-700"
                            title={`WhatsApp: ${detail.user.phone}`}
                          >
                            <MessageCircle size={18} />
                          </a>
                          <a
                            href={`tel:${detail.user.phone}`}
                            className="text-blue-600 hover:text-blue-700"
                            title={`Llamar: ${detail.user.phone}`}
                          >
                            <Phone size={18} />
                          </a>
                          <span className="text-sm text-gray-700">{detail.user.phone}</span>
                        </>
                      ) : (
                        <span className="text-sm text-gray-400">Sin teléfono</span>
                      )}
                    </div>
                  </>
                )}
              </div>

              <button onClick={() => setDetailOpen(false)} className="px-3 py-2 rounded-xl border">Cerrar</button>
            </div>

            {detailLoading && (
              <div className="mt-6 space-y-2">
                <div className="h-6 rounded bg-gray-100 animate-pulse" />
                <div className="h-24 rounded bg-gray-100 animate-pulse" />
                <div className="h-40 rounded bg-gray-100 animate-pulse" />
              </div>
            )}

            {!detailLoading && detail && (
              <div className="mt-5 space-y-6">

                {/* Números */}
                <div ref={numbersSecRef}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">Números ({detail.numbers.length})</h4>
                    <button
                      onClick={() => numbersSecRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                      className="text-xs underline"
                    >
                      Ir a números
                    </button>
                  </div>
                  {detail.numbers.length ? (
                    <div className="flex flex-wrap gap-1.5 max-h-40 overflow-auto border rounded-xl p-3">
                      {detail.numbers.map(n => (
                        <span key={n} className="px-2 py-0.5 rounded bg-amber-100 border text-[11px]">
                          {n}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">Sin números.</p>
                  )}
                </div>

                {/* Órdenes */}
                <div ref={ordersSecRef}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">Órdenes ({detail.orders.length})</h4>
                    <span className="text-xs text-gray-600">
                      Pendientes: <b>{detail.pendingCount}</b>
                    </span>
                  </div>
                  {detail.orders.length ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left">
                            <th className="p-2">Orden</th>
                            <th className="p-2">Fecha</th>
                            <th className="p-2">Estado</th>
                            <th className="p-2">Total</th>
                            <th className="p-2">Nros</th>
                            <th className="p-2">Comprobante</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.orders.map(o => (
                            <tr key={o.id} className="border-t align-top">
                              <td className="p-2">{o.id.slice(0, 8)}…</td>
                              <td className="p-2">{new Date(o.created_at).toLocaleString('es-AR')}</td>
                              <td className="p-2">
                                <span className={`px-2 py-1 rounded-lg text-xs ${STATUS_STYLE[o.status]}`}>
                                  {STATUS_LABEL[o.status]}
                                </span>
                              </td>
                              <td className="p-2">${o.total_amount.toLocaleString('es-AR')}</td>
                              <td className="p-2">
                                {o.numbers.length ? (
                                  <div className="flex flex-wrap gap-1 max-h-16 overflow-auto">
                                    {o.numbers.map(n => (
                                      <span key={n} className="px-1.5 py-0.5 rounded bg-amber-50 border text-[11px]">{n}</span>
                                    ))}
                                  </div>
                                ) : <span className="text-gray-400">—</span>}
                              </td>
                              <td className="p-2">
                                {o.proofUrl
                                  ? <a href={o.proofUrl} target="_blank" rel="noreferrer" className="underline">Ver</a>
                                  : <span className="text-gray-400">—</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">Sin órdenes.</p>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
