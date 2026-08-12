import { getSupabaseServer } from '@/lib/supabase/server'
import { getPerfil, puedeEditar } from '@/lib/auth/permisos.server'
import TablaVerificacionesRic from '@/components/verificacionRic/TablaVerificacionesRic'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Verificación RIC — 2C Inventario' }
export const dynamic = 'force-dynamic'

export default async function VerificacionRicPage() {
  const sb = getSupabaseServer()
  const [{ data }, perfil] = await Promise.all([
    sb.from('verificaciones_ric').select('*').order('fecha_visita', { ascending: false }),
    getPerfil(),
  ])
  const editable = !perfil || puedeEditar(perfil, 'verificacion_ric')

  return (
    <div className="p-5 w-full">
      <TablaVerificacionesRic initialData={data ?? []} editable={editable} />
    </div>
  )
}
