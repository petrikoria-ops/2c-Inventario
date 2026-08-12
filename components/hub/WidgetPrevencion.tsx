import Link from 'next/link'
import { ShieldAlert, Plus } from 'lucide-react'
import { getSupabaseServer } from '@/lib/supabase/server'
import { BadgeEstadoHer } from '@/components/ui/Badge'
import BadgeNivel from '@/components/prevencion/BadgeNivel'
import type { NivelRiesgo } from '@/lib/prevencion/clasificacionRiesgo'

export default async function WidgetPrevencion() {
  const sb = getSupabaseServer()

  const [{ data: herramientas }, { data: inspecciones }, { data: hallazgosAbiertos }] = await Promise.all([
    sb.from('herramientas').select('id,codigo,descripcion,estado')
      .in('estado', ['en_reparacion', 'extraviada']).eq('activo', true).limit(8),
    sb.from('inspecciones_prevencion').select('id,numero,centro_trabajo,fecha,estado')
      .order('fecha', { ascending: false }).limit(3),
    sb.from('inspecciones_prevencion_items').select('nivel').eq('resultado', 'no_cumple'),
  ])

  const enProgreso = inspecciones?.filter(i => i.estado === 'en_progreso').length ?? 0
  const conteoPorNivel = (['CRITICO', 'ALTO', 'MEDIO', 'BAJO'] as NivelRiesgo[]).map(nivel => ({
    nivel, count: hallazgosAbiertos?.filter(h => h.nivel === nivel).length ?? 0,
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="panel">
        <div className="panel-header">
          <ShieldAlert size={14} style={{ color: 'var(--n-500)', flexShrink: 0 }} />
          <h2>Herramientas con problema</h2>
          <Link href="/herramientas" className="btn btn-ghost btn-sm">Ver todas →</Link>
        </div>
        {!herramientas?.length ? (
          <div className="p-6 text-center text-sm text-brand-n500">No hay herramientas en reparación ni extraviadas.</div>
        ) : (
          <div className="divide-y" style={{ borderColor: '#ECEEF1' }}>
            {herramientas.map(h => (
              <div key={h.id} className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate"><span className="code mr-1">{h.codigo}</span>{h.descripcion}</div>
                </div>
                <BadgeEstadoHer estado={h.estado} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-header">
          <ShieldAlert size={14} style={{ color: 'var(--n-500)', flexShrink: 0 }} />
          <h2>Inspecciones de faena</h2>
          <Link href="/prevencion-riesgos/nueva" className="btn btn-primary btn-sm">
            <Plus size={13} /> Nueva
          </Link>
        </div>

        <div className="p-3 flex flex-wrap gap-2 border-b" style={{ borderColor: '#ECEEF1' }}>
          <span className="badge badge-yellow text-[11px]">{enProgreso} en progreso</span>
          {conteoPorNivel.filter(c => c.count > 0).map(c => (
            <span key={c.nivel} className="inline-flex items-center gap-1">
              <BadgeNivel nivel={c.nivel} /> <span className="text-xs text-brand-n500">×{c.count}</span>
            </span>
          ))}
          {!hallazgosAbiertos?.length && <span className="text-xs text-brand-n500">Sin hallazgos abiertos</span>}
        </div>

        {!inspecciones?.length ? (
          <div className="p-6 text-center text-sm text-brand-n500">
            Aún no hay inspecciones registradas.
            <Link href="/prevencion-riesgos/nueva" className="block mt-2 text-brand-n500 hover:underline">Crear la primera →</Link>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: '#ECEEF1' }}>
            {inspecciones.map(i => (
              <Link key={i.id} href={`/prevencion-riesgos/${i.id}`} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate"><span className="code mr-1">{i.numero}</span>{i.centro_trabajo}</div>
                  <div className="text-xs text-brand-n500">{new Date(i.fecha).toLocaleDateString('es-CL')}</div>
                </div>
                <span className={`badge ${i.estado === 'completa' ? 'badge-green' : 'badge-yellow'}`}>
                  {i.estado === 'completa' ? 'Completa' : 'En progreso'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
