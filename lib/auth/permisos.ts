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

export interface Perfil {
  id: string
  nombre_completo: string
  email: string
  departamento: Departamento
  puesto: string
  nivel_acceso: NivelAcceso
  activo: boolean
}

// Roles válidos por departamento — el dropdown de /solicitar-acceso
// y el panel de aprobación usan esta misma lista, así no se pueden
// pedir/asignar combinaciones puesto/departamento inexistentes.
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

export type Modulo =
  | 'materiales' | 'herramientas' | 'movimientos' | 'proveedores' | 'compras'
  | 'proyectos' | 'trabajadores' | 'recursos_tecnicos' | 'checklist'
  | 'etiquetas' | 'agente' | 'metricas'
  | 'avance_obra' | 'verificacion_ric' | 'prevencion_riesgos' | 'pruebas_alimentadores'

type AccesoModulo = 'no' | 'lectura' | 'completo'

// Mapa de referencia departamento → módulo. admin_software y master
// no se listan: siempre tienen 'completo' en todo (ver puedeVer/puedeEditar).
const MODULOS_POR_DEPARTAMENTO: Record<Departamento, Partial<Record<Modulo, AccesoModulo>>> = {
  bodega: {
    materiales: 'completo', herramientas: 'completo', movimientos: 'completo',
    proveedores: 'completo', compras: 'completo', proyectos: 'lectura',
    etiquetas: 'completo', agente: 'completo',
  },
  taller: {
    herramientas: 'completo', movimientos: 'lectura', proyectos: 'completo',
    recursos_tecnicos: 'completo', checklist: 'completo', etiquetas: 'completo',
    agente: 'completo', materiales: 'lectura',
  },
  oficina_tecnica: {
    materiales: 'lectura', proveedores: 'lectura', compras: 'completo',
    proyectos: 'completo', recursos_tecnicos: 'completo', agente: 'completo',
  },
  prevencion: {
    herramientas: 'lectura', recursos_tecnicos: 'completo', checklist: 'completo',
    prevencion_riesgos: 'completo',
  },
  rrhh: {
    trabajadores: 'completo',
  },
  directiva: {
    materiales: 'lectura', herramientas: 'lectura', movimientos: 'lectura',
    proveedores: 'lectura', compras: 'lectura', proyectos: 'lectura',
    trabajadores: 'lectura', agente: 'completo', metricas: 'completo',
    avance_obra: 'completo', verificacion_ric: 'completo', prevencion_riesgos: 'lectura',
    pruebas_alimentadores: 'completo',
  },
  admin_software: {},
}

const NIVELES_TOTALES: NivelAcceso[] = ['admin_software', 'master']
const NIVELES_CON_METRICAS: NivelAcceso[] = ['jefe_departamento', 'directiva', 'admin_software', 'master']

// Excepción puntual y documentada: nivel_acceso === 'visualizacion' normalmente
// nunca edita nada (regla de abajo en puedeEditar). El puesto "Ingeniero
// visitante" (Visitador de obra, dpto. directiva) sí necesita generar
// solicitudes de compra y crear/editar el avance y la verificación RIC de
// sus obras, pese a tener nivel de solo lectura. Se centraliza acá — el
// único lugar del sistema que mira `puesto` en vez de `departamento`/
// `nivel_acceso` — en vez de repartir comparaciones de string sueltas por
// rutas y componentes. Si esta tabla crece mucho más allá de 1-2 entradas,
// reconsiderar un modelo de permisos por puesto en vez de por departamento.
const EXCEPCIONES_EDICION_POR_PUESTO: Partial<Record<string, Modulo[]>> = {
  'Ingeniero visitante': ['compras', 'avance_obra', 'verificacion_ric', 'pruebas_alimentadores'],
}

export function puedeVer(perfil: Perfil, modulo: Modulo): boolean {
  if (NIVELES_TOTALES.includes(perfil.nivel_acceso)) return true
  if (modulo === 'metricas') return NIVELES_CON_METRICAS.includes(perfil.nivel_acceso)
  const acceso = MODULOS_POR_DEPARTAMENTO[perfil.departamento]?.[modulo] ?? 'no'
  return acceso !== 'no'
}

export function puedeEditar(perfil: Perfil, modulo: Modulo): boolean {
  if (NIVELES_TOTALES.includes(perfil.nivel_acceso)) return true
  if (perfil.nivel_acceso === 'visualizacion' || perfil.nivel_acceso === 'directiva') {
    return EXCEPCIONES_EDICION_POR_PUESTO[perfil.puesto]?.includes(modulo) ?? false
  }
  const acceso = MODULOS_POR_DEPARTAMENTO[perfil.departamento]?.[modulo] ?? 'no'
  return acceso === 'completo'
}

// Helpers de lectura (no de autorización) para diferenciar UX entre los dos
// puestos de terreno dentro de directiva — el Visitador estructura el plan
// de avance (agrega/edita/borra etapas), el Supervisor solo marca las
// etapas como completadas. La API sigue gateada a nivel de módulo
// (requireEditable('avance_obra')) para ambos — esta distinción es de
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
