import Link from 'next/link'
import { Newspaper, ArrowRight, Lightbulb, CheckCircle2, AlertOctagon, AlertTriangle } from 'lucide-react'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getResumenEjecutivoDia } from '@/lib/resumenEjecutivo/getResumenDia'
import { logError } from '@/lib/errors/logError'
import { fechaHora, cn } from '@/lib/utils'
import type { Perfil } from '@/lib/auth/permisos'
import type { MaterialAlerta } from '@/lib/supabase/fetchAll'

/**
 * "Resumen ejecutivo del día" / "Pulso diario de la operación" — capa de
 * lectura sobre módulos ya existentes (movimientos, despachos, herramientas,
 * compras, avance de obra, verificaciones, tareas). No reemplaza ninguna
 * tabla: cada ítem enlaza al registro real. Maneja su propio error para no
 * tumbar el resto del cockpit si alguna consulta falla.
 */
export default async function ResumenEjecutivoDia({ perfil, acento, materiales }: { perfil: Perfil | null; acento: string; materiales: MaterialAlerta[] }) {
  let resumen
  try {
    const sb = getSupabaseServer()
    resumen = await getResumenEjecutivoDia(sb, perfil, materiales)
  } catch (err: any) {
    await logError({
      mensaje: `Resumen ejecutivo del día: ${err?.message ?? 'error desconocido'}`,
      stack: err?.stack ?? null,
      archivo: 'components/hub/ResumenEjecutivoDia.tsx',
      departamento: perfil?.departamento ?? null,
    })
    return (
      <div className="mb-9 anim-fade-up">
        <h2 className="seccion-label" style={{ '--seccion-acento': acento } as React.CSSProperties}>
          <span className="dot" /> Resumen ejecutivo del día
        </h2>
        <div className="alert alert-red">
          <AlertOctagon size={15} />
          No se pudo cargar el resumen ejecutivo del día. Intenta recargar la página.
        </div>
      </div>
    )
  }

  const { fecha, sintesis, indicadores, avances, alertas, recomendaciones } = resumen

  return (
    <div className="mb-9 anim-fade-up">
      <h2 className="seccion-label" style={{ '--seccion-acento': acento } as React.CSSProperties}>
        <span className="dot" /> Resumen ejecutivo del día
      </h2>

      {/* Síntesis ejecutiva */}
      <div className="panel mb-4">
        <div className="panel-header">
          <Newspaper size={14} style={{ color: 'var(--n-500)', flexShrink: 0 }} />
          <h2>Pulso diario de la operación</h2>
          <span className="text-xs text-brand-n500 capitalize whitespace-nowrap">{fecha}</span>
        </div>
        <div className="p-4 space-y-1.5">
          {sintesis.map((linea, i) => (
            <p key={i} className="text-[13px] text-slate-700 leading-relaxed">{linea}</p>
          ))}
        </div>
      </div>

      {/* Indicadores del día */}
      {indicadores.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
          {indicadores.map(ind => (
            <div key={ind.key} className="stat-card">
              <div className="stat-icon flex items-center justify-center bg-slate-100">
                <ind.Icon size={17} style={{ color: '#475569' }} />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-800 leading-tight">{ind.value}</div>
                <div className="text-xs text-brand-n500 font-medium leading-tight">{ind.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Avances — hechos confirmados de hoy */}
        <div className="panel">
          <div className="panel-header">
            <CheckCircle2 size={14} style={{ color: '#059669', flexShrink: 0 }} />
            <h2>Avances de hoy</h2>
          </div>
          {avances.length === 0 ? (
            <div className="p-6 text-center text-sm text-brand-n500">No se registraron movimientos relevantes durante esta jornada.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {avances.map(item => (
                <li key={item.id}>
                  <Link href={item.href} className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-slate-50 transition-colors group">
                    <item.Icon size={15} className="mt-0.5 flex-shrink-0" style={{ color: '#059669' }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] text-slate-700 leading-snug">{item.texto}</div>
                      <div className="text-[11px] text-brand-n500">{fechaHora(item.hora)}</div>
                    </div>
                    <ArrowRight size={13} className="text-slate-300 flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Alertas y atención requerida — estado actual, no solo de hoy */}
        <div className="panel">
          <div className="panel-header">
            <AlertTriangle size={14} style={{ color: '#D97706', flexShrink: 0 }} />
            <h2>Alertas y atención requerida</h2>
          </div>
          {alertas.length === 0 ? (
            <div className="p-6 text-center text-sm text-brand-n500">Sin alertas ni pendientes detectados.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {alertas.map(item => (
                <li key={item.id}>
                  <Link href={item.href} className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-50 transition-colors group">
                    <item.Icon size={15} className="flex-shrink-0" style={{ color: item.nivel === 'critico' ? '#DC2626' : '#D97706' }} />
                    <span className={cn('badge flex-shrink-0', item.nivel === 'critico' ? 'badge-red' : 'badge-yellow')}>
                      {item.nivel === 'critico' ? 'Crítico' : 'Atención'}
                    </span>
                    <div className="min-w-0 flex-1 text-[13px] text-slate-700 leading-snug">{item.texto}</div>
                    <ArrowRight size={13} className="text-slate-300 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Próximas acciones recomendadas — sugerencias, no hechos */}
      {recomendaciones.length > 0 && (
        <div className="alert alert-blue mt-4 flex-col items-start gap-2">
          <div className="flex items-center gap-2 font-semibold">
            <Lightbulb size={15} />
            Próximas acciones recomendadas
          </div>
          <ul className="pl-1 space-y-1">
            {recomendaciones.map(r => (
              <li key={r.id} className="text-[13px] flex gap-1.5">
                <span aria-hidden="true">·</span>
                <span>{r.texto}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
