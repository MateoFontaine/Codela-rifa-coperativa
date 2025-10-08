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
  phone?: string | null
}

type Counts = { free: number; held: number; sold: number }

type AdminOverviewResponse = {
  counts: Counts
  orders: Order[]
}

type ActionResponse = { ok?: boolean; error?: string }

type UserRow = {
  id: string
  nombre: string | null
  email: string
  dni: string | number | null
  numeros: number[]
  ordenesPendientes: number
}

type UserDetailResponse = {
  user: { id: string; nombre: string | null; email: string; dni: string | number | null; phone?: string | null }
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

type ConfirmAction = {
  type: 'mark-paid' | 'reject' | 'cancel'
  orderId: string
  orderEmail: string
  orderTotal: number
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
  awaiting_proof: 'bg-amber-50 text-amber-800 border border-amber-200',
  under_review: 'bg-sky-50 text-sky-800 border border-sky-200',
  paid: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  rejected: 'bg-rose-50 text-rose-800 border border-rose-200',
  canceled: 'bg-gray-50 text-gray-700 border border-gray-200',
  pending: 'bg-zinc-50 text-zinc-700 border border-zinc-200',
}

const ACTION_CONFIG: Record<ConfirmAction['type'], { 
  title: string
  message: string
  confirmText: string
  confirmClass: string
}> = {
  'mark-paid': {
    title: '¿Acreditar pago?',
    message: 'Esta orden se marcará como pagada y los números quedarán confirmados.',
    confirmText: 'Sí, acreditar',
    confirmClass: 'bg-emerald-600 hover:bg-emerald-700 text-white'
  },
  'reject': {
    title: '¿Rechazar orden?',
    message: 'El comprobante será rechazado y el usuario deberá subir uno nuevo.',
    confirmText: 'Sí, rechazar',
    confirmClass: 'bg-amber-500 hover:bg-amber-600 text-white'
  },
  'cancel': {
    title: '¿Cancelar orden?',
    message: 'Esta orden se cancelará y los números volverán a estar disponibles.',
    confirmText: 'Sí, cancelar',
    confirmClass: 'bg-rose-600 hover:bg-rose-700 text-white'
  }
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
  
  const [processingOrder, setProcessingOrder] = useState<string | null>(null)
  
  // Estado para el modal de confirmación
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)

  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'review' | 'completed'>('pending')

  // Scroll infinito
  const [displayLimit, setDisplayLimit] = useState(50)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const [users, setUsers] = useState<UserRow[]>([])
  const [userFilter, setUserFilter] = useState('')

  const [resetPasswordOpen, setResetPasswordOpen] = useState(false)
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false)
  const [resetPasswordForm, setResetPasswordForm] = useState({ email: '', password: '' })

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState<UserDetailResponse | null>(null)
  const focusRef = useRef<'numbers' | 'orders' | null>(null)
  const numbersSecRef = useRef<HTMLDivElement | null>(null)
  const ordersSecRef = useRef<HTMLDivElement | null>(null)

  function waHrefFrom(raw?: string | null): string | null {
    if (!raw) return null
    let num = raw.replace(/\D/g, '')
    if (num.startsWith('549')) num = num.slice(3)
    else if (num.startsWith('54')) num = num.slice(2)
    num = num.replace(/^0/, '')
    num = num.replace(/^15/, '')
    return `https://wa.me/549${num}`
  }

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

  const handleResetPassword = async () => {
    if (!me || !resetPasswordForm.email || !resetPasswordForm.password) {
      alert('Por favor completá todos los campos')
      return
    }

    if (resetPasswordForm.password.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setResetPasswordLoading(true)
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: me.id,
          targetEmail: resetPasswordForm.email,
          newPassword: resetPasswordForm.password,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Error al resetear contraseña')
      }

      alert(`✅ Contraseña actualizada para ${resetPasswordForm.email}`)
      setResetPasswordOpen(false)
      setResetPasswordForm({ email: '', password: '' })
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al resetear contraseña')
    } finally {
      setResetPasswordLoading(false)
    }
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

      setTimeout(() => {
        if (focusRef.current === 'numbers') numbersSecRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        if (focusRef.current === 'orders') ordersSecRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } catch (e: unknown) {
      setDetailLoading(false)
      alert(e instanceof Error ? e.message : 'Error')
    }
  }

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

  const getFilteredOrders = () => {
    let tabFiltered = orders
    
    switch (activeTab) {
      case 'pending':
        tabFiltered = orders.filter(o => 
          o.status === 'awaiting_proof' || o.status === 'pending' || o.status === 'rejected'
        )
        break
      case 'review':
        tabFiltered = orders.filter(o => o.status === 'under_review')
        break
      case 'completed':
        tabFiltered = orders.filter(o => 
          o.status === 'paid' || o.status === 'canceled'
        )
        break
      case 'all':
      default:
        tabFiltered = orders
    }

    if (!filter.trim()) return tabFiltered
    
    const q = filter.trim().toLowerCase()
    return tabFiltered.filter(o => 
      o.id.toLowerCase().includes(q) ||
      o.email.toLowerCase().includes(q) ||
      String(o.total_amount).includes(q)
    )
  }

  const allFilteredOrders = getFilteredOrders()
  const filteredOrders = allFilteredOrders.slice(0, displayLimit)
  const hasMore = allFilteredOrders.length > displayLimit

  // Scroll infinito - detectar cuando llega al final
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      // Si está a 100px del final, cargar más
      if (scrollHeight - scrollTop - clientHeight < 100 && hasMore) {
        setDisplayLimit(prev => prev + 50)
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [hasMore])

  // Reset displayLimit cuando cambia el tab o filtro
  useEffect(() => {
    setDisplayLimit(50)
  }, [activeTab, filter])

  const statusCounts = {
    all: orders.length,
    pending: orders.filter(o => o.status === 'awaiting_proof' || o.status === 'pending' || o.status === 'rejected').length,
    review: orders.filter(o => o.status === 'under_review').length,
    completed: orders.filter(o => o.status === 'paid' || o.status === 'canceled').length,
  }

  const filteredUsers = users.filter(u => {
    const qRaw = userFilter.trim().toLowerCase()
    if (!qRaw) return true

    const textMatch =
      (u.nombre || '').toLowerCase().includes(qRaw) ||
      u.email.toLowerCase().includes(qRaw) ||
      String(u.dni ?? '').toLowerCase().includes(qRaw)

    const numTokens = qRaw
      .split(/[\s,;]+/)
      .map(t => t.trim())
      .filter(Boolean)
      .filter(t => /^\d+$/.test(t))

    if (numTokens.length === 0) {
      return textMatch
    }

    const nums = numTokens.map(n => Number(n))
    const numberMatch = nums.some(n => u.numeros.includes(n))

    return textMatch || numberMatch
  })

  // Función para abrir el modal de confirmación
  const openConfirmModal = (type: ConfirmAction['type'], order: Order) => {
    setConfirmAction({
      type,
      orderId: order.id,
      orderEmail: order.email,
      orderTotal: order.total_amount
    })
  }

  // Función para ejecutar la acción confirmada
  const executeAction = async () => {
    if (!me || !confirmAction) return
    
    setProcessingOrder(confirmAction.orderId)
    
    try {
      const res = await fetch(`/api/admin/${confirmAction.type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: me.id, orderId: confirmAction.orderId }),
      })
      const j = (await res.json()) as ActionResponse
      if (!res.ok || j.error) { 
        alert(j.error || 'Error')
        return
      }
      
      await loadOverview(me.id, { silent: true })
      setConfirmAction(null)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error')
    } finally {
      setProcessingOrder(null)
    }
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

      {/* Órdenes con Tabs */}
      <div className="bg-white border rounded-2xl p-4">
        <div className="mb-4">
          <h2 className="font-semibold">Órdenes</h2>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b overflow-x-auto">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'pending'
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            Pendientes
            {statusCounts.pending > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                {statusCounts.pending}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('review')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'review'
                ? 'border-sky-500 text-sky-700'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            En revisión
            {statusCounts.review > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 text-xs font-semibold">
                {statusCounts.review}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'completed'
                ? 'border-emerald-500 text-emerald-700'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            Completadas
          </button>
          
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'all'
                ? 'border-gray-500 text-gray-700'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            Todas
          </button>
        </div>

        {/* Filtro de búsqueda */}
        <div className="mb-4 flex items-center gap-3">
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Buscar por email, ID de orden o total…"
            className="flex-1 border rounded-xl px-3 py-2"
          />
          {filter && (
            <button
              onClick={() => setFilter('')}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Contador de resultados */}
        <div className="mb-3 text-sm text-gray-600">
          Mostrando {filteredOrders.length} de {allFilteredOrders.length} orden{allFilteredOrders.length !== 1 ? 'es' : ''}
        </div>

        {/* Tabla con scroll */}
        <div ref={scrollContainerRef} className="overflow-x-auto lg:overflow-x-visible max-h-[600px] overflow-y-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50">
                <th className="p-3 min-w-[120px] lg:min-w-0">Orden</th>
                <th className="p-3 min-w-[180px] lg:min-w-0">Usuario</th>
                <th className="p-3 min-w-[100px] lg:min-w-0">Contacto</th>
                {activeTab !== 'completed' && <th className="p-3 min-w-[80px] lg:min-w-0">Números</th>}
                <th className="p-3 min-w-[100px] lg:min-w-0">Total</th>
                <th className="p-3 min-w-[140px] lg:min-w-0">Estado</th>
                <th className="p-3 min-w-[100px] lg:min-w-0">Comprobante</th>
                <th className="p-3 min-w-[120px] lg:min-w-0">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(o => {
                const wa = waHrefFrom(o.phone)
                const hasPhone = Boolean(o.phone && wa)
                return (
                  <tr key={o.id} className="border-t hover:bg-gray-50">
                    <td className="p-3">
                      {o.id.slice(0, 8)}…
                      <div className="text-xs text-gray-500">
                        {new Date(o.created_at).toLocaleString('es-AR')}
                      </div>
                    </td>
                    <td className="p-3">{o.email}</td>
                    
                    <td className="p-3">
                      <div className="flex gap-2">
                        <a
                          href={hasPhone ? wa! : '#'}
                          target="_blank"
                          rel="noreferrer"
                          className={`text-green-600 hover:text-green-700 ${!hasPhone ? 'pointer-events-none opacity-40' : ''}`}
                          title={hasPhone ? `WhatsApp: ${o.phone}` : 'Sin teléfono'}
                        >
                          <MessageCircle size={20} />
                        </a>
                        <a
                          href={o.phone ? `tel:${o.phone}` : '#'}
                          className={`text-blue-600 hover:text-blue-700 ${!o.phone ? 'pointer-events-none opacity-40' : ''}`}
                          title={o.phone ? `Llamar: ${o.phone}` : 'Sin teléfono'}
                        >
                          <Phone size={20} />
                        </a>
                      </div>
                    </td>

                    {activeTab !== 'completed' && <td className="p-3">{o.numbers.length}</td>}
                    <td className="p-3 whitespace-nowrap font-medium">
                      ${o.total_amount?.toLocaleString('es-AR')}
                    </td>
                    
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-lg text-xs whitespace-nowrap inline-block ${STATUS_STYLE[o.status]}`}>
                        {STATUS_LABEL[o.status]}
                      </span>
                    </td>
                    
                    <td className="p-3">
                      {o.proofUrl ? (
                        <a 
                          href={o.proofUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-blue-600 hover:underline"
                        >
                          Ver
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    
                    <td className="p-3">
                      {o.status !== 'paid' && o.status !== 'canceled' && (
                        <div className="flex flex-col gap-1.5">
                          <button 
                            onClick={() => openConfirmModal('mark-paid', o)}
                            disabled={processingOrder === o.id}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs whitespace-nowrap hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Acreditar
                          </button>
                          <button 
                            onClick={() => openConfirmModal('reject', o)}
                            disabled={processingOrder === o.id}
                            className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs whitespace-nowrap hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Rechazar
                          </button>
                          <button 
                            onClick={() => openConfirmModal('cancel', o)}
                            disabled={processingOrder === o.id}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs whitespace-nowrap hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
              {filteredOrders.length === 0 && (
                <tr>
                  <td className="p-4 text-center text-gray-500" colSpan={activeTab !== 'completed' ? 8 : 7}>
                    {filter 
                      ? 'No hay coincidencias con tu búsqueda' 
                      : 'No hay órdenes en esta categoría'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          
          {/* Indicador de carga al final */}
          {hasMore && (
            <div className="py-4 text-center text-sm text-gray-500">
              <div className="inline-flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Cargando más órdenes...</span>
              </div>
            </div>
          )}
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
                    <div className="flex gap-2">
                      <button
                        onClick={() => openDetail(u.id)}
                        className="px-2 py-1 rounded-lg border hover:bg-gray-50"
                        title="Ver detalle"
                      >
                        ⋮
                      </button>
                      <button
                        onClick={() => {
                          setResetPasswordForm({ email: u.email, password: '' })
                          setResetPasswordOpen(true)
                        }}
                        className="px-2 py-1 rounded-lg border hover:bg-blue-50 text-blue-600 text-xs"
                        title="Resetear contraseña"
                      >
                        🔑
                      </button>
                    </div>
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

      {/* Modal de Confirmación */}
      {confirmAction && (
        <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold mb-3">
              {ACTION_CONFIG[confirmAction.type].title}
            </h3>
            
            <div className="mb-4 space-y-2">
              <p className="text-gray-700">
                {ACTION_CONFIG[confirmAction.type].message}
              </p>
              
              <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
                <div><span className="font-medium">Usuario:</span> {confirmAction.orderEmail}</div>
                <div><span className="font-medium">Total:</span> ${confirmAction.orderTotal.toLocaleString('es-AR')}</div>
                <div className="text-xs text-gray-500">ID: {confirmAction.orderId.slice(0, 8)}...</div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                disabled={processingOrder !== null}
                className="flex-1 px-4 py-2.5 rounded-xl border hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                No, cancelar
              </button>
              <button
                onClick={executeAction}
                disabled={processingOrder !== null}
                className={`flex-1 px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2 ${ACTION_CONFIG[confirmAction.type].confirmClass}`}
              >
                {processingOrder ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Procesando...</span>
                  </>
                ) : (
                  ACTION_CONFIG[confirmAction.type].confirmText
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Modal Reset de Contraseña */}
      {resetPasswordOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Resetear contraseña</h3>
              <button
                onClick={() => {
                  setResetPasswordOpen(false)
                  setResetPasswordForm({ email: '', password: '' })
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleResetPassword(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email del usuario</label>
                <input
                  type="email"
                  value={resetPasswordForm.email}
                  onChange={(e) => setResetPasswordForm({ ...resetPasswordForm, email: e.target.value })}
                  className="w-full border rounded-xl p-3 bg-gray-50"
                  placeholder="usuario@ejemplo.com"
                  required
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">Este campo no es editable</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Nueva contraseña</label>
                <input
                  type="text"
                  value={resetPasswordForm.password}
                  onChange={(e) => setResetPasswordForm({ ...resetPasswordForm, password: e.target.value })}
                  className="w-full border rounded-xl p-3 font-mono"
                  placeholder="Nueva contraseña"
                  required
                  minLength={6}
                />
                <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres. Compartila con el usuario por WhatsApp.</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs text-amber-800">
                  ⚠️ <strong>Importante:</strong> Esta contraseña será visible para vos. Compartila con el usuario de forma segura (ej: WhatsApp).
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setResetPasswordOpen(false)
                    setResetPasswordForm({ email: '', password: '' })
                  }}
                  className="flex-1 px-4 py-2 rounded-xl border hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resetPasswordLoading}
                  className="flex-1 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {resetPasswordLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Procesando...</span>
                    </>
                  ) : (
                    'Resetear contraseña'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
/* Esto es para probar */