import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getPerfil, puedeEditar } from '@/lib/auth/permisos.server'
import NuevaInspeccionPrevencion from '@/components/prevencion/NuevaInspeccionPrevencion'

export const metadata = { title: 'Nueva inspección — 2C Inventario' }
export const dynamic = 'force-dynamic'

export default async function NuevaInspeccionPrevencionPage() {
  const perfil = await getPerfil()
  if (perfil && !puedeEditar(perfil, 'prevencion_riesgos')) redirect('/prevencion-riesgos')

  const sb = getSupabaseServer()
  const { data: proyectos } = await sb
    .from('proyectos')
    .select('id,ot,nombre,cliente')
    .in('estado', ['en_proceso', 'presupuesto'])
    .order('ot')

  return <NuevaInspeccionPrevencion proyectos={proyectos ?? []} prevencionistaInicial={perfil?.nombre_completo ?? ''} />
}
