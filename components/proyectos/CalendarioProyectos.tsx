'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, CalendarOff } from 'lucide-react'
import { fechaCorta } from '@/lib/utils'
import { BadgeEstadoProy } from '@/components/ui/Badge'
import { ESTADO_PROY, claveDia, parseFechaLocal } from '@/lib/proyectos/estados'
import type { Proyecto } from '@/types'

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

// Vista Calendario de las obras, ubicadas por su FECHA DE ENTREGA (el
// vencimiento es lo que importa planificar). Rejilla mensual (semana parte el
// lunes) + una lista del mes debajo, que se lee bien en el celular donde las
// celdas quedan chicas. Las obras sin fecha de entrega se listan aparte para que
// no desaparezcan. Cada obra enlaza a su hub.
export default function CalendarioProyectos({ items }: { items: Proyecto[] }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d
  })
  const y = cursor.getFullYear()
  const m = cursor.getMonth()

  const porDia = useMemo(() => {
    const map: Record<string, Proyecto[]> = {}
    for (const p of items) {
      if (!p.fecha_entrega) continue
      const k = fechaCorta(p.fecha_entrega)
      ;(map[k] ??= []).push(p)
    }
    return map
  }, [items])

  const { delMes, sinFecha } = useMemo(() => {
    const delMes = items
      .filter(p => {
        if (!p.fecha_entrega) return false
        const f = parseFechaLocal(p.fecha_entrega)
        return f.getFullYear() === y && f.getMonth() === m
      })
      .sort((a, b) => (fechaCorta(a.fecha_entrega) < fechaCorta(b.fecha_entrega) ? -1 : 1))
    const sinFecha = items.filter(p => !p.fecha_entrega)
    return { delMes, sinFecha }
  }, [items, y, m])

  // Celdas de la rejilla (lunes = 0), rellenando semanas completas.
  const celdas = useMemo(() => {
    const first = new Date(y, m, 1)
    const offset = (first.getDay() + 6) % 7
    const diasMes = new Date(y, m + 1, 0).getDate()
    const out: ({ d: number; key: string } | null)[] = []
    for (let i = 0; i < offset; i++) out.push(null)
    for (let d = 1; d <= diasMes; d++) out.push({ d, key: claveDia(new Date(y, m, d)) })
    while (out.length % 7 !== 0) out.push(null)
    return out
  }, [y, m])

  const hoyKey = claveDia(new Date())
  const etiqueta = cursor.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
  const etiquetaCap = etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1)

  return (
    <div className="p-4">
      {/* Cabecera del calendario */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="font-semibold text-slate-800 text-[15px] capitalize">{etiquetaCap}</h3>
        <div className="flex items-center gap-1">
          <button className="btn btn-ghost btn-sm" onClick={() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); setCursor(d) }}>Hoy</button>
          <button className="btn-icon" aria-label="Mes anterior" onClick={() => setCursor(new Date(y, m - 1, 1))}><ChevronLeft size={16} /></button>
          <button className="btn-icon" aria-label="Mes siguiente" onClick={() => setCursor(new Date(y, m + 1, 1))}><ChevronRight size={16} /></button>
        </div>
      </div>

      {/* Rejilla mensual */}
      <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden" style={{ background: '#EDEFF2' }}>
        {DIAS.map(d => (
          <div key={d} className="bg-white text-center text-[11px] font-semibold text-brand-n500 py-1.5">{d}</div>
        ))}
        {celdas.map((c, i) => {
          if (!c) return <div key={`b${i}`} className="bg-slate-50 min-h-[80px]" />
          const obras = porDia[c.key] ?? []
          const esHoy = c.key === hoyKey
          return (
            <div key={c.key} className="bg-white min-h-[80px] p-1">
              <div className="flex justify-end">
                <span className={esHoy
                  ? 'inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold text-white'
                  : 'text-[11px] text-brand-n500 px-1'}
                  style={esHoy ? { background: '#2E333A' } : undefined}>{c.d}</span>
              </div>
              <div className="flex flex-col gap-0.5 mt-0.5">
                {obras.slice(0, 3).map(p => {
                  const accent = ESTADO_PROY[p.estado].accent
                  return (
                    <Link
                      key={p.id}
                      href={`/proyectos/${p.id}`}
                      title={`${p.ot} · ${p.nombre}`}
                      className="block truncate text-[10px] leading-tight rounded px-1 py-0.5 hover:brightness-95"
                      style={{ background: `${accent}1A`, color: accent }}
                    >
                      {p.nombre}
                    </Link>
                  )
                })}
                {obras.length > 3 && <span className="text-[10px] text-brand-n500 px-1">+{obras.length - 3} más</span>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Lista del mes — legible donde las celdas quedan chicas (celular) */}
      <div className="mt-5">
        <h4 className="seccion-label text-[12px]" style={{ '--seccion-acento': '#2563EB' } as React.CSSProperties}>
          <span className="dot" /> Entregas de {etiquetaCap.toLowerCase()} ({delMes.length})
        </h4>
        {delMes.length === 0
          ? <p className="text-[13px] text-brand-n500 px-1 py-2">Sin entregas este mes.</p>
          : (
            <ul className="divide-y" style={{ borderColor: '#EDEFF2' }}>
              {delMes.map(p => (
                <li key={p.id}>
                  <Link href={`/proyectos/${p.id}`} className="flex items-center gap-2.5 px-1 py-2 hover:bg-slate-50 rounded transition-colors">
                    <span className="text-[12px] font-mono text-brand-n500 w-[84px] flex-shrink-0">{fechaCorta(p.fecha_entrega)}</span>
                    <span className="min-w-0 flex-1 truncate">
                      <span className="text-[13px] font-medium text-slate-800">{p.nombre}</span>
                      {p.cliente && <span className="text-[12px] text-brand-n500"> · {p.cliente}</span>}
                    </span>
                    <BadgeEstadoProy estado={p.estado} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
      </div>

      {/* Obras sin fecha de entrega — para que no queden invisibles */}
      {sinFecha.length > 0 && (
        <div className="mt-5">
          <h4 className="seccion-label text-[12px]" style={{ '--seccion-acento': '#64748B' } as React.CSSProperties}>
            <span className="dot" /> Sin fecha de entrega ({sinFecha.length})
          </h4>
          <div className="flex flex-wrap gap-1.5 px-1">
            {sinFecha.map(p => (
              <Link
                key={p.id}
                href={`/proyectos/${p.id}`}
                title={p.nombre}
                className="inline-flex items-center gap-1.5 text-[12px] rounded-full border px-2.5 py-1 hover:bg-slate-50 transition-colors max-w-[220px]"
                style={{ borderColor: '#EDEFF2' }}
              >
                <CalendarOff size={12} className="text-brand-n500 flex-shrink-0" />
                <span className="truncate">{p.nombre}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
