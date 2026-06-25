import Link from 'next/link'
import { Wrench, ClipboardList } from 'lucide-react'
import { getSupabaseServer } from '@/lib/supabase/server'
import { diasHastaMant } from '@/lib/utils'

export default async function WidgetTaller() {
  const sb = getSupabaseServer()

  const [{ data: herramientas }, { data: proyectos }] = await Promise.all([
    sb.from('herramientas')
      .select('id,codigo,descripcion,estado,responsable,fecha_ultima_mant,frecuencia_mant_dias')
      .eq('activo', true).eq('estado', 'operativa'),
    sb.from('proyectos').select('id,ot,nombre,fecha_entrega').eq('estado', 'en_proceso').order('fecha_entrega').limit(5),
  ])

  const conMantencion = (herramientas ?? [])
    .map(h => ({ ...h, dias: diasHastaMant(h.fecha_ultima_mant, h.frecuencia_mant_dias) }))
    .filter(h => h.dias !== null)
    .sort((a, b) => (a.dias ?? 0) - (b.dias ?? 0))
    .slice(0, 6)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="panel">
        <div className="panel-header">
          <Wrench size={14} style={{ color: '#909090', flexShrink: 0 }} />
          <h2>Próximas mantenciones de herramientas</h2>
          <Link href="/herramientas" className="btn btn-ghost btn-sm">Ver todas →</Link>
        </div>
        {conMantencion.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-400">No hay mantenciones programadas todavía.</div>
        ) : (
          <div className="divide-y" style={{ borderColor: '#ECEEF1' }}>
            {conMantencion.map(h => (
              <div key={h.id} className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate"><span className="code mr-1">{h.codigo}</span>{h.descripcion}</div>
                  <div className="text-xs text-slate-400">{h.responsable ?? 'Sin responsable asignado'}</div>
                </div>
                <span className={`badge flex-shrink-0 ${(h.dias ?? 0) < 0 ? 'badge-red' : (h.dias ?? 0) <= 7 ? 'badge-yellow' : 'badge-green'}`}>
                  {(h.dias ?? 0) < 0 ? `Vencida hace ${Math.abs(h.dias ?? 0)}d` : `En ${h.dias}d`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-header">
          <ClipboardList size={14} style={{ color: '#909090', flexShrink: 0 }} />
          <h2>Obras activas — próximas entregas</h2>
          <Link href="/proyectos" className="btn btn-ghost btn-sm">Ver todas →</Link>
        </div>
        {!proyectos?.length ? (
          <div className="p-6 text-center text-sm text-slate-400">No hay obras en proceso.</div>
        ) : (
          <div className="divide-y" style={{ borderColor: '#ECEEF1' }}>
            {proyectos.map(p => (
              <div key={p.id} className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate"><span className="code mr-1">{p.ot}</span>{p.nombre}</div>
                </div>
                <span className="text-xs text-slate-500 flex-shrink-0">{p.fecha_entrega ?? 'Sin fecha'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
