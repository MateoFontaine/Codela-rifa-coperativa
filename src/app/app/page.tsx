// src/app/app/page.tsx
'use client'
export const dynamic = 'force-dynamic'
export const revalidate = 0

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

const PAGE_SIZE = 100
const TOTAL_NUMBERS = 100000
const MAX_PER_ORDER = 50

export default function UserRaffle() {
  const supa = useMemo(() => supabaseBrowser(), [])
  const router = useRouter()

  const [profile, setProfile] = useState<{ id: string; email: string } | null>(null)

  // grilla
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<RaffleNumber[]>([])
  const [loading, setLoading] = useState(false)

  // carrito
  const [cart, setCart] = useState<number[]>([])
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [countdown, setCountdown] = useState('')

  // ===== Auth + perfil (bloquea admins en /app)
  useEffect(() => {
    ;(async () => {
      const { data: u } = await supa.auth.getUser()
      if (!u.user) { router.replace('/auth/login'); return }

      const { data: prof } = await supa
        .from('app_users')
        .select('id,email,is_admin')
        .eq('auth_user_id', u.user.id)
        .single()

      if (!prof) { alert('No se encontró el perfil del usuario.'); return }

      if (prof.is_admin) { // admin no puede comprar
        router.replace('/admin')
        return
      }

      setProfile({ id: prof.id, email: prof.email })
    })()
  }, [supa, router])

  // ===== Cargar página (NO toca el carrito)
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

  // ===== Countdown carrito
  useEffect(() => {
    if (!expiresAt) { setCountdown(''); return }
    const iv = setInterval(() => {
      const ms = new Date(expiresAt).getTime() - Date.now()
      if (ms <= 0) { setCountdown('00:00'); clearInterval(iv); return }
      const m = Math.floor(ms / 60000)
      const s = Math.floor((ms % 60000) / 1000)
      setCountdown(`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }, 500)
    return () => clearInterval(iv)
  }, [expiresAt])

  // ===== Helpers
  const maxPage = Math.ceil(TOTAL_NUMBERS / PAGE_SIZE)
  const goTo = (p: number) => setPage(Math.min(Math.max(1, p), maxPage))
  const colorFor = (r: RaffleNumber) =>
    r.status === 'free' ? 'bg-emerald-100 hover:bg-emerald-200'
    : r.status === 'held' ? 'bg-amber-100'
    : 'bg-rose-100'

  // ================== Acciones ==================

  // Reservar 1 (optimista)
  const pickOne = async (num: number) => {
    if (!profile) return
    if (cart.length >= MAX_PER_ORDER) { alert(`Máximo ${MAX_PER_ORDER} por compra`); return }
    const r = rows.find(x => x.id === num)
    if (!r || r.status !== 'free' || r.order_id) return

    // UI optimista
    setCart(prev => [...prev, num])
    setRows(prev => prev.map(x => x.id === num ? { ...x, status: 'held', held_by: profile.id } : x))
    const optimisticExpire = new Date(Date.now() + 10*60_000).toISOString()
    if (!expiresAt) setExpiresAt(optimisticExpire)

    const res = await fetch('/api/hold', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: profile.id, numbers: [num] })
    })
    const j = await res.json()
    const ok = j?.results?.[0]?.ok
    if (ok) setExpiresAt(j.expiresAt || optimisticExpire)
    else {
      // revertir
      setRows(prev => prev.map(x => x.id === num ? { ...x, status: 'free', held_by: null } : x))
      setCart(prev => {
        const next = prev.filter(n => n !== num)
        if (next.length === 0) setExpiresAt(null)
        return next
      })
      alert('Ese número ya no está disponible')
    }
  }

  // Liberar 1 (usa backend y revierte si no se liberó)
  const releaseOne = async (num: number) => {
    if (!profile) return
    const row = rows.find(x => x.id === num)
    if (row?.order_id) return // bloqueado por orden

    // optimista
    const remainingAfter = cart.filter(n => n !== num).length
    setCart(prev => prev.filter(n => n !== num))
    setRows(prev => prev.map(x => x.id === num ? { ...x, status: 'free', held_by: null } : x))
    if (remainingAfter === 0) setExpiresAt(null)

    const res = await fetch('/api/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: profile.id, numbers: [num] }),
    })
    const j = await res.json()
    const released: number[] = j?.released || []

    if (!res.ok || !released.includes(num)) {
      // revertir si no lo liberó el server
      setRows(prev => prev.map(x => x.id === num ? { ...x, status: 'held', held_by: profile!.id } : x))
      setCart(prev => [...prev, num])
      if (!expiresAt) setExpiresAt(new Date(Date.now() + 10 * 60_000).toISOString())
      alert(j?.error || 'No se pudo liberar')
    }
  }

  // Liberar varios (sirve para "Vaciar" aunque haya números fuera de la página)
  const releaseMany = async (nums: number[]) => {
    if (!profile || nums.length === 0) return

    const res = await fetch('/api/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: profile.id, numbers: nums }),
    })
    const j = await res.json()
    if (!res.ok) { alert(j?.error || 'No se pudo liberar'); return }

    const released: number[] = j.released || []

    // actualizar grilla para los que estén visibles
    if (released.length) {
      setRows(prev => prev.map(x => released.includes(x.id) ? { ...x, status: 'free', held_by: null } : x))
    }

    // sacar del carrito sólo los liberados
    setCart(prev => prev.filter(n => !released.includes(n)))

    // si quedó vacío, cortar expiración
    setTimeout(() => {
      setCart(prev => {
        if (prev.length === 0) setExpiresAt(null)
        return prev
      })
    }, 0)
  }

  // "Vaciar" llama a releaseMany con TODO el carrito
  const emptyCart = () => releaseMany([...cart])

  // Azar global (server hace el hold)
  const pickRandomAll = async (qty: number) => {
    if (!profile) return
    const can = Math.min(qty, MAX_PER_ORDER - cart.length)
    if (can <= 0) { alert(`Máximo ${MAX_PER_ORDER} por compra`); return }

    const res = await fetch('/api/random-hold', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: profile.id, qty: can })
    })
    const j = await res.json()
    if (!res.ok) { alert(j?.error || 'No se pudo seleccionar al azar'); return }

    // ✅ tipamos j.held para que el callback infiera number
const held: number[] = Array.isArray(j?.held) ? (j.held as unknown[]).map((x) => Number(x)) : [];
const newHeld: number[] = held.filter((n) => !cart.includes(n));

    if (newHeld.length === 0) { alert('No se encontraron números libres suficientes'); return }

    setCart(prev => Array.from(new Set([...prev, ...newHeld])))
    setRows(prev => prev.map(x => newHeld.includes(x.id) ? { ...x, status: 'held', held_by: profile!.id } : x))
    setExpiresAt(j.expiresAt || new Date(Date.now() + 10*60_000).toISOString())
  }

  // Reservar varios de la página actual
  const pickBatch = async (qty: number) => {
    if (!profile) return
    const libres = rows.filter(r => r.status === 'free' && !r.order_id && !cart.includes(r.id))
    if (!libres.length) { alert('No hay libres en esta página'); return }
    const can = Math.min(qty, MAX_PER_ORDER - cart.length, libres.length)
    const chosen = libres.slice(0).sort(() => Math.random() - 0.5).slice(0, can).map(x => x.id)

    // optimista
    setCart(prev => [...prev, ...chosen])
    setRows(prev => prev.map(x => chosen.includes(x.id) ? { ...x, status: 'held', held_by: profile!.id } : x))
    const optimisticExpire = new Date(Date.now()+10*60_000).toISOString()
    if (!expiresAt) setExpiresAt(optimisticExpire)

    const res = await fetch('/api/hold', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: profile!.id, numbers: chosen })
    })
    const j = await res.json()
    const okIds: number[] = (j?.results || []).filter((r: any) => r.ok).map((r: any) => r.num)

    const failed = chosen.filter(n => !okIds.includes(n))
    if (failed.length) {
      setRows(prev => prev.map(x => failed.includes(x.id) ? { ...x, status: 'free', held_by: null } : x))
      setCart(prev => prev.filter(n => !failed.includes(n)))
      if (cart.length - failed.length <= 0) setExpiresAt(null)
      alert(`${failed.length} ya no estaban disponibles`)
    }

    if (okIds.length) setExpiresAt(j.expiresAt || optimisticExpire)
  }

  // Buscar y centrar
  const handleSearchGo = (v: number) => {
    const targetPage = Math.ceil(v / PAGE_SIZE)
    setPage(targetPage)
    setTimeout(() => {
      const el = document.getElementById(`num-${v}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el?.classList.add('ring-2','ring-blue-400')
      setTimeout(() => el?.classList.remove('ring-2','ring-blue-400'), 1500)
    }, 150)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {/* Columna izquierda */}
      <div className="space-y-6 lg:col-span-1">
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
                {cart.slice().sort((a,b)=>a-b).map(n => (
                  <button
                    key={n}
                    onClick={() => releaseOne(n)}
                    className="text-sm px-2 py-1 rounded-lg bg-amber-100 border hover:bg-amber-200"
                    title="Quitar del carrito"
                  >
                    {n} <span className="ml-1">×</span>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={emptyCart} className="px-3 py-2 rounded-xl border">
                  Vaciar
                </button>
                <button
                  disabled={cart.length === 0}
                  onClick={() => {
                    const qs = cart.join(',')
                    setCart([]); setExpiresAt(null)
                    router.push(`/checkout?n=${qs}`)
                  }}
                  className="px-3 py-2 rounded-xl bg-black text-white disabled:opacity-50"
                >
                  Confirmar
                </button>
              </div>
            </>
          )}
        </div>

        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold mb-3">Acciones rápidas (al azar en toda la rifa)</h3>
          <div className="flex gap-2">
            <button onClick={() => pickRandomAll(1)}  className="px-3 py-2 rounded-xl border w-full">+1</button>
            <button onClick={() => pickRandomAll(5)}  className="px-3 py-2 rounded-xl border w-full">+5</button>
            <button onClick={() => pickRandomAll(10)} className="px-3 py-2 rounded-xl border w-full">+10</button>
          </div>
        </div>

        <OrderHistory userId={profile?.id} />
      </div>

      {/* Derecha: buscador + grilla */}
      <div className="lg:col-span-2 xl:col-span-3 space-y-4">
        <div className="bg-white border rounded-2xl p-4 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchNumber total={TOTAL_NUMBERS} pageSize={PAGE_SIZE} onGo={handleSearchGo} />
          <div className="sm:ml-auto flex items-center gap-2">
            <button onClick={() => goTo(page-1)} className="px-3 py-2 rounded-xl border">«</button>
            <span className="text-sm">Página {page}/{Math.ceil(TOTAL_NUMBERS/PAGE_SIZE)}</span>
            <button onClick={() => goTo(page+1)} className="px-3 py-2 rounded-xl border">»</button>
          </div>
        </div>

        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 xl:grid-cols-12 gap-1.5 bg-white border rounded-2xl p-4 shadow-sm">
          {loading
            ? Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <div key={i} className="h-9 md:h-10 rounded-lg bg-gray-100 animate-pulse" />
              ))
            : rows.map(r => {
                const isMineHeld = r.status === 'held' && r.held_by === profile?.id
                const isLocked = !!r.order_id
                const disabled =
                  isLocked ||
                  r.status === 'sold' ||
                  (r.status === 'held' && !isMineHeld) ||
                  (r.status === 'free' && cart.length >= MAX_PER_ORDER)

                return (
                  <button
                    key={r.id}
                    id={`num-${r.id}`}
                    onClick={() => (isLocked ? undefined : (isMineHeld ? releaseOne(r.id) : pickOne(r.id)))}
                    disabled={disabled}
                    className={`h-9 md:h-10 rounded-lg text-[11px] md:text-xs border ${colorFor(r)} disabled:opacity-60`}
                    title={
                      isLocked
                        ? `#${r.id} · en orden`
                        : `#${r.id} · ${r.status}${isMineHeld ? ' (tuyo)' : ''}`
                    }
                  >
                    {r.id}
                  </button>
                )
              })}
        </div>
      </div>
    </div>
  )
}
