import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getPerfil } from '@/lib/auth/permisos.server'
import Itinerario from '@/components/tareas/Itinerario'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Itinerario — 2C Inventario' }
export const dynamic = 'force-dynamic'

export default async function ItinerarioPage() {
  const perfil = await getPerfil()
  if (!perfil) redirect('/login')

  const sb = getSupabaseServer()
  const [{ data: directorio }, { data: tareas }] = await Promise.all([
    sb.rpc('perfiles_directorio'),
    sb.from('tareas_asignadas')
      .select('*')
      .or(`asignado_a.eq.${perfil.id},asignado_por.eq.${perfil.id}`)
      .order('creado_en', { ascending: false }),
  ])

  return <Itinerario miId={perfil.id} directorio={directorio ?? []} tareasIniciales={tareas ?? []} />
}
