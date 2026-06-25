import { createClient } from '@supabase/supabase-js'

// Cliente con la service_role key — se salta RLS por completo. SOLO se
// usa server-side, y SOLO para operaciones de administración de usuarios
// (invitar, listar) que la API de Supabase exige hacer con este rol.
// NUNCA importar este archivo desde un Client Component.
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY en las variables de entorno.')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}
