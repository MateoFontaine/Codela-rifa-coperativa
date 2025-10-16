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
    Cargando...
  </h3>
  <p className="text-sm sm:text-base text-gray-600 animate-pulse">
    Un momento por favor
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
  const [orderCreatedAt, setOrderCreatedAt] = useState<string | null>(null)
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
  
  // Estados para las notas
  const [notes, setNotes] = useState<string>('')
  const [savingNote, setSavingNote] = useState(false)

  // Timer countdown
  const [timeLeft, setTimeLeft] = useState<string>('')

  useEffect(() => {
    if (!orderCreatedAt) return

    const calculateTimeLeft = () => {
      const created = new Date(orderCreatedAt).getTime()
      const now = Date.now()
      const oneHour = 60 * 60 * 1000
      const expires = created + oneHour
      const remaining = expires - now

      if (remaining <= 0) {
        return 'Tiempo expirado'
      }

      const minutes = Math.floor(remaining / 60000)
      const seconds = Math.floor((remaining % 60000) / 1000)
      return `${minutes}m ${seconds}s`
    }

    setTimeLeft(calculateTimeLeft())

    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(interval)
  }, [orderCreatedAt])

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
          .select('id,user_id,status,total_amount,price_per_number,created_at,notes')
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
        setOrderCreatedAt(ord.created_at)
        setNumbers(list)
        setTotal(ord.total_amount || list.length * (ord.price_per_number || PRICE_FALLBACK))
        setPricePer(ord.price_per_number || PRICE_FALLBACK)
        setProofUrl((pr as { file_url?: string } | null)?.file_url || null)
        setNotes((ord as any).notes || '') // 👈 Cargar nota existente
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
      setOrderCreatedAt(new Date().toISOString())
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

  // 👇 NUEVO: Función para guardar nota
  const saveNote = async () => {
    if (!profile || !orderId) return
    setSavingNote(true)
    try {
      const res = await fetch('/api/update-order-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.id,
          orderId,
          notes: notes
        })
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.error || 'No se pudo guardar la nota')
      alert('✓ Nota guardada correctamente')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al guardar nota'
      alert(msg)
    } finally {
      setSavingNote(false)
    }
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
          userId: profile.id, 
          orderId, 
          filePath: path,
          publicUrl: pub.publicUrl, 
          fileType: file.type, 
          sizeBytes: file.size
        })
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.error || 'No se pudo registrar el comprobante')

      setProofUrl(pub.publicUrl)
      setOrderStatus('under_review')
      alert('¡Comprobante recibido! En breve lo estaremos revisando.')
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

  if (loading) {
    return <CheckoutLoader />
  }

  return (
    <div className="max-w-2xl mx-auto bg-white border rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-6">
      <header className="space-y-1">
        <h2 className="text-lg sm:text-xl font-semibold">Confirmar compra</h2>
      </header>

      {canUpload && !isClosed && timeLeft && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-red-800 mb-1">⏱️ Tiempo restante para subir el comprobante</h3>
            <p className="text-sm text-red-700">
              {timeLeft === 'Tiempo expirado' ? (
                <span className="font-bold">⚠️ Tu orden ha expirado. Los números fueron liberados.</span>
              ) : (
                <>
                  Te quedan <span className="font-bold font-mono">{timeLeft}</span> para subir tu comprobante.
                  Si no lo hacés, tu orden se cancelará automáticamente.
                </>
              )}
            </p>
          </div>
        </div>
      )}

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

      {/* 👇 NUEVO: Sección de nota */}
      {!isClosed && (
        <section className="rounded-xl border p-3 sm:p-4 space-y-3">
          <h3 className="font-semibold text-sm sm:text-base">Nota o aclaración (opcional)</h3>
          <p className="text-xs text-gray-600">
            Dejá cualquier comentario sobre tu compra
          </p>
          
          <div className="space-y-2">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Compra de mi Hermano Juan, Numeros del grupo de Futbol... etc"
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {notes.length}/500 caracteres
              </p>
              <button
                onClick={saveNote}
                disabled={savingNote}
                className="px-4 py-2 text-xs sm:text-sm rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingNote ? 'Guardando...' : 'Guardar nota'}
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-xl border p-3 sm:p-4">
        <h3 className="font-semibold text-sm sm:text-base mb-2">Transferencia bancaria</h3>
        <ul className="text-xs sm:text-sm space-y-2">
          <li className="flex items-center justify-between gap-2">
            <span className="break-words">Alias: <b>{bank?.alias || '-'}</b></span>
            {bank?.alias && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(bank.alias)
                  alert('Alias copiado al portapapeles')
                }}
                className="flex-shrink-0 px-2 py-1 text-xs rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium transition-colors flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copiar
              </button>
            )}
          </li>

          <li className="flex items-center justify-between gap-2">
            <span className="break-words">CVU: <b>{bank?.cvu || '-'}</b></span>
            {bank?.cvu && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(bank.cvu)
                  alert('CVU copiado al portapapeles')
                }}
                className="flex-shrink-0 px-2 py-1 text-xs rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium transition-colors flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copiar
              </button>
            )}
          </li>

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

      {canUpload && !isClosed && (
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

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
            <h4 className="text-xs font-semibold text-blue-900 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              ¿Cómo subir tu comprobante?
            </h4>
            <ul className="text-xs text-blue-800 space-y-1 pl-5 list-disc">
              <li>Tomá una <b>captura de pantalla</b> o <b>foto</b> del comprobante de transferencia</li>
              <li>Asegurate de que se vea claramente el <b>monto</b>, <b>fecha</b> y <b>destinatario</b></li>
              <li>También podés exportar el comprobante en formato <b>PDF</b> desde tu app bancaria</li>
              <li>Si tenés problemas, contactanos por <b>WhatsApp</b></li>
            </ul>
          </div>
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
              className="inline-block px-3 py-2 mr-3 text-xs sm:text-sm rounded-xl border hover:bg-gray-50"
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
              En revisión. Un admin confirmará tu comprobante.
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

      {/* 👇 NUEVO: Mostrar nota si está cerrada la orden */}
      {isClosed && notes && (
        <section className="rounded-xl border p-3 sm:p-4 space-y-2">
          <h3 className="font-semibold text-sm sm:text-base">Nota dejada</h3>
          <p className="text-xs sm:text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
            {notes}
          </p>
        </section>
      )}
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutLoader />}>
      <CheckoutPageInner />
    </Suspense>
  )
}