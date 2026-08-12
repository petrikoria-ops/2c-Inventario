import type { AvanceObraItem } from '@/types'

// Presentacional puro — no sabe nada de permisos ni de fechas, solo pinta
// el estado que recibe. Barra segmentada tipo línea de tiempo: un tramo
// por etapa, en el orden del plan. No es un Gantt (sin fechas
// arrastrables) — es la representación visual del checklist de abajo.
export default function AvanceTimeline({ items }: { items: AvanceObraItem[] }) {
  const ordenados = [...items].sort((a, b) => a.orden - b.orden)
  const total = ordenados.length
  const completadas = ordenados.filter(i => i.completado).length
  const pct = total ? Math.round((completadas / total) * 100) : 0
  const idxActual = ordenados.findIndex(i => !i.completado)

  const colorDe = (i: number) => {
    if (ordenados[i].completado) return '#059669'
    if (i === idxActual) return '#F0C000'
    return '#E2E4E7'
  }

  return (
    <div>
      {total > 0 && (
        <div className="flex gap-1 mb-2">
          {ordenados.map((item, i) => (
            <div key={item.id} className="flex-1 h-2 rounded-sm transition-colors duration-300"
              style={{ backgroundColor: colorDe(i) }}
              title={item.etapa} />
          ))}
        </div>
      )}
      <div className="flex items-center justify-between text-xs">
        <span className="text-brand-n500">
          {completadas} / {total} etapa{total !== 1 ? 's' : ''}
        </span>
        <span className="font-bold" style={{ color: pct === 100 ? '#059669' : '#2E333A' }}>{pct}%</span>
      </div>
    </div>
  )
}
