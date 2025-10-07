// src/app/app/page.tsx
'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase'
import SearchNumber from '@/components/SearchNumber'
import OrderHistory from '@/components/OrderHistory'
import MyNumbers from '@/components/MyNumbers'

type RaffleNumber = {
  id: number
  status: 'free' | 'held' | 'sold'
  held_by: string | null
  order_id: string | null
}

type PurchaseLimitInfo = {
  canPurchase: boolean
  activePurchases: number
  maxPurchases: number
  nextAvailableAt?: string
  hoursRemaining?: number
  reason?: string
}

const PAGE_SIZE = 100
const TOTAL_NUMBERS = 100000
const MAX_PER_ORDER = 50

const formatNumber = (n: number) => String(n).padStart(5, '0')

export default function UserRaffle() {
  const supa = useMemo(() => supabaseBrowser(), [])
  const router = useRouter()

  const [profile, setProfile] = useState<{ id: string; email: string } | null>(null)
  const [limitInfo, setLimitInfo] = useState<PurchaseLimitInfo | null>(null)

  // grilla
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<RaffleNumber[]>([])
  const [loading, setLoading] = useState(false)

  // carrito
  const [cart, setCart] = useState<number[]>([])
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [countdown, setCountdown] = useState('')

  // búsqueda
  const [searchTarget, setSearchTarget] = useState<number | null>(null)

  // tabs para mobile
  const [activeTab, setActiveTab] = useState<'comprar' | 'cuenta'>('comprar')

  // 🔥 NUEVO: Estado para tracking de botones de azar en proceso
  const [loadingRandom, setLoadingRandom] = useState<number | null>(null)

  // Variable para saber si está bloqueado
  const isBlocked = !!(limitInfo && !limitInfo.canPurchase)

  // Cargar límites de compra
  const loadPurchaseLimits = async (userId: string) => {
    try {
      const res = await fetch('/api/purchase-limits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const data = await res.json()
      setLimitInfo(data)
    } catch (error) {
      console.error('Error cargando límites:', error)
    }
  }

  // Auth + perfil (bloquea admins en /app)
  useEffect(() => {
    ;(async () => {
      const { data: u } = await supa.auth.getUser()
      if (!u.user) {
        router.replace('/auth/login')
        return
      }

      const { data: prof } = await supa
        .from('app_users')
        .select('id,email,is_admin')
        .eq('auth_user_id', u.user.id)
        .single()

      if (!prof) {
        alert('No se encontró el perfil del usuario.')
        return
      }

      if (prof.is_admin) {
        router.replace('/admin')
        return
      }

      setProfile({ id: prof.id, email: prof.email })
      await loadPurchaseLimits(prof.id)
    })()
  }, [supa, router])

  // Cargar página (NO toca el carrito)
  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const from = (page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      const { data, error } = await supa
        .from('raffle_numbers')
        .select('id,status,held_by,order_id')
        .order('id', { ascending: true })
        .range(from, to)

      if (!error && data) setRows(data as RaffleNumber[])
      setLoading(false)
    })()
  }, [page, supa])

  // Scroll al número buscado cuando termine de cargar
  useEffect(() => {
    if (!loading && searchTarget !== null) {
      setTimeout(() => {
        const el = document.getElementById(`num-${searchTarget}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.classList.add('ring-2', 'ring-blue-400')
          setTimeout(() => el.classList.remove('ring-2', 'ring-blue-400'), 2000)
        }
        setSearchTarget(null)
      }, 100)
    }
  }, [loading, searchTarget])

  // Countdown carrito
  useEffect(() => {
    if (!expiresAt) {
      setCountdown('')
      return
    }
    const iv = setInterval(() => {
      const ms = new Date(expiresAt).getTime() - Date.now()
      if (ms <= 0) {
        setCountdown('00:00')
        clearInterval(iv)
        return
      }
      const m = Math.floor(ms / 60000)
      const s = Math.floor((ms % 60000) / 1000)
      setCountdown(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }, 500)
    return () => clearInterval(iv)
  }, [expiresAt])

  // Helpers
  const maxPage = Math.ceil(TOTAL_NUMBERS / PAGE_SIZE)
  const goTo = (p: number) => setPage(Math.min(Math.max(1, p), maxPage))
  const colorFor = (r: RaffleNumber) =>
    r.status === 'free'
      ? 'bg-emerald-100 hover:bg-emerald-200'
      : r.status === 'held'
      ? 'bg-amber-100'
      : 'bg-rose-100'

  // ================== Acciones ==================

  const pickOne = async (num: number) => {
    if (!profile) return
    if (isBlocked) {
      alert(limitInfo?.reason || 'No podés hacer más compras en este momento')
      return
    }
    if (cart.length >= MAX_PER_ORDER) {
      alert(`Máximo ${MAX_PER_ORDER} por compra`)
      return
    }
    const r = rows.find((x) => x.id === num)
    if (!r || r.status !== 'free' || r.order_id) return

    setCart((prev) => [...prev, num])
    setRows((prev) =>
      prev.map((x) =>
        x.id === num ? { ...x, status: 'held', held_by: profile.id } : x
      )
    )
    const optimisticExpire = new Date(Date.now() + 10 * 60_000).toISOString()
    if (!expiresAt) setExpiresAt(optimisticExpire)

    const res = await fetch('/api/hold', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: profile.id, numbers: [num] }),
    })
    const j = await res.json()
    const ok = j?.results?.[0]?.ok
    if (ok) setExpiresAt(j.expiresAt || optimisticExpire)
    else {
      setRows((prev) =>
        prev.map((x) =>
          x.id === num ? { ...x, status: 'free', held_by: null } : x
        )
      )
      setCart((prev) => {
        const next = prev.filter((n) => n !== num)
        if (next.length === 0) setExpiresAt(null)
        return next
      })
      alert('Ese número ya no está disponible')
    }
  }

  const releaseOne = async (num: number) => {
    if (!profile) return
    const row = rows.find((x) => x.id === num)
    if (row?.order_id) return

    const remainingAfter = cart.filter((n) => n !== num).length
    setCart((prev) => prev.filter((n) => n !== num))
    setRows((prev) =>
      prev.map((x) =>
        x.id === num ? { ...x, status: 'free', held_by: null } : x
      )
    )
    if (remainingAfter === 0) setExpiresAt(null)

    const res = await fetch('/api/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: profile.id, numbers: [num] }),
    })
    const j = await res.json()
    const released: number[] = j?.released || []

    if (!res.ok || !released.includes(num)) {
      setRows((prev) =>
        prev.map((x) =>
          x.id === num ? { ...x, status: 'held', held_by: profile!.id } : x
        )
      )
      setCart((prev) => [...prev, num])
      if (!expiresAt)
        setExpiresAt(new Date(Date.now() + 10 * 60_000).toISOString())
      alert(j?.error || 'No se pudo liberar')
    }
  }

  const releaseMany = async (nums: number[]) => {
    if (!profile || nums.length === 0) return

    const res = await fetch('/api/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: profile.id, numbers: nums }),
    })
    const j = await res.json()
    if (!res.ok) {
      alert(j?.error || 'No se pudo liberar')
      return
    }

    const released: number[] = j.released || []

    if (released.length) {
      setRows((prev) =>
        prev.map((x) =>
          released.includes(x.id) ? { ...x, status: 'free', held_by: null } : x
        )
      )
    }

    setCart((prev) => prev.filter((n) => !released.includes(n)))

    setTimeout(() => {
      setCart((prev) => {
        if (prev.length === 0) setExpiresAt(null)
        return prev
      })
    }, 0)
  }

  const emptyCart = () => releaseMany([...cart])

  // 🔥 MODIFICADO: Agregar spinner durante la carga
  const pickRandomAll = async (qty: number) => {
    if (!profile) return
    if (isBlocked) {
      alert(limitInfo?.reason || 'No podés hacer más compras en este momento')
      return
    }
    const can = Math.min(qty, MAX_PER_ORDER - cart.length)
    if (can <= 0) {
      alert(`Máximo ${MAX_PER_ORDER} por compra`)
      return
    }

    // Marcar como cargando
    setLoadingRandom(qty)

    try {
      const res = await fetch('/api/random-hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id, qty: can }),
      })
      const j = await res.json()
      if (!res.ok) {
        alert(j?.error || 'No se pudo seleccionar al azar')
        return
      }

      const held: number[] = Array.isArray(j?.held)
        ? (j.held as unknown[]).map((x) => Number(x))
        : []
      const newHeld: number[] = held.filter((n) => !cart.includes(n))

      if (newHeld.length === 0) {
        alert('No se encontraron números libres suficientes')
        return
      }

      setCart((prev) => Array.from(new Set([...prev, ...newHeld])))
      setRows((prev) =>
        prev.map((x) =>
          newHeld.includes(x.id)
            ? { ...x, status: 'held', held_by: profile!.id }
            : x
        )
      )
      setExpiresAt(j.expiresAt || new Date(Date.now() + 10 * 60_000).toISOString())
    } catch (error) {
      alert('Error al seleccionar números al azar')
    } finally {
      // Quitar el estado de cargando
      setLoadingRandom(null)
    }
  }

  const handleSearchGo = (v: number) => {
    const targetPage = Math.ceil(v / PAGE_SIZE)
    setPage(targetPage)
    setSearchTarget(v)
  }

  const handleConfirmPurchase = () => {
    if (!profile || cart.length === 0) return
    
    const qs = cart.join(',')
    window.location.href = `/checkout?n=${qs}`
  }
 
  // 🔥 NUEVO: Componente de botón con spinner
  const RandomButton = ({ qty, disabled }: { qty: number; disabled: boolean }) => {
    const isLoading = loadingRandom === qty
    
    return (
      <button
        onClick={() => pickRandomAll(qty)}
        disabled={disabled || loadingRandom !== null}
        className="px-3 py-2 rounded-xl border w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>...</span>
          </>
        ) : (
          `+${qty}`
        )}
      </button>
    )
  }

  return (
    <div>
      {/* Tabs para mobile */}
      <div className="lg:hidden sticky top-0 z-10 bg-white border-b mb-4">
        <div className="flex">
          <button
            onClick={() => setActiveTab('comprar')}
            className={`flex-1 px-4 py-3 text-sm font-medium ${
              activeTab === 'comprar'
                ? 'text-black border-b-2 border-black'
                : 'text-gray-500'
            }`}
          >
            Comprar
          </button>
          <button
            onClick={() => setActiveTab('cuenta')}
            className={`flex-1 px-4 py-3 text-sm font-medium ${
              activeTab === 'cuenta'
                ? 'text-black border-b-2 border-black'
                : 'text-gray-500'
            }`}
          >
            Mi Cuenta
          </button>
        </div>
      </div>

      {/* Desktop: Layout original con columnas */}
      <div className="hidden lg:grid lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Columna izquierda */}
        <div className="space-y-6 lg:col-span-1">
          {limitInfo && (
            <div
              className={`border rounded-2xl p-4 shadow-sm ${
                limitInfo.canPurchase
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-rose-50 border-rose-200'
              }`}
            >
              <h3 className="font-semibold mb-2 text-sm">Estado de compras</h3>
              <div className="space-y-1 text-sm">
                <p>
                  Compras activas:{' '}
                  <b>
                    {limitInfo.activePurchases}/{limitInfo.maxPurchases}
                  </b>
                </p>
                {!limitInfo.canPurchase && limitInfo.reason && (
                  <>
                    <p className="text-rose-800 text-xs mt-2 font-medium">
                      ⚠️ {limitInfo.reason}
                    </p>
                    {limitInfo.activePurchases >= limitInfo.maxPurchases && (
                      <p className="text-rose-700 text-xs mt-1 font-semibold">
                        No podés seleccionar más números hasta que se libere un cupo.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          <MyNumbers userId={profile?.id} />

          <div className="bg-white border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Carrito</h3>
              <span className="text-xs text-gray-500">
                {cart.length}/{MAX_PER_ORDER} · expira {countdown || '--:--'}
              </span>
            </div>

            {cart.length === 0 ? (
              <p className="text-sm text-gray-600">No hay números en el carrito.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 mb-3">
                  {cart
                    .slice()
                    .sort((a, b) => a - b)
                    .map((n) => (
                      <button
                        key={n}
                        onClick={() => releaseOne(n)}
                        className="text-sm px-2 py-1 rounded-lg bg-amber-100 border hover:bg-amber-200"
                        title="Quitar del carrito"
                      >
                        {formatNumber(n)} <span className="ml-1">×</span>
                      </button>
                    ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={emptyCart}
                    className="px-3 py-2 rounded-xl border"
                  >
                    Vaciar
                  </button>
                  <button
                    disabled={cart.length === 0}
                    onClick={handleConfirmPurchase}
                    className="px-3 py-2 rounded-xl bg-black text-white disabled:opacity-50"
                  >
                    Confirmar
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="bg-white border rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold mb-3">
              Acciones rápidas (al azar en toda la rifa)
            </h3>
            <div className="flex gap-2">
              <RandomButton qty={1} disabled={isBlocked} />
              <RandomButton qty={5} disabled={isBlocked} />
              <RandomButton qty={10} disabled={isBlocked} />
            </div>
          </div>

          <OrderHistory userId={profile?.id} />
        </div>

        {/* Derecha: buscador + grilla */}
        <div className="lg:col-span-2 xl:col-span-3 space-y-4">
          <div className="bg-white border rounded-2xl p-4 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchNumber
              total={TOTAL_NUMBERS}
              pageSize={PAGE_SIZE}
              onGo={handleSearchGo}
            />
            <div className="sm:ml-auto flex items-center gap-2">
              <button
                onClick={() => goTo(page - 1)}
                className="px-3 py-2 rounded-xl border"
              >
                «
              </button>
              <span className="text-sm">
                Página {page}/{Math.ceil(TOTAL_NUMBERS / PAGE_SIZE)}
              </span>
              <button
                onClick={() => goTo(page + 1)}
                className="px-3 py-2 rounded-xl border"
              >
                »
              </button>
            </div>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 xl:grid-cols-12 gap-1.5 bg-white border rounded-2xl p-4 shadow-sm">
            {loading
              ? Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <div
                    key={i}
                    className="h-9 md:h-10 rounded-lg bg-gray-100 animate-pulse"
                  />
                ))
              : rows.map((r) => {
                  const isMineHeld = r.status === 'held' && r.held_by === profile?.id
                  const isLocked = !!r.order_id
                  const disabled =
                    isBlocked ||
                    isLocked ||
                    r.status === 'sold' ||
                    (r.status === 'held' && !isMineHeld) ||
                    (r.status === 'free' && cart.length >= MAX_PER_ORDER)

                  return (
                    <button
                      key={r.id}
                      id={`num-${r.id}`}
                      onClick={() =>
                        isLocked
                          ? undefined
                          : isMineHeld
                          ? releaseOne(r.id)
                          : pickOne(r.id)
                      }
                      disabled={disabled}
                      className={`h-9 md:h-10 rounded-lg text-[11px] md:text-xs border ${colorFor(
                        r
                      )} disabled:opacity-60 disabled:cursor-not-allowed`}
                      title={
                        isBlocked
                          ? 'Llegaste al límite de compras activas'
                          : isLocked
                          ? `#${formatNumber(r.id)} · en orden`
                          : `#${formatNumber(r.id)} · ${r.status}${isMineHeld ? ' (tuyo)' : ''}`
                      }
                    >
                      {formatNumber(r.id)}
                    </button>
                  )
                })}
          </div>
        </div>
      </div>

      {/* Mobile: Contenido según tab activo */}
      <div className="lg:hidden space-y-4">
        {activeTab === 'comprar' && (
          <>
            {/* Banner de límites */}
            {limitInfo && (
              <div
                className={`border rounded-2xl p-4 shadow-sm ${
                  limitInfo.canPurchase
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-rose-50 border-rose-200'
                }`}
              >
                <h3 className="font-semibold mb-2 text-sm">Estado de compras</h3>
                <div className="space-y-1 text-sm">
                  <p>
                    Compras activas:{' '}
                    <b>
                      {limitInfo.activePurchases}/{limitInfo.maxPurchases}
                    </b>
                  </p>
                  {!limitInfo.canPurchase && limitInfo.reason && (
                    <>
                      <p className="text-rose-800 text-xs mt-2 font-medium">
                        ⚠️ {limitInfo.reason}
                      </p>
                      {limitInfo.activePurchases >= limitInfo.maxPurchases && (
                        <p className="text-rose-700 text-xs mt-1 font-semibold">
                          No podés seleccionar más números hasta que se libere un cupo.
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Carrito */}
            <div className="bg-white border rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Carrito</h3>
                <span className="text-xs text-gray-500">
                  {cart.length}/{MAX_PER_ORDER} · {countdown || '--:--'}
                </span>
              </div>

              {cart.length === 0 ? (
                <p className="text-sm text-gray-600">No hay números en el carrito.</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {cart
                      .slice()
                      .sort((a, b) => a - b)
                      .map((n) => (
                        <button
                          key={n}
                          onClick={() => releaseOne(n)}
                          className="text-sm px-2 py-1 rounded-lg bg-amber-100 border hover:bg-amber-200"
                          title="Quitar del carrito"
                        >
                          {formatNumber(n)} <span className="ml-1">×</span>
                        </button>
                      ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={emptyCart} className="px-3 py-2 rounded-xl border">
                      Vaciar
                    </button>
                    <button
                      disabled={cart.length === 0}
                      onClick={handleConfirmPurchase}
                      className="px-3 py-2 rounded-xl bg-black text-white disabled:opacity-50"
                    >
                      Confirmar
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Acciones rápidas */}
            <div className="bg-white border rounded-2xl p-4 shadow-sm">
              <h3 className="font-semibold mb-3">Acciones rápidas</h3>
              <div className="flex gap-2">
                <RandomButton qty={1} disabled={isBlocked} />
                <RandomButton qty={5} disabled={isBlocked} />
                <RandomButton qty={10} disabled={isBlocked} />
              </div>
            </div>

            {/* Buscador */}
            <div className="bg-white border rounded-2xl p-4 shadow-sm">
              <SearchNumber
                total={TOTAL_NUMBERS}
                pageSize={PAGE_SIZE}
                onGo={handleSearchGo}
              />
              <div className="flex items-center justify-center gap-2 mt-3">
                <button onClick={() => goTo(page - 1)} className="px-3 py-2 rounded-xl border">
                  «
                </button>
                <span className="text-sm">
                  Pág. {page}/{Math.ceil(TOTAL_NUMBERS / PAGE_SIZE)}
                </span>
                <button onClick={() => goTo(page + 1)} className="px-3 py-2 rounded-xl border">
                  »
                </button>
              </div>
            </div>

            {/* Grilla de números */}
            <div className="grid grid-cols-5 gap-1.5 bg-white border rounded-2xl p-4 shadow-sm">
              {loading
                ? Array.from({ length: PAGE_SIZE }).map((_, i) => (
                    <div key={i} className="h-10 rounded-lg bg-gray-100 animate-pulse" />
                  ))
                : rows.map((r) => {
                    const isMineHeld = r.status === 'held' && r.held_by === profile?.id
                    const isLocked = !!r.order_id
                    const disabled =
                      isBlocked ||
                      isLocked ||
                      r.status === 'sold' ||
                      (r.status === 'held' && !isMineHeld) ||
                      (r.status === 'free' && cart.length >= MAX_PER_ORDER)

                    return (
                      <button
                        key={r.id}
                        id={`num-${r.id}`}
                        onClick={() =>
                          isLocked ? undefined : isMineHeld ? releaseOne(r.id) : pickOne(r.id)
                        }
                        disabled={disabled}
                        className={`h-10 rounded-lg text-xs border ${colorFor(
                          r
                        )} disabled:opacity-60`}
                      >
                        {r.id}
                      </button>
                    )
                  })}
            </div>
          </>
        )}

        {activeTab === 'cuenta' && (
          <>
            <MyNumbers userId={profile?.id} />
            <OrderHistory userId={profile?.id} />
          </>
        )}
      </div>
    </div>
  )
}