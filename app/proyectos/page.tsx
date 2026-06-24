import { getSupabaseServer } from '@/lib/supabase/server'
import TablaProyectos from '@/components/proyectos/TablaProyectos'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Obras activas — 2C Inventario' }
export const dynamic = 'force-dynamic'

export default async function ProyectosPage() {
  const sb = getSupabaseServer()
  const { data } = await sb
    .from('proyectos')
    .select('*')
    .order('creado_en', { ascending: false })
  return <div className="p-5"><TablaProyectos initialData={data ?? []} /></div>
}
