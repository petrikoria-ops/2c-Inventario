// Config compartida entre las rutas /api/enlaces-publicos, /api/publico/[token]
// y las páginas públicas de /completar — qué tabla/bucket toca cada módulo.
// Sin secretos, así que se puede importar tanto en server como en client.
import type { Modulo } from '@/lib/auth/permisos'
import type { ModuloPublico } from '@/types'

export const MODULOS_PUBLICOS: ModuloPublico[] = [
  'verificacion_ric', 'checklist_drs', 'prevencion_riesgos', 'pruebas_alimentadores',
]

export function esModuloPublico(v: unknown): v is ModuloPublico {
  return typeof v === 'string' && (MODULOS_PUBLICOS as string[]).includes(v)
}

interface ModuloPublicoConfig {
  modulo: ModuloPublico
  permisoModulo: Modulo   // mismo string que usa requireModificar — reutiliza la matriz de permisos existente
  label: string
  tabla: string
  tablaItems: string
  fkItems: string          // columna en tablaItems que apunta a registro_id (o a la cabecera, denormalizada, en alimentadores)
  bucket: string
  rutaImprimir: (id: number) => string
  rutaDetalle: (id: number) => string
  // Whitelist de columnas que la ruta pública puede escribir — todo lo que
  // no esté acá (proyecto_id, numero, estado, catalogo_id, nivel, etc.) solo
  // lo toca el personal interno desde la app.
  camposItemEditables: string[]
  camposCabeceraEditables: string[]
}

export const CONFIG_MODULOS_PUBLICOS: Record<ModuloPublico, ModuloPublicoConfig> = {
  verificacion_ric: {
    modulo: 'verificacion_ric',
    permisoModulo: 'verificacion_ric',
    label: 'Verificación RIC N°18/19',
    tabla: 'verificaciones_ric',
    tablaItems: 'verificaciones_ric_items',
    fkItems: 'verificacion_id',
    bucket: 'verificaciones-ric',
    rutaImprimir: id => `/verificacion-ric/${id}/imprimir`,
    rutaDetalle: id => `/verificacion-ric/${id}`,
    camposItemEditables: ['resultado', 'foto_tomada', 'foto_url', 'notas'],
    camposCabeceraEditables: ['declaracion_conformidad', 'firma_nombre', 'firma_rut', 'firma_cargo', 'firma_imagen_url'],
  },
  checklist_drs: {
    modulo: 'checklist_drs',
    permisoModulo: 'checklist_drs',
    label: 'Checklist DRS',
    tabla: 'checklists_drs',
    tablaItems: 'checklists_drs_items',
    fkItems: 'checklist_id',
    bucket: 'checklists-drs',
    rutaImprimir: id => `/checklist-drs/${id}/imprimir`,
    rutaDetalle: id => `/checklist-drs/${id}`,
    camposItemEditables: ['valor', 'estado', 'foto_tomada', 'foto_url', 'notas'],
    camposCabeceraEditables: ['firma_nombre', 'firma_rut', 'firma_cargo', 'firma_imagen_url'],
  },
  prevencion_riesgos: {
    modulo: 'prevencion_riesgos',
    permisoModulo: 'prevencion_riesgos',
    label: 'Inspección de prevención de riesgos',
    tabla: 'inspecciones_prevencion',
    tablaItems: 'inspecciones_prevencion_items',
    fkItems: 'inspeccion_id',
    bucket: 'prevencion-riesgos',
    rutaImprimir: id => `/prevencion-riesgos/${id}/imprimir`,
    rutaDetalle: id => `/prevencion-riesgos/${id}`,
    camposItemEditables: ['resultado', 'detalle', 'foto_url'],
    camposCabeceraEditables: [
      'observaciones_generales', 'firma_prevencionista', 'firma_encargado',
      'firma_prevencionista_imagen_url', 'firma_encargado_imagen_url',
    ],
  },
  pruebas_alimentadores: {
    modulo: 'pruebas_alimentadores',
    permisoModulo: 'pruebas_alimentadores',
    label: 'Test de Alimentadores',
    tabla: 'pruebas_alimentadores',
    tablaItems: 'pruebas_alimentadores_items',
    fkItems: 'prueba_id',
    bucket: 'pruebas-alimentadores',
    rutaImprimir: id => `/pruebas-alimentadores/${id}/imprimir`,
    rutaDetalle: id => `/pruebas-alimentadores/${id}`,
    camposItemEditables: ['valor', 'foto_url'],
    camposCabeceraEditables: ['observaciones', 'firma_nombre', 'firma_rut', 'firma_cargo', 'firma_imagen_url'],
  },
}
