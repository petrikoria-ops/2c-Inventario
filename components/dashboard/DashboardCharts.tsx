// Gráficos del dashboard — HTML/CSS puro, sin librería de charts.
// Se mantienen como Server Components (sin 'use client', sin estado) para
// no sumar JS al bundle del cliente; el detalle de cada valor va en el
// atributo title (tooltip nativo) y en las etiquetas directas, nunca solo
// en el color.
import { clp } from '@/lib/utils'

// ─── Tendencia de movimientos (entradas vs salidas por día) ───────────
export interface SerieDia {
  fecha: Date
  entradas: number
  salidas: number
}

export function MovimientosTrend({ dias }: { dias: SerieDia[] }) {
  const max = Math.max(1, ...dias.flatMap(d => [d.entradas, d.salidas]))
  const totalEntradas = dias.reduce((s, d) => s + d.entradas, 0)
  const totalSalidas = dias.reduce((s, d) => s + d.salidas, 0)

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-4 text-xs font-medium">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#059669' }} />
          Entradas <span className="text-slate-800 font-bold">{totalEntradas}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#DC2626' }} />
          Salidas <span className="text-slate-800 font-bold">{totalSalidas}</span>
        </span>
        <span className="text-brand-n500 md:ml-auto">Últimos {dias.length} días · movimientos por día</span>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[460px]">
          <div className="flex items-end gap-2 h-32 border-b" style={{ borderColor: '#ECEEF1' }}>
            {dias.map(d => {
              const hE = Math.round((d.entradas / max) * 100)
              const hS = Math.round((d.salidas / max) * 100)
              const etiqueta = d.fecha.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', weekday: 'short' })
              return (
                <div
                  key={d.fecha.toISOString()}
                  className="flex-1 h-full flex items-end justify-center gap-[3px]"
                  title={`${etiqueta} — Entradas: ${d.entradas} · Salidas: ${d.salidas}`}
                >
                  <div className="w-2.5 rounded-t-sm transition-all" style={{ height: `${hE}%`, minHeight: d.entradas ? 2 : 0, background: '#059669' }} />
                  <div className="w-2.5 rounded-t-sm transition-all" style={{ height: `${hS}%`, minHeight: d.salidas ? 2 : 0, background: '#DC2626' }} />
                </div>
              )
            })}
          </div>
          <div className="flex gap-2 mt-1">
            {dias.map((d, i) => (
              <div key={i} className="flex-1 text-center text-[9px] text-brand-n500 whitespace-nowrap">
                {i % 2 === 0 ? d.fecha.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' }) : ''}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Valor de inventario por categoría ─────────────────────────────────
export interface CategoriaValor {
  nombre: string
  color: string
  valor: number
}

export function BarraCategorias({ categorias, total }: { categorias: CategoriaValor[]; total: number }) {
  const max = Math.max(1, ...categorias.map(c => c.valor))
  return (
    <div className="flex flex-col gap-3">
      {categorias.map(c => {
        const pct = total > 0 ? Math.round((c.valor / total) * 100) : 0
        const widthPct = Math.max(2, Math.round((c.valor / max) * 100))
        return (
          <div key={c.nombre} className="flex items-center gap-3" title={`${c.nombre}: ${clp(c.valor)} (${pct}% del total)`}>
            <div className="w-28 md:w-40 flex-shrink-0 text-xs font-medium text-slate-700 truncate">{c.nombre}</div>
            <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ background: '#F1F2F4' }}>
              <div className="h-full rounded-full" style={{ width: `${widthPct}%`, background: c.color }} />
            </div>
            <div className="w-32 flex-shrink-0 text-right text-xs font-semibold text-slate-800 tabular-nums">
              {clp(c.valor)} <span className="text-brand-n500 font-normal">{pct}%</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Barra de proporción (proyectos por estado / herramientas por estado) ──
export interface Segmento {
  label: string
  count: number
  color: string
}

export function BarraProporcion({ segmentos }: { segmentos: Segmento[] }) {
  const total = segmentos.reduce((s, x) => s + x.count, 0)
  if (total === 0) return null
  const visibles = segmentos.filter(s => s.count > 0)

  return (
    <div>
      <div className="flex w-full h-6 rounded-full overflow-hidden" style={{ background: '#F1F2F4' }}>
        {visibles.map((s, i) => (
          <div
            key={s.label}
            title={`${s.label}: ${s.count} (${Math.round((s.count / total) * 100)}%)`}
            style={{
              width: `${(s.count / total) * 100}%`,
              background: s.color,
              borderRight: i < visibles.length - 1 ? '2px solid #fff' : undefined,
            }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
        {visibles.map(s => (
          <span key={s.label} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
            {s.label} <span className="text-slate-800 font-bold">{s.count}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
