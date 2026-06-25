import Link from 'next/link'
import { Users, UserCheck, Wrench } from 'lucide-react'
import { getSupabaseServer } from '@/lib/supabase/server'
import { diasHastaMant, num } from '@/lib/utils'

export default async function WidgetRRHH() {
  const sb = getSupabaseServer()

  const [{ data: trabajadores }, { data: herramientas }] = await Promise.all([
    sb.from('trabajadores').select('id,nombre').eq('activo', true),
    sb.from('herramientas')
      .select('id,codigo,descripcion,responsable,fecha_ultima_mant,frecuencia_mant_dias')
      .eq('activo', true)
      .not('responsable', 'is', null),
  ])

  const nombresTrabajadores = new Set((trabajadores ?? []).map(t => t.nombre.trim().toLowerCase()))
  const conHerramientas = new Set(
    (herramientas ?? [])
      .map(h => h.responsable?.trim().toLowerCase())
      .filter((nombre): nombre is string => !!nombre && nombresTrabajadores.has(nombre))
  )

  const conMantencion = (herramientas ?? [])
    .map(h => ({ ...h, dias: diasHastaMant(h.fecha_ultima_mant, h.frecuencia_mant_dias) }))
    .filter(h => h.dias !== null)
    .sort((a, b) => (a.dias ?? 0) - (b.dias ?? 0))
    .slice(0, 6)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="panel">
        <div className="panel-header">
          <Users size={14} style={{ color: '#909090', flexShrink: 0 }} />
          <h2>Trabajadores</h2>
          <Link href="/trabajadores" className="btn btn-ghost btn-sm">Ver todos →</Link>
        </div>
        <div className="p-4 grid grid-cols-2 gap-3">
          <div className="stat-card">
            <div className="stat-icon flex items-center justify-center bg-blue-100">
              <Users size={18} style={{ color: '#1D4ED8' }} />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-800 leading-tight">{num(nombresTrabajadores.size, 0)}</div>
              <div className="text-xs text-slate-500 font-medium">Trabajadores activos</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon flex items-center justify-center bg-green-100">
              <UserCheck size={18} style={{ color: '#059669' }} />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-800 leading-tight">{num(conHerramientas.size, 0)}</div>
              <div className="text-xs text-slate-500 font-medium">Con herramientas asignadas</div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <Wrench size={14} style={{ color: '#909090', flexShrink: 0 }} />
          <h2>Próximas mantenciones de equipos asignados</h2>
        </div>
        {conMantencion.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-400">No hay equipos asignados con mantención programada.</div>
        ) : (
          <div className="divide-y" style={{ borderColor: '#ECEEF1' }}>
            {conMantencion.map(h => (
              <div key={h.id} className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate"><span className="code mr-1">{h.codigo}</span>{h.descripcion}</div>
                  <div className="text-xs text-slate-400 truncate">{h.responsable}</div>
                </div>
                <span className={`badge flex-shrink-0 ${(h.dias ?? 0) < 0 ? 'badge-red' : (h.dias ?? 0) <= 7 ? 'badge-yellow' : 'badge-green'}`}>
                  {(h.dias ?? 0) < 0 ? `Vencida hace ${Math.abs(h.dias ?? 0)}d` : `En ${h.dias}d`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
