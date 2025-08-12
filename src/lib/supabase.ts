// src/lib/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Cliente para el navegador (usa las públicas)
 */
export function supabaseBrowser(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  return createClient(url, anon)
}

/**
 * Cliente admin (server-side) con Service Role
 */
export function supabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !service) {
    throw new Error('Faltan SUPABASE_SERVICE_ROLE_KEY y/o URL')
  }
  return createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}
