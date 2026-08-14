// Fuente única de verdad de qué categoría de documento le pertenece a
// qué departamento — ver migration_documentos_trabajador.sql. Sin
// next/headers ni Supabase, así se puede importar desde Server o Client
// Components.
import type { Modulo } from '@/lib/auth/permisos'

export type CategoriaDocumentoTrabajador =
  | 'contrato' | 'finiquito' | 'licencia_medica' | 'certificado'
  | 'charla_diaria' | 'entrega_epp' | 'examen_ocupacional' | 'induccion_seguridad'

export interface GrupoDocumentos {
  /** módulo real que gatea ver/crear/modificar/eliminar este grupo */
  modulo: Modulo
  titulo: string
  categorias: { value: CategoriaDocumentoTrabajador; label: string; puedeVencer: boolean; porObra: boolean }[]
}

export const GRUPOS_DOCUMENTOS: GrupoDocumentos[] = [
  {
    modulo: 'trabajadores',
    titulo: 'Documentos de RRHH',
    categorias: [
      { value: 'contrato',        label: 'Contrato de trabajo', puedeVencer: false, porObra: false },
      { value: 'finiquito',       label: 'Finiquito',           puedeVencer: false, porObra: false },
      { value: 'licencia_medica', label: 'Licencia médica',     puedeVencer: true,  porObra: false },
      { value: 'certificado',     label: 'Certificado',         puedeVencer: true,  porObra: false },
    ],
  },
  {
    modulo: 'prevencion_riesgos',
    titulo: 'Documentos de Prevención',
    categorias: [
      { value: 'charla_diaria',       label: 'Charla diaria',              puedeVencer: false, porObra: true },
      { value: 'entrega_epp',         label: 'Entrega de EPP',             puedeVencer: false, porObra: true },
      { value: 'examen_ocupacional',  label: 'Examen ocupacional',         puedeVencer: true,  porObra: false },
      { value: 'induccion_seguridad', label: 'Inducción de seguridad',     puedeVencer: false, porObra: true },
    ],
  },
]

export const NOMBRE_CATEGORIA: Record<CategoriaDocumentoTrabajador, string> = Object.fromEntries(
  GRUPOS_DOCUMENTOS.flatMap(g => g.categorias.map(c => [c.value, c.label])),
) as Record<CategoriaDocumentoTrabajador, string>

export function grupoDeCategoria(categoria: CategoriaDocumentoTrabajador): GrupoDocumentos {
  return GRUPOS_DOCUMENTOS.find(g => g.categorias.some(c => c.value === categoria))!
}
