'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase'

export default function Header() {
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const supa = supabaseBrowser()
    supa.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null))
    const { data: sub } = supa.auth.onAuthStateChange((_e, session) =>
      setEmail(session?.user?.email ?? null)
    )
    return () => sub.subscription.unsubscribe()
  }, [])

  const logout = async () => {
    await supabaseBrowser().auth.signOut()
    window.location.href = '/'
  }

  return (
    <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold">
          Cooperativa · Rifa
        </Link>

        <nav className="flex items-center gap-3 text-sm">
          {email ? (
            <>
              <span className="hidden sm:inline text-gray-600">Hola, {email}</span>
              <Link href="/app" className="px-3 py-1.5 rounded-xl border">Mi cuenta</Link>
              <button onClick={logout} className="px-3 py-1.5 rounded-xl bg-black text-white">
                Salir
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="px-3 py-1.5 rounded-xl border">Ingresar</Link>
              <Link href="/auth/register" className="px-3 py-1.5 rounded-xl bg-black text-white">
                Crear cuenta
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
