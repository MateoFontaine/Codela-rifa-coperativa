'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase'

const PRICE_FALLBACK = 1000
const MAX_PER_ORDER = 50

type Bank = { alias: string; cvu: string; holder: string }
type Support = { whatsapp: string }
type OrderStatus = 'awaiting_proof' | 'under_review' | 'paid' | 'rejected' | 'canceled' | 'pending'

export default function CheckoutPage() {
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

  // proof existente (si ya subió)
  const [proofUrl, setProofUrl] = useState<string | null>(null)

  // upload
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  // modal borrar
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data: u } = await supa.auth.getUser()
      if (!u.user) { router.replace('/auth/login'); return }
      const { data: prof } = await supa.from('app_users').select('id,email').eq('auth_user_id', u.user.id).single()
      if (!prof) { alert('Perfil no encontrado'); router.replace('/'); return }
      setProfile({ id: prof.id, email: prof.email })

      // settings
      const [{ data: bankRow }, { data: supRow }] = await Promise.all([
        supa.from('settings').select('value').eq('key', 'bank').single(),
        supa.from('settings').select('value').eq('key', 'support').single(),
      ])
      setBank((bankRow?.value as Bank) || null)
      setSupport((supRow?.value as Support) || null)

      // ¿viene con order=...?
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
        const list = (nums || []).map((r: any) => Number(r.id)).sort((a,b)=>a-b)

        setOrderId(ord.id)
        setOrderStatus((ord.status as OrderStatus) || 'awaiting_proof')
        setNumbers(list)
        setTotal(ord.total_amount || list.length * (ord.price_per_number || PRICE_FALLBACK))
        setPricePer(ord.price_per_number || PRICE_FALLBACK)
        setProofUrl(pr?.file_url || null)
        setLoading(false)
        return
      }

      // crear desde ?n=...
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

      // setear estado local
      setOrderId(j.orderId)
      setOrderStatus('awaiting_proof')
      setNumbers((j.numbers as number[]).slice().sort((a,b)=>a-b))
      setTotal(j.total)
      setPricePer(j.price || PRICE_FALLBACK)
      setProofUrl(null)
      setLoading(false)

      // evitar duplicados al refrescar
      router.replace(`/checkout?order=${j.orderId}`)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

      // subir a Storage (bucket proofs)
      const { error: upErr } = await supa.storage.from('proofs').upload(path, file, {
        upsert: true, contentType: file.type
      })
      if (upErr) throw new Error(upErr.message)
      const { data: pub } = supa.storage.from('proofs').getPublicUrl(path)

      // registrar en BD y pasar a under_review
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
      alert('¡Comprobante recibido! En 24 h se acreditarán tus números.')
    } catch (e: any) {
      alert(e?.message || 'Error al subir comprobante')
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
      setOrderStatus('awaiting_proof') // asumimos que el endpoint deja la orden en awaiting_proof
      alert('Comprobante eliminado. Podés subir uno nuevo.')
    } catch (e: any) {
      alert(e?.message || 'Error al eliminar comprobante')
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto bg-white border rounded-2xl p-6 shadow-sm">
        <p>Cargando checkout…</p>
      </div>
    )
  }

  const canUpload = orderStatus === 'awaiting_proof' || orderStatus === 'rejected'
  const showProofBlock = !!proofUrl
  const isClosed = orderStatus === 'paid' || orderStatus === 'canceled'

  return (
    <div className="max-w-2xl mx-auto bg-white border rounded-2xl p-6 shadow-sm space-y-6">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold">Confirmar compra</h2>
        <p className="text-sm text-gray-600">
          Tenés <b>1 hora</b> para subir el comprobante; si no, se cancelará la orden y se liberarán los números.
        </p>
        <div className="text-xs">
          Estado: <span className="px-2 py-1 rounded-lg border">{orderStatus}</span>
        </div>
      </header>

      <section className="space-y-1">
        <p className="text-sm">Números ({numbers.length}):</p>
        <div className="flex flex-wrap gap-2">
          {numbers.map(n => (
            <span key={n} className="text-sm px-2 py-1 rounded-lg bg-amber-100 border">{n}</span>
          ))}
        </div>
        <p className="mt-2">Precio por número: <b>${pricePer} ARS</b></p>
        <p>Total: <b>{totalFmt}</b></p>
      </section>

      <section className="rounded-xl border p-4">
        <h3 className="font-semibold mb-2">Transferencia bancaria</h3>
        <ul className="text-sm space-y-1">
          <li>Alias: <b>{bank?.alias || '-'}</b></li>
          <li>CVU: <b>{bank?.cvu || '-'}</b></li>
          <li>Titular: <b>{bank?.holder || '-'}</b></li>
        </ul>
        {support?.whatsapp && (
          <a
            href={`https://wa.me/${support.whatsapp.replace(/[^\d]/g,'')}`}
            target="_blank" rel="noreferrer"
            className="inline-block mt-3 px-3 py-2 rounded-xl border"
          >
            Soporte por WhatsApp
          </a>
        )}
      </section>

      {/* Zona de comprobante */}
      {!showProofBlock && canUpload && !isClosed && (
        <section className="rounded-xl border p-4">
          <h3 className="font-semibold mb-2">Subir comprobante (JPG/PNG/PDF · máx. 10MB)</h3>
          <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={onFileChange} className="block" />
          <button
            disabled={!file || uploading}
            onClick={uploadProof}
            className="mt-3 px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50"
          >
            {uploading ? 'Subiendo…' : 'Enviar comprobante'}
          </button>
          <p className="text-xs text-gray-600 mt-2">En 24 h se acreditarán los números.</p>
        </section>
      )}

      {(showProofBlock || isClosed || orderStatus === 'under_review') && (
        <section className="rounded-xl border p-4">
          <h3 className="font-semibold mb-2">Comprobante</h3>
          {proofUrl ? (
            <a href={proofUrl} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-xl border inline-block">
              Ver comprobante
            </a>
          ) : (
            <p className="text-sm text-gray-600">No hay comprobante adjunto.</p>
          )}

          {!isClosed && proofUrl && (
            <button
              onClick={() => setConfirmOpen(true)}
              className="ml-2 px-3 py-2 rounded-xl bg-rose-600 text-white"
            >
              Eliminar comprobante
            </button>
          )}

          {orderStatus === 'rejected' && (
            <p className="text-xs text-amber-600 mt-2">
              Tu comprobante fue rechazado. Podés subir uno nuevo.
            </p>
          )}

          {orderStatus === 'under_review' && (
            <p className="text-xs text-gray-600 mt-2">
              En revisión. Un admin confirmará dentro de 24 h.
            </p>
          )}

          {/* Modal simple */}
          {confirmOpen && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
                <h4 className="font-semibold mb-2">¿Eliminar comprobante?</h4>
                <p className="text-sm text-gray-600 mb-4">Esta acción no se puede deshacer.</p>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setConfirmOpen(false)} className="px-3 py-2 rounded-xl border">Cancelar</button>
                  <button onClick={deleteProof} className="px-3 py-2 rounded-xl bg-rose-600 text-white">Eliminar</button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
