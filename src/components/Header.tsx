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
    <header className="border-b border-blue-200 bg-gradient-to-r from-blue-500 to-cyan-400 backdrop-blur sticky top-0 z-10 shadow-md">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-white text-lg hover:opacity-90 transition-opacity">
          ⚽ Cooperativa · Rifa
        </Link>

        <nav className="flex items-center gap-3 text-sm">
          {email ? (
            <>
              <span className="hidden sm:inline text-white font-medium">Hola, {email}</span>
              <Link 
                href="/app" 
                className="px-3 py-1.5 rounded-xl border-2 border-white text-white hover:bg-white hover:text-blue-600 transition-all font-medium"
              >
                Mi cuenta
              </Link>
              <button 
                onClick={logout} 
                className="px-3 py-1.5 rounded-xl bg-white text-blue-600 hover:bg-blue-50 transition-all font-medium"
              >
                Salir
              </button>
            </>
          ) : (
            <>
              <Link 
                href="/auth/login" 
                className="px-3 py-1.5 rounded-xl border-2 border-white text-white hover:bg-white hover:text-blue-600 transition-all font-medium"
              >
                Ingresar
              </Link>
              <Link 
                href="/auth/register" 
                className="px-3 py-1.5 rounded-xl bg-white text-blue-600 hover:bg-blue-50 transition-all font-medium"
              >
                Crear cuenta
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}