// Cliente para usar en Server Components y API Routes (Node.js)
import { createClient } from '@supabase/supabase-js'

export function getSupabaseServer() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        // Next.js parchea el fetch global y a veces cachea estas llamadas
        // (Data Cache) aunque la ruta sea force-dynamic. Lo forzamos explícito
        // para que cada query a Supabase sea siempre una lectura fresca.
        fetch: (url, options = {}) => fetch(url, { ...options, cache: 'no-store' }),
      },
    },
  )
}
