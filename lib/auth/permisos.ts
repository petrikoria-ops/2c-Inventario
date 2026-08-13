// Solo tipos + funciones puras — sin imports de next/headers ni de Supabase,
// para que se pueda importar desde Client Components (Sidebar, formulario de
// /solicitar-acceso, panel de admin). Lo que necesita sesión/DB vive en
// permisos.server.ts.

export type NivelAcceso =
  | 'visualizacion' | 'operador' | 'encargado'
  | 'jefe_departamento' | 'directiva' | 'admin_software' | 'master'

export type Departamento =
  | 'bodega' | 'taller' | 'oficina_tecnica' | 'prevencion'
  | 'rrhh' | 'directiva' | 'admin_software'

export type Modulo =
  | 'materiales' | 'herramientas' | 'movimientos' | 'proveedores' | 'compras'
  | 'proyectos' | 'trabajadores' | 'recursos_tecnicos' | 'checklist'
  | 'etiquetas' | 'agente' | 'metricas'
  | 'avance_obra' | 'verificacion_ric' | 'prevencion_riesgos' | 'pruebas_alimentadores'

export const MODULOS: Modulo[] = [
  'materiales', 'herramientas', 'movimientos', 'proveedores', 'compras',
  'proyectos', 'trabajadores', 'recursos_tecnicos', 'checklist',
  'etiquetas', 'agente', 'metricas',
  'avance_obra', 'verificacion_ric', 'prevencion_riesgos', 'pruebas_alimentadores',
]

// Etiquetas legibles — usadas en /admin/permisos (matriz por puesto y
// excepciones por persona).
export const NOMBRE_MODULO: Record<Modulo, string> = {
  materiales: 'Materiales',
  herramientas: 'Herramientas',
  movimientos: 'Movimientos',
  proveedores: 'Proveedores',
  compras: 'Compras',
  proyectos: 'Obras / Proyectos',
  trabajadores: 'Trabajadores',
  recursos_tecnicos: 'Recursos Técnicos',
  checklist: 'Checklist tablero',
  etiquetas: 'Etiquetas de obra',
  agente: 'Agente IA',
  metricas: 'Métricas',
  avance_obra: 'Avance de obra',
  verificacion_ric: 'Verificación RIC',
  prevencion_riesgos: 'Inspección de riesgos',
  pruebas_alimentadores: 'Test de Alimentadores',
}

// Las 3 acciones independientes que puede tener un usuario sobre un módulo.
// Se resuelven server-side (tabla permisos_puesto + permisos_usuario_overrides,
// ver permisos.server.ts) y viajan ya calculadas dentro de Perfil.permisos —
// puedeVer/puedeCrear/puedeModificar acá abajo son lectura pura, sin DB.
export interface AccionesModulo {
  ver: boolean
  crear: boolean
  modificar: boolean
}

export type MapaPermisos = Partial<Record<Modulo, AccionesModulo>>

export interface Perfil {
  id: string
  nombre_completo: string
  email: string
  departamento: Departamento
  puesto: string
  nivel_acceso: NivelAcceso
  activo: boolean
  permisos: MapaPermisos
}

// Roles válidos por departamento — el dropdown de /solicitar-acceso
// y el panel de aprobación usan esta misma lista, así no se pueden
// pedir/asignar combinaciones puesto/departamento inexistentes. También es
// la fuente de filas/columnas de la matriz en /admin/permisos.
export const PUESTOS_POR_DEPARTAMENTO: Record<Departamento, { puesto: string; nivel: NivelAcceso }[]> = {
  bodega: [
    { puesto: 'Ayudante de bodega',    nivel: 'visualizacion' },
    { puesto: 'Chofer-bodeguero',      nivel: 'operador' },
    { puesto: 'Encargado de bodega',   nivel: 'encargado' },
    { puesto: 'Ayudante de encargado', nivel: 'operador' },
  ],
  taller: [
    { puesto: 'Ayudante de maestro',    nivel: 'visualizacion' },
    { puesto: 'Maestro tablerista',     nivel: 'operador' },
    { puesto: 'Encargado de taller',    nivel: 'encargado' },
    { puesto: 'Ayudante de encargado',  nivel: 'operador' },
  ],
  oficina_tecnica: [
    { puesto: 'Jefe de oficina técnica',            nivel: 'jefe_departamento' },
    { puesto: 'Proyectista / ingeniero',            nivel: 'operador' },
    { puesto: 'Ayudante de jefe de oficina técnica', nivel: 'operador' },
    { puesto: 'Técnico junior / ingeniero junior',  nivel: 'visualizacion' },
  ],
  prevencion: [
    { puesto: 'Prevencionista', nivel: 'operador' },
  ],
  rrhh: [
    { puesto: 'Jefe de Recursos Humanos',     nivel: 'jefe_departamento' },
    { puesto: 'Asistente de Recursos Humanos', nivel: 'operador' },
    { puesto: 'Practicante',                  nivel: 'visualizacion' },
  ],
  directiva: [
    { puesto: 'Dueño',               nivel: 'master' },
    { puesto: 'Jefe directivo',      nivel: 'master' },
    { puesto: 'Jefe ejecutivo',      nivel: 'directiva' },
    { puesto: 'Supervisor eléctrico', nivel: 'jefe_departamento' },
    { puesto: 'Ingeniero visitante', nivel: 'visualizacion' },
  ],
  admin_software: [
    { puesto: 'Administrador de software', nivel: 'admin_software' },
  ],
}

const NIVELES_TOTALES: NivelAcceso[] = ['admin_software', 'master']

export function puedeVer(perfil: Perfil, modulo: Modulo): boolean {
  if (NIVELES_TOTALES.includes(perfil.nivel_acceso)) return true
  return !!perfil.permisos[modulo]?.ver
}

export function puedeCrear(perfil: Perfil, modulo: Modulo): boolean {
  if (NIVELES_TOTALES.includes(perfil.nivel_acceso)) return true
  return !!perfil.permisos[modulo]?.crear
}

export function puedeModificar(perfil: Perfil, modulo: Modulo): boolean {
  if (NIVELES_TOTALES.includes(perfil.nivel_acceso)) return true
  return !!perfil.permisos[modulo]?.modificar
}

// Alias — así no hay que renombrar de golpe cada import existente de
// puedeEditar. Significa exactamente lo mismo que antes: "puede escribir".
export const puedeEditar = puedeModificar

// Helpers de lectura (no de autorización) para diferenciar UX entre los dos
// puestos de terreno dentro de directiva — el Visitador estructura el plan
// de avance (agrega/edita/borra etapas), el Supervisor solo marca las
// etapas como completadas. La API sigue gateada a nivel de módulo
// (requireModificar('avance_obra')) para ambos — esta distinción es de
// interfaz, no un candado de seguridad duro. Ver plan en
// docs/departamentos/directiva.md si hace falta endurecerlo a futuro.
export function esVisitadorDeObra(perfil: Perfil | null): boolean {
  return perfil?.puesto === 'Ingeniero visitante'
}

export function esSupervisorDeObra(perfil: Perfil | null): boolean {
  return perfil?.puesto === 'Supervisor eléctrico'
}

// Quién ve los controles de "estructurar" el plan de avance (agregar/editar/
// borrar etapas): el Visitador, o un admin/master usando su acceso total
// (por ejemplo para corregir un plan a pedido del Visitador). Un Supervisor
// eléctrico sin ser además admin NO cae acá — solo marca etapas.
export function puedeEstructurarAvance(perfil: Perfil | null): boolean {
  if (!perfil) return false
  return esVisitadorDeObra(perfil) || NIVELES_TOTALES.includes(perfil.nivel_acceso)
}
