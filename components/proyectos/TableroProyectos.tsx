'use client'
import { useMemo } from 'react'
import Link from 'next/link'
import { CalendarClock } from 'lucide-react'
import { fechaCorta } from '@/lib/utils'
import {
  ESTADOS_PROY, ESTADO_PROY, diasParaEntrega, entregaCerrada, type EstadoProy,
} from '@/lib/proyectos/estados'
import type { Proyecto } from '@/types'

// Vista Tablero (kanban) de las obras, agrupadas por estado. Una columna por
// estado, en orden de flujo. Cada tarjeta enlaza al hub de la obra; si el perfil
// puede editar, un selector mueve la obra de estado (táctil, mejor que drag en
// terreno/móvil). No duplica crear/editar/eliminar: eso vive en la vista Tabla.
export default function TableroProyectos({
  items, editable, onCambiarEstado,
}: {
  items: Proyecto[]
  editable: boolean
  onCambiarEstado: (p: Proyecto, nuevo: EstadoProy) => void
}) {
  // Agrupa por estado y ordena cada columna por entrega más próxima (sin fecha al final).
  const porEstado = useMemo(() => {
    const g: Record<EstadoProy, Proyecto[]> = {
      presupuesto: [], en_proceso: [], terminado: [], entregado: [], cancelado: [],
    }
    for (const p of items) (g[p.estado] ?? g.en_proceso).push(p)
    const rank = (p: Proyecto) => (p.fecha_entrega ? diasParaEntrega(p.fecha_entrega)! : Number.POSITIVE_INFINITY)
    for (const e of ESTADOS_PROY) g[e].sort((a, b) => rank(a) - rank(b))
    return g
  }, [items])

  return (
    <div className="overflow-x-auto p-4">
      <div className="flex gap-3 min-w-max items-start">
        {ESTADOS_PROY.map(est => {
          const { label, accent } = ESTADO_PROY[est]
          const col = porEstado[est]
          return (
            <section
              key={est}
              className="w-72 flex-shrink-0 rounded-xl overflow-hidden"
              style={{ background: '#F7F8FA', borderTop: `3px solid ${accent}` }}
              aria-label={`${label}: ${col.length} obra${col.length === 1 ? '' : 's'}`}
            >
              <header className="flex items-center gap-2 px-3 py-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: accent }} />
                <span className="font-semibold text-[13px] text-slate-700">{label}</span>
                <span className="badge badge-gray ml-auto">{col.length}</span>
              </header>

              <div className="px-2 pb-2 flex flex-col gap-2 min-h-[56px]">
                {col.map(p => (
                  <TarjetaObra key={p.id} p={p} editable={editable} onCambiarEstado={onCambiarEstado} />
                ))}
                {col.length === 0 && (
                  <div className="text-center text-[11px] text-brand-n500 py-5">Sin obras</div>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function TarjetaObra({
  p, editable, onCambiarEstado,
}: {
  p: Proyecto
  editable: boolean
  onCambiarEstado: (p: Proyecto, nuevo: EstadoProy) => void
}) {
  const dias = diasParaEntrega(p.fecha_entrega)
  const cerrada = entregaCerrada(p.estado)

  let chipColor = '#64748B'            // muted por defecto
  let chipLabel = fechaCorta(p.fecha_entrega)
  if (dias !== null && !cerrada) {
    if (dias < 0)       { chipColor = '#DC2626'; chipLabel = `Venció ${fechaCorta(p.fecha_entrega)}` }
    else if (dias === 0){ chipColor = '#D97706'; chipLabel = 'Entrega hoy' }
    else if (dias <= 7) { chipColor = '#D97706'; chipLabel = `En ${dias} día${dias === 1 ? '' : 's'}` }
  }

  return (
    <div className="rounded-lg border bg-white transition hover:shadow-sm" style={{ borderColor: '#EDEFF2' }}>
      <Link href={`/proyectos/${p.id}`} className="block p-2.5 group">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="code text-[11px]">{p.ot}</span>
          {p.fecha_entrega && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold flex-shrink-0" style={{ color: chipColor }}>
              <CalendarClock size={11} /> {chipLabel}
            </span>
          )}
        </div>
        <div className="font-semibold text-[13px] text-slate-800 leading-snug group-hover:text-slate-900">{p.nombre}</div>
        {p.cliente && <div className="text-[11px] text-brand-n500 truncate mt-0.5">{p.cliente}</div>}
      </Link>

      {editable && (
        <div className="px-2.5 pb-2.5">
          <select
            className="select text-[11px] py-1 w-full"
            value={p.estado}
            aria-label={`Mover ${p.ot} de estado`}
            onChange={e => onCambiarEstado(p, e.target.value as EstadoProy)}
          >
            {ESTADOS_PROY.map(e => (
              <option key={e} value={e}>Mover a: {ESTADO_PROY[e].label}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
