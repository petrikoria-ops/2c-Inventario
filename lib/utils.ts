// Funciones de utilidad compartidas

export function clp(n: number | null | undefined): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n ?? 0)
}

export function num(n: number | null | undefined, dec = 2): string {
  return new Intl.NumberFormat('es-CL', { maximumFractionDigits: dec }).format(n ?? 0)
}

export function fechaCorta(str: string | null | undefined): string {
  if (!str) return '—'
  return str.split('T')[0].split(' ')[0]
}

export function fechaHora(str: string | null | undefined): string {
  if (!str) return '—'
  return new Date(str.replace(' ', 'T')).toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Días hasta la próxima mantención de una herramienta
export function diasHastaMant(fechaUlt: string | null, frecDias: number | null): number | null {
  if (!fechaUlt || !frecDias) return null
  const prox = new Date(fechaUlt)
  prox.setDate(prox.getDate() + frecDias)
  return Math.round((prox.getTime() - Date.now()) / 86400000)
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

// Un material con stock_minimo = 0 no tiene un umbral configurado todavía
// (típico tras una importación masiva) — no debe contar como alerta real.
export function estaBajoMinimo(stockActual: number, stockMinimo: number): boolean {
  return stockMinimo > 0 && stockActual <= stockMinimo
}

// Escapa valores antes de interpolarlos en un filtro .or()/.and() de
// PostgREST: una coma o paréntesis sin escapar rompe la sintaxis del
// filtro o altera las condiciones combinadas. Ver postgrest.org (Filtering).
export function escapeOrFilterValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}
