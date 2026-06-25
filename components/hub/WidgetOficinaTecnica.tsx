import Link from 'next/link'
import { ClipboardList, ShoppingCart } from 'lucide-react'
import { getSupabaseServer } from '@/lib/supabase/server'
import { BadgeEstadoProy } from '@/components/ui/Badge'

export default async function WidgetOficinaTecnica() {
  const sb = getSupabaseServer()

  const [{ data: proyectos }, { data: solicitudes }] = await Promise.all([
    sb.from('proyectos')
      .select('id,ot,nombre,cliente,estado,fecha_entrega')
      .in('estado', ['presupuesto', 'en_proceso'])
      .order('fecha_entrega')
      .limit(6),
    sb.from('solicitudes_compra')
      .select('id,numero,creado_en,solicitudes_compra_items(proveedor_sugerido)')
      .eq('estado', 'pendiente')
      .order('creado_en', { ascending: false })
      .limit(6),
  ])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="panel">
        <div className="panel-header">
          <ClipboardList size={14} style={{ color: '#909090', flexShrink: 0 }} />
          <h2>Obras activas — factibilidad</h2>
          <Link href="/proyectos" className="btn btn-ghost btn-sm">Ver todas →</Link>
        </div>
        {!proyectos?.length ? (
          <div className="p-6 text-center text-sm text-slate-400">No hay obras en presupuesto o en proceso.</div>
        ) : (
          <div className="divide-y" style={{ borderColor: '#ECEEF1' }}>
            {proyectos.map(p => (
              <div key={p.id} className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate"><span className="code mr-1">{p.ot}</span>{p.nombre}</div>
                  <div className="text-xs text-slate-400 truncate">{p.cliente ?? 'Sin cliente'}</div>
                </div>
                <BadgeEstadoProy estado={p.estado} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-header">
          <ShoppingCart size={14} style={{ color: '#909090', flexShrink: 0 }} />
          <h2>Solicitudes de compra pendientes</h2>
          <Link href="/solicitudes" className="btn btn-ghost btn-sm">Ver todas →</Link>
        </div>
        {!solicitudes?.length ? (
          <div className="p-6 text-center text-sm text-slate-400">No hay solicitudes pendientes.</div>
        ) : (
          <div className="divide-y" style={{ borderColor: '#ECEEF1' }}>
            {solicitudes.map(s => {
              const items = (s.solicitudes_compra_items as { proveedor_sugerido: string | null }[] | null) ?? []
              const proveedor = items.find(i => i.proveedor_sugerido)?.proveedor_sugerido
              return (
                <div key={s.id} className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate"><span className="code mr-1">{s.numero}</span></div>
                    <div className="text-xs text-slate-400 truncate">{proveedor ?? 'Sin proveedor sugerido'}</div>
                  </div>
                  <span className="badge badge-yellow flex-shrink-0">Pendiente</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
