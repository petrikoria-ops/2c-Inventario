import type { Proyecto } from '@/types'

// Estados de una obra (OT), en orden de flujo. Fuente única para las vistas
// Tablero y Calendario: las etiquetas y los colores de badge siguen viviendo en
// BadgeEstadoProy (components/ui/Badge.tsx); aquí sólo se añade el color de
// acento (hex) para las columnas del kanban y los chips del calendario, con la
// misma semántica de color que el badge (gris/ámbar/azul/verde/rojo).
export type EstadoProy = Proyecto['estado']

export const ESTADOS_PROY: EstadoProy[] = [
  'presupuesto', 'en_proceso', 'terminado', 'entregado', 'cancelado',
]

export const ESTADO_PROY: Record<EstadoProy, { label: string; accent: string }> = {
  presupuesto: { label: 'Presupuesto', accent: '#64748B' }, // gris
  en_proceso:  { label: 'En proceso',  accent: '#D97706' }, // ámbar
  terminado:   { label: 'Terminado',   accent: '#2563EB' }, // azul
  entregado:   { label: 'Entregado',   accent: '#059669' }, // verde
  cancelado:   { label: 'Cancelado',   accent: '#DC2626' }, // rojo
}

// 'YYYY-MM-DD' local de una fecha (sin desfase de zona horaria).
export function claveDia(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Parsea 'YYYY-MM-DD' (o ISO) a medianoche local, evitando el salto de día que
// provoca interpretar la fecha como UTC.
export function parseFechaLocal(str: string): Date {
  const soloFecha = str.split('T')[0].split(' ')[0]
  const [y, m, d] = soloFecha.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

// Días entre hoy y la fecha de entrega (negativo = ya pasó). null si no hay fecha.
export function diasParaEntrega(fecha: string | null | undefined): number | null {
  if (!fecha) return null
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const f = parseFechaLocal(fecha); f.setHours(0, 0, 0, 0)
  return Math.round((f.getTime() - hoy.getTime()) / 86_400_000)
}

// Una obra "cerrada" ya no corre riesgo de vencimiento.
export function entregaCerrada(estado: EstadoProy): boolean {
  return estado === 'entregado' || estado === 'terminado' || estado === 'cancelado'
}
