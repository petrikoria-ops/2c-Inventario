import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getPerfil, puedeVer } from '@/lib/auth/permisos.server'
import TablaAvanceObra from '@/components/proyectos/TablaAvanceObra'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Avance de obra — 2C Inventario' }
export const dynamic = 'force-dynamic'

export default async function AvanceObraPage() {
  const sb = getSupabaseServer()

  // El perfil no decide QUÉ se consulta acá, solo si se puede ver: entra al
  // mismo Promise.all en vez de encadenar sus viajes a Supabase por delante
  // de los datos. El permiso se comprueba igual antes de renderizar.
  const [perfil, { data: proyectos }, { data: avances }] = await Promise.all([
    getPerfil(),
    sb.from('proyectos').select('id,ot,nombre,cliente,estado').in('estado', ['en_proceso', 'presupuesto']).order('ot'),
    sb.from('avances_obra').select('proyecto_id,avances_obra_items(completado)'),
  ])

  if (perfil && !puedeVer(perfil, 'avance_obra')) redirect('/')

  const avancePorProyecto = new Map((avances ?? []).map(a => [a.proyecto_id, a.avances_obra_items ?? []]))

  return (
    <div className="p-5 w-full">
      <TablaAvanceObra proyectos={proyectos ?? []} avancePorProyecto={Object.fromEntries(avancePorProyecto)} />
    </div>
  )
}
