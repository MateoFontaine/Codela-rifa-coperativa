// src/app/checkout/page.tsx  (SERVER)
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

import { Suspense } from 'react'
import CheckoutClient from './CheckoutClient'

export default function Page() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto p-6">Cargando…</div>}>
      <CheckoutClient />
    </Suspense>
  )
}
