import { getSupabaseServer } from '@/lib/supabase/server'
import TablaSalidas from '@/components/salidas/TablaSalidas'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Salidas — 2C Inventario' }
export const dynamic = 'force-dynamic'

export default async function SalidasPage() {
  const sb = getSupabaseServer()
  const { data } = await sb
    .from('vales_despacho')
    .select('*, proyectos(ot,nombre), vales_despacho_items(id)')
    .order('fecha', { ascending: false })
    .limit(100)
  return <div className="p-5"><TablaSalidas initialData={data ?? []} /></div>
}
