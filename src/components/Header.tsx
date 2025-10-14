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

  // Extraer el nombre de usuario del email (antes del @)
  const username = email ? email.split('@')[0] : ''

  return (
    <header className="border-b border-blue-200 bg-gradient-to-r from-blue-500 to-cyan-400 backdrop-blur sticky top-0 z-10 shadow-md">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-white text-base sm:text-lg hover:opacity-90 transition-opacity flex-shrink-0">
          Rifa Cooperadora
        </Link>

        <nav className="flex items-center gap-2 text-xs sm:text-sm flex-shrink-0">
          {email ? (
            <>
              <span className="hidden lg:inline text-white font-medium max-w-[150px] truncate">
                Hola, {username}
              </span>
              <Link 
                href="/app" 
                className="px-2 sm:px-3 py-1.5 rounded-xl border-2 border-white text-white hover:bg-white hover:text-blue-600 transition-all font-medium whitespace-nowrap"
              >
                Mi cuenta
              </Link>
              <button 
                onClick={logout} 
                className="px-2 sm:px-3 py-1.5 rounded-xl bg-white text-blue-600 hover:bg-blue-50 transition-all font-medium whitespace-nowrap"
              >
                Salir
              </button>
            </>
          ) : (
            <>
              <Link 
                href="/auth/login" 
                className="px-2 sm:px-3 py-1.5 rounded-xl border-2 border-white text-white hover:bg-white hover:text-blue-600 transition-all font-medium whitespace-nowrap"
              >
                Ingresar
              </Link>
              <Link 
                href="/auth/register" 
                className="px-2 sm:px-3 py-1.5 rounded-xl bg-white text-blue-600 hover:bg-blue-50 transition-all font-medium whitespace-nowrap"
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