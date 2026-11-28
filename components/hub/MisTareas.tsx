import Link from 'next/link'
import { Clock, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react'
import { getSupabaseServer } from '@/lib/supabase/server'
import { logError } from '@/lib/errors/logError'
import type { TareaAsignada } from '@/types'

// Bloque "Mis tareas y vencimientos" del inicio — vista de solo lectura de las
// tareas que requieren acción del usuario REAL (no del departamento que un
// admin esté simulando con "Ver como"): las pendientes de aceptar y las
// aceptadas ordenadas por vencimiento. Aceptar/rechazar/completar sigue en
// /itinerario. Maneja su propio error para no tumbar el inicio si la consulta
// falla, y no renderiza nada si no hay tareas por atender.
export default async function MisTareas({ perfilId }: { perfilId: string | undefined }) {
  if (!perfilId) return null

  let tareas: TareaAsignada[] = []
  try {
    const sb = getSupabaseServer()
    const { data, error } = await sb
      .from('tareas_asignadas')
      .select('*')
      .eq('asignado_a', perfilId)
      .in('estado', ['pendiente', 'aceptada'])
      .order('fecha_limite', { ascending: true, nullsFirst: false })
    if (error) throw error
    tareas = (data ?? []) as TareaAsignada[]
  } catch (err: any) {
    await logError({
      mensaje: `Mis tareas (inicio): ${err?.message ?? 'error desconocido'}`,
      stack: err?.stack ?? null,
      archivo: 'components/hub/MisTareas.tsx',
      departamento: null,
    })
    return null
  }

  const pendientes = tareas.filter(t => t.estado === 'pendiente')
  const activas = tareas.filter(t => t.estado === 'aceptada')
  if (pendientes.length === 0 && activas.length === 0) return null

  const hoy = new Date().toISOString().slice(0, 10)
  const sub = (t: TareaAsignada) =>
    `${t.proyecto_nombre ? `${t.proyecto_nombre} · ` : ''}${t.fecha_limite ? `vence ${t.fecha_limite}` : 'sin fecha límite'}`

  return (
    <div className="mb-9 anim-fade-up">
      <h2 className="seccion-label" style={{ '--seccion-acento': '#D97706' } as React.CSSProperties}>
        <span className="dot" /> Mis tareas y vencimientos
      </h2>

      <div className="panel">
        <ul className="divide-y divide-slate-100">
          {pendientes.slice(0, 4).map(t => (
            <li key={t.id}>
              <Link href="/itinerario" className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-50 transition-colors group">
                <Clock size={15} className="flex-shrink-0" style={{ color: '#D97706' }} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-slate-800 leading-snug truncate">{t.titulo}</div>
                  <div className="text-[11px] text-brand-n500 truncate">{sub(t)}</div>
                </div>
                <span className="badge badge-yellow flex-shrink-0">Por aceptar</span>
                <ArrowRight size={13} className="text-slate-300 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </li>
          ))}
          {activas.slice(0, 5).map(t => {
            const vencida = !!t.fecha_limite && t.fecha_limite < hoy
            return (
              <li key={t.id}>
                <Link href="/itinerario" className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-50 transition-colors group">
                  {vencida
                    ? <AlertTriangle size={15} className="flex-shrink-0" style={{ color: '#DC2626' }} />
                    : <CheckCircle2 size={15} className="flex-shrink-0" style={{ color: '#059669' }} />}
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-slate-700 leading-snug truncate">{t.titulo}</div>
                    <div className="text-[11px] text-brand-n500 truncate">{sub(t)}</div>
                  </div>
                  {vencida && <span className="badge badge-red flex-shrink-0">Vencida</span>}
                  <ArrowRight size={13} className="text-slate-300 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
            )
          })}
        </ul>
        <Link href="/itinerario" className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-[12px] font-semibold text-brand-n500 hover:text-slate-800 border-t transition-colors" style={{ borderColor: '#EDEFF2' }}>
          Ver todo mi itinerario <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  )
}
