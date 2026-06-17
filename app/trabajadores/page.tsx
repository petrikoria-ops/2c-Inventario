import { getSupabaseServer } from '@/lib/supabase/server'
import TablaTrabjadores from '@/components/trabajadores/TablaTrabjadores'

export const dynamic  = 'force-dynamic'
export const metadata = { title: 'Trabajadores | 2C Inventario' }

export default async function TrabajadoresPage() {
  const sb = getSupabaseServer()
  const { data } = await sb.from('trabajadores').select('*').eq('activo', true).order('nombre')
  return (
    <div className="p-5 max-w-4xl">
      <div className="mb-5">
        <h1 className="text-xl font-bold" style={{ color: '#2E333A' }}>Trabajadores</h1>
        <p className="text-sm text-slate-500">Registro de personal para asignación de herramientas</p>
      </div>
      <TablaTrabjadores initialData={data ?? []} />
    </div>
  )
}
