'use client'
import Link from 'next/link'
import { ListChecks } from 'lucide-react'
import type { Proyecto } from '@/types'

interface Props {
  proyectos: Pick<Proyecto, 'id' | 'ot' | 'nombre' | 'cliente' | 'estado'>[]
  avancePorProyecto: Record<number, { completado: boolean }[]>
}

export default function TablaAvanceObra({ proyectos, avancePorProyecto }: Props) {
  return (
    <div className="panel">
      <div className="panel-header">
        <ListChecks size={14} style={{ color: 'var(--n-500)' }} />
        <h2>Avance de obra</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">OT</th>
              <th className="th">Obra</th>
              <th className="th">Cliente</th>
              <th className="th">Avance</th>
              <th className="th">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {proyectos.map(p => {
              const items = avancePorProyecto[p.id] ?? []
              const total = items.length
              const completadas = items.filter(i => i.completado).length
              const pct = total ? Math.round((completadas / total) * 100) : null
              return (
                <tr key={p.id} className="tr-hover">
                  <td className="td"><span className="code">{p.ot}</span></td>
                  <td className="td font-medium">{p.nombre}</td>
                  <td className="td text-xs text-brand-n500">{p.cliente ?? '—'}</td>
                  <td className="td">
                    {pct === null ? (
                      <span className="text-xs text-brand-n500">Sin plan de avance</span>
                    ) : (
                      <div className="flex items-center gap-2 max-w-[160px]">
                        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#059669' : '#F0C000' }} />
                        </div>
                        <span className="text-xs font-semibold text-slate-700">{pct}%</span>
                      </div>
                    )}
                  </td>
                  <td className="td">
                    <Link href={`/proyectos/${p.id}`} className="btn btn-outline btn-sm">Ver obra</Link>
                  </td>
                </tr>
              )
            })}
            {!proyectos.length && (
              <tr><td colSpan={5} className="text-center py-10 text-brand-n500">No hay obras activas</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
