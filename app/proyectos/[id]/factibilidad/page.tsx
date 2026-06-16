import { getSupabaseServer }    from '@/lib/supabase/server'
import { notFound }              from 'next/navigation'
import FactibilidadProyecto      from '@/components/proyectos/FactibilidadProyecto'
export const dynamic = 'force-dynamic'

export default async function FactibilidadPage({ params }: { params: { id: string } }) {
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
    />
  )
}
