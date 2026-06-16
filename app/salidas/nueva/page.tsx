import { getSupabaseServer } from '@/lib/supabase/server'
import NuevaSalida from '@/components/salidas/NuevaSalida'

export default async function NuevaSalidaPage() {
  const sb = getSupabaseServer()
  const { data: proyectos } = await sb
    .from('proyectos')
    .select('id,ot,nombre')
    .in('estado', ['en_proceso', 'presupuesto'])
    .order('creado_en', { ascending: false })
  return <NuevaSalida proyectos={proyectos ?? []} />
}
