'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, Clock, Plus, ArrowRight, Trash2 } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { usePresence } from '@/contexts/PresenceContext'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { NOMBRE_MODULO } from '@/lib/auth/permisos'
import NuevaTareaModal from './NuevaTareaModal'
import type { TareaAsignada, PerfilDirectorio, ModuloTarea } from '@/types'

interface Props {
  miId: string
  directorio: PerfilDirectorio[]
  tareasIniciales: TareaAsignada[]
}

// "Ir a [módulo]" es solo un atajo de navegación — nunca crea ni vincula el
// registro real de la inspección, eso lo hace la persona a mano con el
// formulario normal (ver plan de la Fase 3).
const RUTA_NUEVA: Partial<Record<ModuloTarea, string>> = {
  pruebas_alimentadores: '/pruebas-alimentadores/nueva',
  verificacion_ric: '/verificacion-ric/nueva',
  prevencion_riesgos: '/prevencion-riesgos/nueva',
}

function atajoHref(t: TareaAsignada): string | null {
  if (!t.modulo) return null
  if (t.modulo === 'avance_obra') return t.proyecto_id ? `/proyectos/${t.proyecto_id}` : null
  const base = RUTA_NUEVA[t.modulo]
  if (!base) return null
  return t.proyecto_id ? `${base}?proyecto=${t.proyecto_id}` : base
}

export default function Itinerario({ miId, directorio, tareasIniciales }: Props) {
  const [tareas, setTareas] = useState(tareasIniciales)
  const [modalAbierto, setModalAbierto] = useState(false)
  const { marcarTareaRespondidaLocal, puedeAsignarTareas } = usePresence()
  const { showToast } = useToast()
  const router = useRouter()

  useEffect(() => { setTareas(tareasIniciales) }, [tareasIniciales])

  const nombreDe = useMemo(() => {
    const mapa = new Map(directorio.map(p => [p.id, p.nombre_completo]))
    return (id: string) => mapa.get(id) ?? '—'
  }, [directorio])

  // Cualquier cambio (nueva tarea, aceptada/rechazada por el otro lado)
  // refresca el Server Component — mismo patrón que el resto del proyecto
  // (ej. FormularioPruebaAlimentadores), más simple que reconciliar a mano
  // el payload parcial de Realtime contra 3 listas distintas.
  useEffect(() => {
    const sb = getSupabaseBrowser()
    const channel = sb
      .channel(`tareas-${miId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tareas_asignadas', filter: `asignado_a=eq.${miId}` }, () => router.refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tareas_asignadas', filter: `asignado_por=eq.${miId}` }, () => router.refresh())
      .subscribe()
    return () => { sb.removeChannel(channel) }
  }, [miId, router])

  const pendientes = tareas.filter(t => t.asignado_a === miId && t.estado === 'pendiente')
  const miItinerario = tareas
    .filter(t => t.asignado_a === miId && t.estado === 'aceptada')
    .sort((a, b) => (a.fecha_limite ?? '9999').localeCompare(b.fecha_limite ?? '9999'))
  const asignadas = tareas.filter(t => t.asignado_por === miId)

  const responder = async (id: number, estado: 'aceptada' | 'rechazada' | 'completada') => {
    const res = await fetch(`/api/tareas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    })
    if (!res.ok) { showToast((await res.json()).error ?? 'No se pudo actualizar', 'error'); return }
    if (estado === 'aceptada' || estado === 'rechazada') marcarTareaRespondidaLocal(1)
    setTareas(prev => prev.map(t => t.id === id ? { ...t, estado } : t))
    router.refresh()
  }

  const cancelar = async (id: number, titulo: string) => {
    if (!confirm(`¿Cancelar la tarea "${titulo}"?`)) return
    const res = await fetch(`/api/tareas/${id}`, { method: 'DELETE' })
    if (!res.ok) { showToast((await res.json()).error ?? 'No se pudo cancelar', 'error'); return }
    setTareas(prev => prev.filter(t => t.id !== id))
  }

  const badgeClase: Record<string, string> = {
    pendiente: 'badge-yellow', aceptada: 'badge-green', completada: 'badge-green', rechazada: 'badge-red',
  }

  return (
    <div className="p-5 w-full max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Itinerario</h1>
          <p className="text-sm text-brand-n500">Tareas asignadas — acepta, rechaza o marca completadas las tuyas.</p>
        </div>
        {puedeAsignarTareas && (
          <button className="btn btn-primary btn-sm ml-auto" onClick={() => setModalAbierto(true)}>
            <Plus size={13} /> Nueva tarea
          </button>
        )}
      </div>

      {pendientes.length > 0 && (
        <div className="panel mb-6">
          <div className="panel-header">
            <Clock size={14} style={{ color: '#D97706' }} />
            <h2>Pendientes de aceptar</h2>
            <span className="ml-2 badge badge-yellow">{pendientes.length}</span>
          </div>
          <div className="divide-y" style={{ borderColor: '#EDEFF2' }}>
            {pendientes.map(t => (
              <div key={t.id} className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-800">{t.titulo}</div>
                    <div className="text-xs text-brand-n500 mt-0.5">
                      Asignada por {nombreDe(t.asignado_por)}
                      {t.proyecto_nombre ? ` · ${t.proyecto_nombre}` : ''}
                      {t.fecha_limite ? ` · vence ${t.fecha_limite}` : ''}
                    </div>
                    {t.descripcion && <p className="text-xs text-slate-600 mt-1.5">{t.descripcion}</p>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button className="btn btn-success btn-sm" onClick={() => responder(t.id, 'aceptada')}>
                      <CheckCircle2 size={13} /> Aceptar
                    </button>
                    <button className="btn btn-sm" style={{ color: '#DC2626' }} onClick={() => responder(t.id, 'rechazada')}>
                      <XCircle size={13} /> Rechazar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="panel mb-6">
        <div className="panel-header"><h2>Mi itinerario</h2></div>
        {miItinerario.length === 0 ? (
          <p className="p-6 text-center text-sm text-brand-n500">No tienes tareas aceptadas pendientes.</p>
        ) : (
          <div className="divide-y" style={{ borderColor: '#EDEFF2' }}>
            {miItinerario.map(t => {
              const href = atajoHref(t)
              return (
                <div key={t.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-800">{t.titulo}</div>
                      <div className="text-xs text-brand-n500 mt-0.5">
                        {nombreDe(t.asignado_por)}
                        {t.proyecto_nombre ? ` · ${t.proyecto_nombre}` : ''}
                        {t.fecha_limite ? ` · vence ${t.fecha_limite}` : ''}
                      </div>
                      {t.descripcion && <p className="text-xs text-slate-600 mt-1.5">{t.descripcion}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {href && (
                        <a href={href} className="btn btn-outline btn-sm">
                          Ir a {t.modulo ? NOMBRE_MODULO[t.modulo] : ''} <ArrowRight size={13} />
                        </a>
                      )}
                      <button className="btn btn-sm" onClick={() => responder(t.id, 'completada')}>
                        <CheckCircle2 size={13} /> Marcar completada
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {puedeAsignarTareas && (
        <div className="panel">
          <div className="panel-header"><h2>Tareas que asigné</h2></div>
          {asignadas.length === 0 ? (
            <p className="p-6 text-center text-sm text-brand-n500">Todavía no has asignado ninguna tarea.</p>
          ) : (
            <div className="divide-y" style={{ borderColor: '#EDEFF2' }}>
              {asignadas.map(t => (
                <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-800">{t.titulo}</div>
                    <div className="text-xs text-brand-n500">
                      {nombreDe(t.asignado_a)}{t.proyecto_nombre ? ` · ${t.proyecto_nombre}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`badge ${badgeClase[t.estado]}`}>{t.estado}</span>
                    {t.estado === 'pendiente' && (
                      <button className="btn-icon" title="Cancelar" aria-label={`Cancelar tarea ${t.titulo}`}
                        onClick={() => cancelar(t.id, t.titulo)}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <NuevaTareaModal
        abierto={modalAbierto}
        onClose={() => setModalAbierto(false)}
        directorio={directorio}
        onCreada={() => router.refresh()}
      />
    </div>
  )
}
