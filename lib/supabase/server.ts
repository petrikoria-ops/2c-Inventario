// Cliente para usar en Server Components y API Routes (Node.js)
// Usa la sesión del usuario (cookies) para que las políticas RLS de
// Supabase puedan distinguir entre "authenticated" y "anon".
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function getSupabaseServer() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Los Server Components no pueden escribir cookies — el middleware
            // se encarga de refrescar la sesión en cada request.
          }
        },
      },
      global: {
        // Next.js parchea el fetch global y a veces cachea estas llamadas
        // (Data Cache) aunque la ruta sea force-dynamic. Lo forzamos explícito
        // para que cada query a Supabase sea siempre una lectura fresca.
        fetch: (url, options = {}) => fetch(url, { ...options, cache: 'no-store' }),
      },
    },
  )
}
