import { getSupabaseServer } from '@/lib/supabase/server'
import TablaProveedores from '@/components/proveedores/TablaProveedores'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Proveedores — 2C Inventario' }
export const dynamic = 'force-dynamic'

export default async function ProveedoresPage() {
  const sb = getSupabaseServer()
  const { data } = await sb.from('proveedores').select('*').eq('activo', true).order('nombre')
  return <div className="p-5"><TablaProveedores initialData={data ?? []} /></div>
}
