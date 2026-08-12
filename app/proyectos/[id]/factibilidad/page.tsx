import { redirect, notFound }    from 'next/navigation'
import { getSupabaseServer }    from '@/lib/supabase/server'
import FactibilidadProyecto      from '@/components/proyectos/FactibilidadProyecto'
import { getPerfil, puedeVer, puedeEditar } from '@/lib/auth/permisos.server'
export const dynamic = 'force-dynamic'

export default async function FactibilidadPage({ params }: { params: { id: string } }) {
  const perfil = await getPerfil()
  if (!perfil || !puedeVer(perfil, 'proyectos')) redirect('/')

  const sb = getSupabaseServer()

  const [{ data: proyecto }, { data: bom }] = await Promise.all([
    sb.from('proyectos').select('id,ot,nombre,cliente').eq('id', params.id).single(),
    sb.from('proyectos_materiales').select('*').eq('proyecto_id', params.id).order('id'),
  ])

  if (!proyecto) notFound()

  return (
    <FactibilidadProyecto
      proyecto={proyecto}
      initialBom={bom ?? []}
      editable={puedeEditar(perfil, 'proyectos')}
      editableCompras={puedeEditar(perfil, 'compras')}
    />
  )
}
