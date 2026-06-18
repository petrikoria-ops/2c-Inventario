import { getSupabaseServer } from '@/lib/supabase/server'
import TablaSolicitudes from '@/components/solicitudes/TablaSolicitudes'
import Link from 'next/link'
import type { SolicitudCompra } from '@/types'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Solicitudes de compra — 2C Inventario' }

export default async function SolicitudesPage() {
  const sb = getSupabaseServer()
  const { data } = await sb
    .from('solicitudes_compra')
    .select('*, solicitudes_compra_items(id)')
    .order('creado_en', { ascending: false })

  const solicitudes = (data ?? []).map(s => ({
    ...s,
    items_count: (s.solicitudes_compra_items as any[])?.length ?? 0,
    solicitudes_compra_items: undefined,
  })) as (SolicitudCompra & { items_count: number })[]

  const pendientes = solicitudes.filter(s => s.estado === 'pendiente').length
  const compradas  = solicitudes.filter(s => s.estado === 'comprado').length

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Solicitudes de compra</h1>
          <p className="text-sm text-slate-500">
            {pendientes > 0 && <span className="text-yellow-600 font-medium">{pendientes} pendiente{pendientes !== 1 ? 's' : ''}</span>}
            {pendientes > 0 && compradas > 0 && ' · '}
            {compradas > 0 && <span className="text-green-600">{compradas} comprada{compradas !== 1 ? 's' : ''}</span>}
            {solicitudes.length === 0 && 'Sin solicitudes aún'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/solicitudes/importar" className="btn btn-outline">Importar Excel</Link>
          <Link href="/solicitudes/nueva" className="btn btn-primary">+ Nueva solicitud</Link>
        </div>
      </div>

      <TablaSolicitudes initialData={solicitudes} />
    </div>
  )
}
