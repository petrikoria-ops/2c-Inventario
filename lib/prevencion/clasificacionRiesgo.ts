// Niveles de clasificación de riesgo de un hallazgo, portados 1:1 desde
// referencia/clasificacion-riesgo.json de la skill kit-prevencionista-riesgos.
// Definen el plazo de corrección sugerido por nivel.

export type NivelRiesgo = 'CRITICO' | 'ALTO' | 'MEDIO' | 'BAJO'

export interface NivelRiesgoInfo {
  codigo: NivelRiesgo
  nombre: string
  definicion: string
  plazo: string
  orden: number
  color: string // hex sin '#'
}

export const NIVELES_RIESGO: NivelRiesgoInfo[] = [
  { codigo: 'CRITICO', nombre: 'Crítico', definicion: 'Riesgo de consecuencia fatal o grave / incumplimiento legal directo.', plazo: 'Inmediato (puede requerir detención de la tarea).', orden: 4, color: 'C0392B' },
  { codigo: 'ALTO', nombre: 'Alto', definicion: 'Lesión incapacitante probable.', plazo: 'Corrección en 24 h.', orden: 3, color: 'E67E22' },
  { codigo: 'MEDIO', nombre: 'Medio', definicion: 'Lesión leve o daño menor.', plazo: 'Corrección en 48–72 h.', orden: 2, color: 'F1C40F' },
  { codigo: 'BAJO', nombre: 'Bajo', definicion: 'Mejora / oportunidad.', plazo: 'Corrección según programa.', orden: 1, color: '2E86C1' },
]

export function getNivelRiesgo(codigo: NivelRiesgo | null | undefined): NivelRiesgoInfo | undefined {
  return NIVELES_RIESGO.find(n => n.codigo === codigo)
}
