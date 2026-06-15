import { cn } from '@/lib/utils'

// Badges para tipo de movimiento
export function BadgeTipo({ tipo }: { tipo: string }) {
  const map: Record<string, [string, string]> = {
    entrada:    ['badge-green',  '↑ Entrada'],
    salida:     ['badge-red',    '↓ Salida'],
    ajuste:     ['badge-blue',   '⇄ Ajuste'],
    devolucion: ['badge-yellow', '↩ Devolución'],
  }
  const [cls, label] = map[tipo] ?? ['badge-gray', tipo]
  return <span className={cn('badge', cls)}>{label}</span>
}

// Badge para estado de herramienta
export function BadgeEstadoHer({ estado }: { estado: string }) {
  const map: Record<string, [string, string]> = {
    operativa:    ['badge-green',  '✔ Operativa'],
    en_reparacion:['badge-yellow', '⚙ Reparación'],
    extraviada:   ['badge-red',    '✕ Extraviada'],
    dada_de_baja: ['badge-gray',   '— Baja'],
  }
  const [cls, label] = map[estado] ?? ['badge-gray', estado]
  return <span className={cn('badge', cls)}>{label}</span>
}

// Badge para estado de proyecto
export function BadgeEstadoProy({ estado }: { estado: string }) {
  const map: Record<string, [string, string]> = {
    presupuesto: ['badge-gray',   'Presupuesto'],
    en_proceso:  ['badge-blue',   'En proceso'],
    terminado:   ['badge-green',  'Terminado'],
    entregado:   ['badge-green',  '✔ Entregado'],
    cancelado:   ['badge-red',    'Cancelado'],
  }
  const [cls, label] = map[estado] ?? ['badge-gray', estado]
  return <span className={cn('badge', cls)}>{label}</span>
}

// Badge de stock
export function BadgeStock({ actual, minimo }: { actual: number; minimo: number }) {
  if (actual <= 0)      return <span className="badge badge-red">Sin stock</span>
  if (actual <= minimo) return <span className="badge badge-yellow">Bajo mínimo</span>
  return <span className="badge badge-green">OK</span>
}
