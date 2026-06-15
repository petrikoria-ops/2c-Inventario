import { getSupabaseServer } from '@/lib/supabase/server'
import TablaProyectos from '@/components/proyectos/TablaProyectos'
export const dynamic = 'force-dynamic'

export default async function ProyectosPage() {
  const sb = getSupabaseServer()
  const { data } = await sb
    .from('proyectos')
    .select('*')
    .order('creado_en', { ascending: false })
  return <div className="p-5"><TablaProyectos initialData={data ?? []} /></div>
}
