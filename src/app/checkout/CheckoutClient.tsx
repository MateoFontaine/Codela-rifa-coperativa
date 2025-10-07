'use client'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase'

const PRICE_FALLBACK = 1000
const MAX_PER_ORDER = 50

const formatNumber = (n: number) => String(n).padStart(5, '0')

type Bank = { alias: string; cvu: string; holder: string }
type Support = { whatsapp: string }
type OrderStatus = 'awaiting_proof' | 'under_review' | 'paid' | 'rejected' | 'canceled' | 'pending'

// ============================================
// Componente de Loader Moderno
// ============================================
function CheckoutLoader() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev
        return prev + Math.random() * 15
      })
    }, 200)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="max-w-2xl mx-auto bg-white border rounded-2xl p-8 sm:p-12 shadow-sm">
      <div className="flex flex-col items-center justify-center space-y-6">
        
        {/* Spinner circular con anillo */}
        <div className="relative w-20 h-20 sm:w-24 sm:h-24">
          {/* Anillo de fondo */}
          <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
          
          {/* Anillo animado */}
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-green-500 border-r-green-500 animate-spin"></div>
          
          {/* Círculo interior con pulso */}
          <div className="absolute inset-3 rounded-full bg-green-50 animate-pulse flex items-center justify-center">
            <svg 
              className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
          </div>
        </div>

        {/* Texto animado */}
        <div className="text-center space-y-2">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
            Preparando tu compra
          </h3>
          <p className="text-sm sm:text-base text-gray-600 animate-pulse">
            Estamos reservando tus números...
          </p>
        </div>

        {/* Barra de progreso */}
        <div className="w-full max-w-md">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 text-center mt-2">
            {Math.round(progress)}%
          </p>
        </div>

        {/* Puntos animados */}
        <div className="flex gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Componente Principal del Checkout
// ============================================
function CheckoutPageInner() {
  const supa = useMemo(() => supabaseBrowser(), [])
  const router = useRouter()
  const params = useSearchParams()

  const [profile, setProfile] = useState<{ id: string; email: string } | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('awaiting_proof')
  const [numbers, setNumbers] = useState<number[]>([])
  const [total, setTotal] = useState<number>(0)
  const [pricePer, setPricePer] = useState<number>(PRICE_FALLBACK)
  const [bank, setBank] = useState<Bank | null>(null)
  const [support, setSupport] = useState<Support | null>(null)
  const [loading, setLoading] = useState(true)

  const [proofUrl, setProofUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data: u } = await supa.auth.getUser()
      if (!u.user) { router.replace('/auth/login'); return }
      const { data: prof } = await supa.from('app_users').select('id,email').eq('auth_user_id', u.user.id).single()
      if (!prof) { alert('Perfil no encontrado'); router.replace('/'); return }
      setProfile({ id: prof.id, email: prof.email })

      const [{ data: bankRow }, { data: supRow }] = await Promise.all([
        supa.from('settings').select('value').eq('key', 'bank').single(),
        supa.from('settings').select('value').eq('key', 'support').single(),
      ])
      setBank((bankRow?.value as Bank) || null)
      setSupport((supRow?.value as Support) || null)

      const existingOrderId = params.get('order')
      if (existingOrderId) {
        const { data: ord, error: ordErr } = await supa
          .from('orders')
          .select('id,user_id,status,total_amount,price_per_number')
          .eq('id', existingOrderId)
          .single()
        if (ordErr || !ord) { alert('Orden no encontrada'); router.replace('/app'); return }
        if (ord.user_id !== prof.id) { alert('No autorizado'); router.replace('/app'); return }

        const [{ data: nums }, { data: pr }] = await Promise.all([
          supa.from('raffle_numbers').select('id').eq('order_id', ord.id),
          supa.from('payment_proofs').select('file_url').eq('order_id', ord.id).single(),
        ])
        const list = (nums || []).map(r => Number((r as { id: number }).id)).sort((a,b)=>a-b)

        setOrderId(ord.id)
        setOrderStatus((ord.status as OrderStatus) || 'awaiting_proof')
        setNumbers(list)
        setTotal(ord.total_amount || list.length * (ord.price_per_number || PRICE_FALLBACK))
        setPricePer(ord.price_per_number || PRICE_FALLBACK)
        setProofUrl((pr as { file_url?: string } | null)?.file_url || null)
        setLoading(false)
        return
      }

      const nParam = params.get('n') || ''
      const nums = nParam.split(',').map(s => Number(s)).filter(n => Number.isFinite(n))
      if (nums.length === 0 || nums.length > MAX_PER_ORDER) {
        alert(`No hay números válidos en el carrito (máximo ${MAX_PER_ORDER}).`)
        router.replace('/app'); return
      }

      const res = await fetch('/api/create-order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: prof.id, numbers: nums })
      })
      const j = await res.json()
      if (!res.ok) { alert(j?.error || 'No se pudo crear la orden'); router.replace('/app'); return }

      setOrderId(j.orderId as string)
      setOrderStatus('awaiting_proof')
      setNumbers((j.numbers as number[]).slice().sort((a,b)=>a-b))
      setTotal(j.total as number)
      setPricePer((j.price as number) || PRICE_FALLBACK)
      setProofUrl(null)
      setLoading(false)

      router.replace(`/checkout?order=${j.orderId}`)
    })()
  }, [supa, router, params])

  const totalFmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(total || 0)

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null
    if (!f) { setFile(null); return }
    const okType = ['image/jpeg','image/png','application/pdf'].includes(f.type)
    if (!okType) { alert('Formato inválido (JPG/PNG/PDF)'); e.target.value = ''; return }
    if (f.size > 10 * 1024 * 1024) { alert('Archivo > 10MB'); e.target.value = ''; return }
    setFile(f)
  }

  const uploadProof = async () => {
    if (!profile || !orderId || !file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'dat'
      const path = `${orderId}/${Date.now()}.${ext}`
      const { error: upErr } = await supa.storage.from('proofs').upload(path, file, {
        upsert: true, contentType: file.type
      })
      if (upErr) throw new Error(upErr.message)
      const { data: pub } = supa.storage.from('proofs').getPublicUrl(path)

      const res = await fetch('/api/upload-proof', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.id, orderId, filePath: path,
          publicUrl: pub.publicUrl, fileType: file.type, sizeBytes: file.size
        })
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.error || 'No se pudo registrar el comprobante')

      setProofUrl(pub.publicUrl)
      setOrderStatus('under_review')
      alert('¡Comprobante recibido! En 24 h se acreditarán tus números.')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al subir comprobante'
      alert(msg)
    } finally {
      setUploading(false)
    }
  }

  const deleteProof = async () => {
    if (!profile || !orderId) return
    setConfirmOpen(false)
    try {
      const res = await fetch('/api/delete-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id, orderId })
      })
      const j = await res.json()
      if (!res.ok && !j?.ok) throw new Error(j?.error || 'No se pudo eliminar el comprobante')
      setProofUrl(null)
      setOrderStatus('awaiting_proof')
      alert('Comprobante eliminado. Podés subir uno nuevo.')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al eliminar comprobante'
      alert(msg)
    }
  }

  const canUpload = orderStatus === 'awaiting_proof' || orderStatus === 'rejected'
  const showProofBlock = !!proofUrl
  const isClosed = orderStatus === 'paid' || orderStatus === 'canceled'

  // Mostrar loader mientras carga
  if (loading) {
    return <CheckoutLoader />
  }

  return (
    <div className="max-w-2xl mx-auto bg-white border rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-6">
      <header className="space-y-1">
        <h2 className="text-lg sm:text-xl font-semibold">Confirmar compra</h2>
        <p className="text-xs sm:text-sm text-gray-600">
          Tenés <b>1 hora</b> para subir el comprobante; si no, se cancelará la orden y se liberarán los números.
        </p>
      </header>

      <section className="space-y-2">
        <p className="text-xs sm:text-sm font-medium">Números ({numbers.length}):</p>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {numbers.map(n => (
            <span key={n} className="text-xs sm:text-sm px-2 py-1 rounded-lg bg-green-100 border">
              {formatNumber(n)}
            </span>
          ))}
        </div>
        <p className="text-xs sm:text-sm mt-2">Precio por número: <b>${pricePer} ARS</b></p>
        <p className="text-xs sm:text-sm">Total: <b>{totalFmt}</b></p>
      </section>

      <section className="rounded-xl border p-3 sm:p-4">
        <h3 className="font-semibold text-sm sm:text-base mb-2">Transferencia bancaria</h3>
        <ul className="text-xs sm:text-sm space-y-1">
          <li className="break-words">Alias: <b>{bank?.alias || '-'}</b></li>
          <li className="break-words">CVU: <b>{bank?.cvu || '-'}</b></li>
          <li className="break-words">Titular: <b>{bank?.holder || '-'}</b></li>
        </ul>
        {support?.whatsapp && (
          <a 
            href={`https://wa.me/${support.whatsapp.replace(/[^\d]/g,'')}`}
            target="_blank" 
            rel="noreferrer"
            className="inline-block mt-3 px-3 py-2 text-xs sm:text-sm rounded-xl border hover:bg-gray-50"
          >
            Soporte por WhatsApp
          </a>
        )}
      </section>

      {!showProofBlock && canUpload && !isClosed && (
        <section className="rounded-xl border p-3 sm:p-4 space-y-3">
          <h3 className="font-semibold text-sm sm:text-base">Subir comprobante</h3>
          <p className="text-xs text-gray-600">JPG/PNG/PDF · máx. 10MB</p>
          
          <div className="space-y-2">
            <input 
              type="file" 
              accept=".jpg,.jpeg,.png,.pdf" 
              onChange={onFileChange} 
              className="block w-full text-xs sm:text-sm file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border file:border-gray-300 file:text-xs sm:file:text-sm file:font-medium file:bg-white hover:file:bg-gray-50 file:cursor-pointer"
            />
            {file && (
              <p className="text-xs text-gray-600 truncate">
                Archivo: {file.name}
              </p>
            )}
          </div>

          <button
            disabled={!file || uploading}
            onClick={uploadProof}
            className="w-full sm:w-auto px-4 py-2 text-sm rounded-xl bg-black text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Subiendo…' : 'Enviar comprobante'}
          </button>
          <p className="text-xs text-gray-600">En 24 h se acreditarán los números.</p>
        </section>
      )}

      {(showProofBlock || isClosed || orderStatus === 'under_review') && (
        <section className="rounded-xl border p-3 sm:p-4 space-y-3">
          <h3 className="font-semibold text-sm sm:text-base">Comprobante</h3>
          {proofUrl ? (
            <a 
              href={proofUrl} 
              target="_blank" 
              rel="noreferrer" 
              className="inline-block px-3 py-2 text-xs sm:text-sm rounded-xl border hover:bg-gray-50"
            >
              Ver comprobante
            </a>
          ) : (
            <p className="text-xs sm:text-sm text-gray-600">No hay comprobante adjunto.</p>
          )}

          {!isClosed && proofUrl && (
            <button
              onClick={() => setConfirmOpen(true)}
              className="px-3 py-2 text-xs sm:text-sm rounded-xl bg-rose-600 text-white hover:bg-rose-700"
            >
              Eliminar comprobante
            </button>
          )}

          {orderStatus === 'rejected' && (
            <p className="text-xs text-green-600">
              Tu comprobante fue rechazado. Podés subir uno nuevo.
            </p>
          )}

          {orderStatus === 'under_review' && (
            <p className="text-xs text-gray-600">
              En revisión. Un admin confirmará dentro de 24 h.
            </p>
          )}

          {confirmOpen && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-sm">
                <h4 className="font-semibold text-sm sm:text-base mb-2">¿Eliminar comprobante?</h4>
                <p className="text-xs sm:text-sm text-gray-600 mb-4">Esta acción no se puede deshacer.</p>
                <div className="flex gap-2 justify-end">
                  <button 
                    onClick={() => setConfirmOpen(false)} 
                    className="px-3 py-2 text-xs sm:text-sm rounded-xl border hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={deleteProof} 
                    className="px-3 py-2 text-xs sm:text-sm rounded-xl bg-rose-600 text-white hover:bg-rose-700"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

// ============================================
// Export principal con Suspense
// ============================================
export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutLoader />}>
      <CheckoutPageInner />
    </Suspense>
  )
}