// Solo tipos + funciones puras — sin imports de next/headers ni de Supabase,
// para que se pueda importar desde Client Components (Sidebar, formulario de
// /solicitar-acceso, panel de admin). Lo que necesita sesión/DB vive en
// permisos.server.ts.

// Pirámide de roles cross-departamento (reemplaza la escala vieja, inconsistente
// entre departamentos). 'administrador'/'modificador'/'maestro' NO son bypass de
// código — a diferencia de 'master'/'admin_software' (ver NIVELES_TOTALES más
// abajo), el acceso real de esos 3 sigue viniendo 100% de permisos_puesto /
// permisos_usuario_overrides. Ver docs/departamentos/piramide.md.
export type NivelAcceso =
  | 'maestro' | 'modificador' | 'administrador' | 'admin_software' | 'master'

export type Departamento =
  | 'bodega' | 'taller' | 'oficina_tecnica' | 'prevencion'
  | 'rrhh' | 'directiva' | 'admin_software'

export type Modulo =
  | 'materiales' | 'herramientas' | 'movimientos' | 'proveedores' | 'compras'
  | 'proyectos' | 'trabajadores' | 'recursos_tecnicos' | 'checklist'
  | 'etiquetas' | 'agente' | 'metricas'
  | 'avance_obra' | 'verificacion_ric' | 'prevencion_riesgos' | 'pruebas_alimentadores'
  | 'tableros'

export const MODULOS: Modulo[] = [
  'materiales', 'herramientas', 'movimientos', 'proveedores', 'compras',
  'proyectos', 'trabajadores', 'recursos_tecnicos', 'checklist',
  'etiquetas', 'agente', 'metricas',
  'avance_obra', 'verificacion_ric', 'prevencion_riesgos', 'pruebas_alimentadores',
  'tableros',
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
  tableros: 'Tableros',
}

// Las 3 acciones independientes que puede tener un usuario sobre un módulo.
// Se resuelven server-side (tabla permisos_puesto + permisos_usuario_overrides,
// ver permisos.server.ts) y viajan ya calculadas dentro de Perfil.permisos —
// puedeVer/puedeCrear/puedeModificar acá abajo son lectura pura, sin DB.
export interface AccionesModulo {
  ver: boolean
  crear: boolean
  modificar: boolean
  eliminar: boolean
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
  // Licencia SEC (Superintendencia de Electricidad y Combustibles) — solo se
  // edita/muestra en el panel admin para nivel_acceso 'administrador' o
  // 'modificador' (Jefe de departamento, Visitador de obra, Supervisor).
  sec_licencia_numero: string | null
  sec_licencia_clase: string | null
  sec_licencia_vencimiento: string | null
  // Permiso individual, independiente del nivel_acceso — el dueño puede
  // otorgárselo a cualquier persona puntualmente desde el panel de
  // Usuarios, además de Gerente/Admin de software que ya lo tienen por
  // defecto. Ver puedeEnviarMensajes() más abajo.
  puede_enviar_mensajes: boolean
  // Idem, pero para asignar tareas/inspecciones — por defecto ya lo tienen
  // Gerente/Admin de software y el tier administrador (Jefe de
  // departamento/Visitador de obra); esto se lo otorga puntualmente a
  // cualquier otra persona. Ver puedeAsignarTareas() más abajo.
  puede_asignar_tareas: boolean
}

// Roles válidos por departamento — el dropdown de /solicitar-acceso
// y el panel de aprobación usan esta misma lista, así no se pueden
// pedir/asignar combinaciones puesto/departamento inexistentes. También es
// la fuente de filas/columnas de la matriz en /admin/permisos.
export const PUESTOS_POR_DEPARTAMENTO: Record<Departamento, { puesto: string; nivel: NivelAcceso }[]> = {
  bodega: [
    { puesto: 'Ayudante de bodega',    nivel: 'maestro' },
    { puesto: 'Bodeguero',             nivel: 'maestro' },
    { puesto: 'Chofer-bodeguero',      nivel: 'modificador' },
    { puesto: 'Encargado de bodega',   nivel: 'administrador' },
    { puesto: 'Ayudante de encargado', nivel: 'modificador' },
  ],
  taller: [
    { puesto: 'Ayudante de maestro',    nivel: 'maestro' },
    { puesto: 'Maestro 1',              nivel: 'maestro' },
    { puesto: 'Maestro 2',              nivel: 'maestro' },
    { puesto: 'Maestro Mayor',          nivel: 'modificador' },
    { puesto: 'Encargado de taller',    nivel: 'administrador' },
    { puesto: 'Ayudante de encargado',  nivel: 'modificador' },
  ],
  oficina_tecnica: [
    { puesto: 'Jefe de oficina técnica',            nivel: 'administrador' },
    { puesto: 'Proyectista / ingeniero',            nivel: 'modificador' },
    { puesto: 'Ayudante de jefe de oficina técnica', nivel: 'modificador' },
    { puesto: 'Técnico junior / ingeniero junior',  nivel: 'maestro' },
  ],
  prevencion: [
    { puesto: 'Prevencionista', nivel: 'administrador' },
  ],
  rrhh: [
    { puesto: 'Jefe de Recursos Humanos',     nivel: 'administrador' },
    { puesto: 'Asistente de Recursos Humanos', nivel: 'modificador' },
    { puesto: 'Practicante',                  nivel: 'maestro' },
  ],
  directiva: [
    { puesto: 'Gerente',             nivel: 'master' },
    { puesto: 'Jefe directivo',      nivel: 'master' },
    { puesto: 'Jefe ejecutivo',      nivel: 'administrador' },
    { puesto: 'Supervisor eléctrico', nivel: 'modificador' },
    { puesto: 'Visitador de obra',   nivel: 'administrador' },
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

export function puedeEliminar(perfil: Perfil, modulo: Modulo): boolean {
  if (NIVELES_TOTALES.includes(perfil.nivel_acceso)) return true
  return !!perfil.permisos[modulo]?.eliminar
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
  return perfil?.puesto === 'Visitador de obra'
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

// Maestro de terreno (Taller): puede tildar una etapa de avance como
// completada aunque no tenga permiso de "modificar" avance_obra (que
// también permitiría editar/estructurar el plan). Server-side gate real —
// ver app/api/avance-obra/items/[itemId]/route.ts, que exige esto cuando el
// body del PATCH trae solo `completado`. Acotado a los puestos de campo de
// Taller (no a todo nivel_acceso='maestro' de la empresa: un Practicante de
// RRHH o un Ayudante de bodega no marcan avance de una obra eléctrica).
const PUESTOS_MARCAN_AVANCE = ['Maestro 1', 'Maestro 2', 'Maestro Mayor']

export function puedeMarcarAvance(perfil: Perfil | null): boolean {
  if (!perfil) return false
  if (puedeModificar(perfil, 'avance_obra')) return true
  return PUESTOS_MARCAN_AVANCE.includes(perfil.puesto)
}

// Quién puede VER el estado de conexión de otras personas (desplegable
// "Conectados" de la barra lateral + punto verde/gris en mensajería) —
// acotado a Gerente y Administrador de software únicamente.
export function puedeVerConectados(perfil: Perfil | null): boolean {
  if (!perfil) return false
  return NIVELES_TOTALES.includes(perfil.nivel_acceso)
}

// Quién puede ENVIAR mensajes — la mensajería no es un chat entre pares,
// es una notificación/asignación. Por defecto solo Gerencia y Administración
// de software (NIVELES_TOTALES), pero el dueño puede otorgarle el permiso a
// cualquier otra persona puntualmente (perfil.puede_enviar_mensajes, editable
// desde el panel de Usuarios) sin tener que subirla de nivel. El resto sigue
// solo recibiendo: lee lo que le llega, pero no responde ni le escribe a
// nadie (ver HiloConversacion.tsx, que oculta el campo de texto cuando esto
// da false, y POST /api/mensajes + la política RLS de INSERT en `mensajes`,
// que son el candado real del lado servidor).
export function puedeEnviarMensajes(perfil: Perfil | null): boolean {
  if (!perfil) return false
  return NIVELES_TOTALES.includes(perfil.nivel_acceso) || perfil.puede_enviar_mensajes
}

// Quién puede ASIGNAR una tarea/inspección a otra persona — más amplio que
// puedeEnviarMensajes a propósito (confirmado con el usuario): Gerencia,
// Administración de software, y también el tier administrador (Jefe de
// departamento/Visitador de obra), más quien reciba el permiso puntual
// (perfil.puede_asignar_tareas). El candado real es la política RLS de
// INSERT en `tareas_asignadas` (mi_puede_asignar_tareas()), no solo esto.
export function puedeAsignarTareas(perfil: Perfil | null): boolean {
  if (!perfil) return false
  return NIVELES_TOTALES.includes(perfil.nivel_acceso) || perfil.nivel_acceso === 'administrador' || perfil.puede_asignar_tareas
}
