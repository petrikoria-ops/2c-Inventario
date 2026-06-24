// Cliente para usar en Client Components (browser).
// createBrowserClient (en vez de createClient) guarda la sesión en cookies
// en lugar de localStorage, para que el servidor (middleware, Server
// Components) pueda leer la misma sesión y las políticas RLS funcionen.
import { createBrowserClient } from '@supabase/ssr'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Singleton para evitar múltiples instancias en el navegador
let client: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseBrowser() {
  if (!client) client = createBrowserClient(url, key)
  return client
}
