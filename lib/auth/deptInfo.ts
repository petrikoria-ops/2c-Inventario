// Constantes de departamentos seguras para cliente y servidor — SIN imports de
// next/headers ni Supabase, para poder usarlas desde Client Components (ej.
// VerComoSelector) sin arrastrar código de servidor al bundle.
import type { Departamento } from './permisos'

export const DEPARTAMENTOS_OPERATIVOS: Departamento[] =
  ['bodega', 'taller', 'oficina_tecnica', 'prevencion', 'rrhh', 'directiva']

export const NOMBRE_DEPARTAMENTO: Record<string, string> = {
  bodega: 'Bodega', taller: 'Taller', oficina_tecnica: 'Oficina Técnica',
  prevencion: 'Prevención', rrhh: 'Recursos Humanos', directiva: 'Directiva',
  admin_software: 'Administración de software',
}
