// Cliente para usar en Client Components (browser)
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Singleton para evitar múltiples instancias en el navegador
let client: ReturnType<typeof createClient> | null = null

export function getSupabaseBrowser() {
  if (!client) client = createClient(url, key)
  return client
}
