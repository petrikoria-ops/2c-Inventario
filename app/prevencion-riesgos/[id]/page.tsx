import { notFound, redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getPerfil, puedeVer, puedeEditar } from '@/lib/auth/permisos.server'
import FormularioInspeccionPrevencion from '@/components/prevencion/FormularioInspeccionPrevencion'

export const dynamic = 'force-dynamic'

export default async function InspeccionPrevencionDetallePage({ params }: { params: { id: string } }) {
  const sb = getSupabaseServer()

  const [{ data: inspeccion }, { data: items }, perfil] = await Promise.all([
    sb.from('inspecciones_prevencion').select('*').eq('id', params.id).single(),
    sb.from('inspecciones_prevencion_items').select('*').eq('inspeccion_id', params.id).order('orden'),
    getPerfil(),
  ])

  if (perfil && !puedeVer(perfil, 'prevencion_riesgos')) redirect('/')
  if (!inspeccion) notFound()

  const editable = !perfil || puedeEditar(perfil, 'prevencion_riesgos')

  return (
    <FormularioInspeccionPrevencion
      inspeccion={inspeccion}
      initialItems={items ?? []}
      editable={editable}
    />
  )
}
