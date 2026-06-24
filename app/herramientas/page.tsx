import { getSupabaseServer } from '@/lib/supabase/server'
import TablaHerramientas from '@/components/herramientas/TablaHerramientas'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Herramientas — 2C Inventario' }
export const dynamic = 'force-dynamic'

export default async function HerramientasPage() {
  const sb = getSupabaseServer()
  const { data } = await sb.from('herramientas').select('*').eq('activo', true).order('codigo')
  return <div className="p-5"><TablaHerramientas initialData={data ?? []} /></div>
}
