import { getSupabaseServer } from '@/lib/supabase/server'
import GeneradorEtiquetas from '@/components/etiquetas/GeneradorEtiquetas'

export const metadata = { title: 'Etiquetas de obra — 2C Inventario' }
export const dynamic  = 'force-dynamic'

export default async function EtiquetasPage() {
  const sb = getSupabaseServer()
  const { data: proyectos } = await sb
    .from('proyectos')
    .select('id, ot, nombre, cliente')
    .in('estado', ['en_proceso', 'presupuesto'])
    .order('ot', { ascending: false })

  return <GeneradorEtiquetas proyectos={proyectos ?? []} />
}
