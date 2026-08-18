// Resumen ejecutivo del día — capa de solo lectura sobre las tablas que ya
// existen (movimientos, vales de despacho, entregas de herramientas,
// solicitudes de compra, avance de obra, verificación RIC, prevención,
// pruebas de alimentadores, tareas asignadas). No crea tablas ni módulos
// nuevos: solo consulta y resume con reglas determinísticas (sin LLM) lo que
// ya está guardado. Cada conteo se gatea con puedeVer() del perfil efectivo,
// igual que el resto de la home — así "ver como" también filtra este bloque.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowUpDown, PackageOpen, HardHat, ShoppingCart, ListChecks, ShieldCheck,
  ClipboardList, CheckSquare, PackageX, Wrench, Search, ShieldAlert, LayoutGrid, FileText,
} from 'lucide-react'
import { estaBajoMinimo } from '@/lib/utils'
import { puedeVer, type Perfil, type Modulo } from '@/lib/auth/permisos'
import { GRUPOS_DOCUMENTOS } from '@/lib/departamentos/documentosTrabajador'
import type { MaterialAlerta } from '@/lib/supabase/fetchAll'

const CATEGORIAS_RRHH = GRUPOS_DOCUMENTOS.find(g => g.modulo === 'trabajadores')!.categorias.map(c => c.value)
const CATEGORIAS_PREVENCION_DOCS = GRUPOS_DOCUMENTOS.find(g => g.modulo === 'prevencion_riesgos')!.categorias.map(c => c.value)

export interface IndicadorDia {
  key: string
  label: string
  value: number
  Icon: LucideIcon
}

export interface HechoDia {
  id: string
  texto: string
  hora: string
  href: string
  Icon: LucideIcon
}

export interface AlertaDia {
  id: string
  texto: string
  nivel: 'critico' | 'atencion'
  href: string
  Icon: LucideIcon
}

export interface RecomendacionDia {
  id: string
  texto: string
}

export interface ResumenEjecutivoDia {
  fecha: string
  sintesis: string[]
  indicadores: IndicadorDia[]
  avances: HechoDia[]
  alertas: AlertaDia[]
  recomendaciones: RecomendacionDia[]
  huboActividad: boolean
}

const puedeVerModulo = (perfil: Perfil | null, modulo: Modulo) => !perfil || puedeVer(perfil, modulo)

const MENSAJE_SIN_ACTIVIDAD = 'No se registraron movimientos relevantes durante esta jornada.'

// `materiales` viene ya cargado desde HomePage (app/page.tsx) — esta misma
// tabla completa (2000+ filas, paginada) se pedía OTRA VEZ acá adentro y una
// tercera vez en el Widget del departamento, las 3 en la misma carga del
// home. Recibirla como parámetro evita repetir esa consulta.
export async function getResumenEjecutivoDia(sb: SupabaseClient, perfil: Perfil | null, materiales: MaterialAlerta[]): Promise<ResumenEjecutivoDia> {
  const ahora = new Date()
  // Mismo patrón que startOfMonth en dashboard/page.tsx y WidgetBodega —
  // sin conversión de zona horaria explícita, para no introducir un
  // comportamiento nuevo que el resto de la app no tiene.
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).toISOString()
  const hoyISO = ahora.toISOString().slice(0, 10)
  const en30ISO = new Date(ahora.getTime() + 30 * 86400000).toISOString().slice(0, 10)
  const fecha = ahora.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const verMateriales    = puedeVerModulo(perfil, 'materiales')
  const verHerramientas  = puedeVerModulo(perfil, 'herramientas')
  const verMovimientos   = puedeVerModulo(perfil, 'movimientos')
  const verCompras       = puedeVerModulo(perfil, 'compras')
  const verProyectos     = puedeVerModulo(perfil, 'proyectos')
  const verAvanceObra    = puedeVerModulo(perfil, 'avance_obra')
  const verRic           = puedeVerModulo(perfil, 'verificacion_ric')
  const verPrevencion    = puedeVerModulo(perfil, 'prevencion_riesgos')
  const verAlimentadores = puedeVerModulo(perfil, 'pruebas_alimentadores')
  const verTableros      = puedeVerModulo(perfil, 'tableros')
  const verPedidosBodega = puedeVerModulo(perfil, 'pedidos_bodega')
  const verAjusteInv     = puedeVerModulo(perfil, 'solicitudes_ajuste')
  const verTrabajadores  = puedeVerModulo(perfil, 'trabajadores')
  // Jefe de departamento o superior: ve tareas de su equipo (RLS ampliada
  // en migration_tareas_visibilidad_jefatura.sql), no solo las propias.
  const esJefe = !perfil || perfil.nivel_acceso === 'administrador' || perfil.nivel_acceso === 'master' || perfil.nivel_acceso === 'admin_software'

  const vacioLista  = Promise.resolve({ data: [] as any[], count: 0 })
  const vacioConteo = Promise.resolve({ count: 0 })

  // Herramientas "a mi nombre": responsable es un campo de texto libre (no
  // FK a perfiles), así que el cruce es por nombre_completo — mejor
  // esfuerzo, no una identidad garantizada. Solo se pide para operativos
  // (para jefatura ya se ve el total del departamento).
  const misHerramientasQuery = verHerramientas && !esJefe && perfil?.nombre_completo

  const [
    herRep, herExt, entregasHoy, misHerramientas,
    movHoy, valesHoy,
    solNuevasHoy, solRecibidasHoy, solPend,
    avanceItemsHoy, proyectosNuevosHoy,
    ricHoy, prevHoy, prevAbiertas, alimHoy,
    tableros, pedidosBodegaPend, ajusteInvPend,
    docsVencenRrhh, docsVencenPrev,
    tareas,
  ] = await Promise.all([
    verHerramientas ? sb.from('herramientas').select('*', { count: 'exact', head: true }).eq('estado', 'en_reparacion').eq('activo', true) : vacioConteo,
    verHerramientas ? sb.from('herramientas').select('*', { count: 'exact', head: true }).eq('estado', 'extraviada').eq('activo', true) : vacioConteo,
    verHerramientas
      ? sb.from('entregas_herramientas').select('id,numero,trabajador_nombre,fecha').gte('fecha', inicioHoy).order('fecha', { ascending: false }).limit(15)
      : vacioLista,
    misHerramientasQuery
      ? sb.from('herramientas').select('*', { count: 'exact', head: true }).eq('responsable', perfil!.nombre_completo).eq('activo', true).neq('estado', 'dada_de_baja')
      : vacioConteo,

    verMovimientos
      ? sb.from('movimientos').select('id,tipo,fecha').gte('fecha', inicioHoy).order('fecha', { ascending: false }).limit(300)
      : vacioLista,
    verMovimientos
      ? sb.from('vales_despacho').select('id,numero,fecha,proyectos(ot,nombre)').gte('fecha', inicioHoy).order('fecha', { ascending: false }).limit(15)
      : vacioLista,

    verCompras
      ? sb.from('solicitudes_compra').select('id,numero,creado_en').gte('creado_en', inicioHoy).order('creado_en', { ascending: false }).limit(15)
      : vacioLista,
    verCompras
      ? sb.from('solicitudes_compra').select('id,numero,actualizado_en').eq('estado', 'comprado').gte('actualizado_en', inicioHoy).order('actualizado_en', { ascending: false }).limit(15)
      : vacioLista,
    verCompras ? sb.from('solicitudes_compra').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente') : vacioConteo,

    verAvanceObra
      ? sb.from('avances_obra_items')
          .select('id,etapa,completado_en,avances_obra(proyecto_id,proyectos(ot,nombre))')
          .eq('completado', true).gte('completado_en', inicioHoy).order('completado_en', { ascending: false }).limit(15)
      : vacioLista,
    verProyectos
      ? sb.from('proyectos').select('id,ot,nombre,creado_en').gte('creado_en', inicioHoy).order('creado_en', { ascending: false }).limit(10)
      : vacioLista,

    verRic
      ? sb.from('verificaciones_ric').select('id,numero,estado,proyecto_nombre,actualizado_en').gte('actualizado_en', inicioHoy).order('actualizado_en', { ascending: false }).limit(10)
      : vacioLista,
    verPrevencion
      ? sb.from('inspecciones_prevencion').select('id,numero,estado,centro_trabajo,actualizado_en').gte('actualizado_en', inicioHoy).order('actualizado_en', { ascending: false }).limit(10)
      : vacioLista,
    verPrevencion ? sb.from('inspecciones_prevencion').select('*', { count: 'exact', head: true }).eq('estado', 'en_progreso') : vacioConteo,
    verAlimentadores
      ? sb.from('pruebas_alimentadores').select('id,numero,estado,proyecto_nombre,actualizado_en').gte('actualizado_en', inicioHoy).order('actualizado_en', { ascending: false }).limit(10)
      : vacioLista,

    // Si migration_tableros.sql todavía no corrió, esta tabla no existe —
    // el resultado vuelve con error y se trata igual que "sin tableros"
    // más abajo (mismo criterio que el resto de este archivo).
    verTableros
      ? sb.from('tableros').select('id,estado').neq('estado', 'terminado').limit(500)
      : vacioLista,

    // Igual que tableros: si las migraciones de Etapa 3 todavía no
    // corrieron, estas tablas no existen y el resultado vuelve con error.
    verPedidosBodega ? sb.from('pedidos_bodega').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente') : vacioConteo,
    verAjusteInv      ? sb.from('solicitudes_ajuste_inventario').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente') : vacioConteo,

    // Documentos de trabajador vencidos o por vencer en 30 días — misma
    // tabla para RRHH y Prevención, separados por categoría (ver
    // lib/departamentos/documentosTrabajador.ts). Si
    // migration_documentos_trabajador.sql no corrió, la tabla no existe.
    verTrabajadores
      ? sb.from('documentos_trabajador').select('id,titulo').in('categoria', CATEGORIAS_RRHH).not('fecha_vencimiento', 'is', null).lte('fecha_vencimiento', en30ISO).limit(200)
      : vacioLista,
    verPrevencion
      ? sb.from('documentos_trabajador').select('id,titulo').in('categoria', CATEGORIAS_PREVENCION_DOCS).not('fecha_vencimiento', 'is', null).lte('fecha_vencimiento', en30ISO).limit(200)
      : vacioLista,

    // tareas_asignadas tiene RLS propia: por defecto solo asignado_por/
    // asignado_a = auth.uid(), y además — desde
    // migration_tareas_visibilidad_jefatura.sql — las de todo el equipo
    // si quien mira es Jefe de departamento o Gerencia. No hace falta
    // filtrar acá: ya viene acotada por rol desde la base de datos.
    sb.from('tareas_asignadas').select('id,titulo,estado,fecha_limite,creado_en,completado_en').order('creado_en', { ascending: false }).limit(100),
  ])

  // ── Materiales: stock ────────────────────────────────────────────
  const matData      = verMateriales ? materiales : []
  const sinStock     = matData.filter(m => m.stock_actual <= 0)
  const bajoMinimo   = matData.filter(m => m.stock_actual > 0 && estaBajoMinimo(m.stock_actual, m.stock_minimo))

  // ── Herramientas ─────────────────────────────────────────────────
  const herRepCount = herRep?.count ?? 0
  const herExtCount = herExt?.count ?? 0
  const misHerramientasCount = misHerramientas?.count ?? 0
  const entregas     = (entregasHoy?.data ?? []) as { id: number; numero: string; trabajador_nombre: string; fecha: string }[]

  // ── Movimientos / despachos ──────────────────────────────────────
  const movs = (movHoy?.data ?? []) as { id: number; tipo: string; fecha: string }[]
  const movTotal = movs.length
  const movPorTipo = {
    entrada:    movs.filter(m => m.tipo === 'entrada').length,
    salida:     movs.filter(m => m.tipo === 'salida').length,
    ajuste:     movs.filter(m => m.tipo === 'ajuste').length,
    devolucion: movs.filter(m => m.tipo === 'devolucion').length,
  }
  const vales = (valesHoy?.data ?? []) as { id: number; numero: string; fecha: string; proyectos: { ot: string; nombre: string } | null }[]

  // ── Compras ──────────────────────────────────────────────────────
  const solNuevas    = (solNuevasHoy?.data ?? []) as { id: number; numero: string; creado_en: string }[]
  const solRecibidas = (solRecibidasHoy?.data ?? []) as { id: number; numero: string; actualizado_en: string }[]
  const solPendCount = solPend?.count ?? 0

  // ── Avance de obra ───────────────────────────────────────────────
  const avanceItems = (avanceItemsHoy?.data ?? []) as {
    id: number; etapa: string; completado_en: string
    avances_obra: { proyecto_id: number; proyectos: { ot: string; nombre: string } | null } | null
  }[]
  const proyectosNuevos = (proyectosNuevosHoy?.data ?? []) as { id: number; ot: string; nombre: string; creado_en: string }[]

  // ── Verificaciones / inspecciones / pruebas ──────────────────────
  const ric  = (ricHoy?.data ?? [])  as { id: number; numero: string; estado: string; proyecto_nombre: string | null; actualizado_en: string }[]
  const prev = (prevHoy?.data ?? []) as { id: number; numero: string; estado: string; centro_trabajo: string | null; actualizado_en: string }[]
  const prevAbiertasCount = prevAbiertas?.count ?? 0
  const alim = (alimHoy?.data ?? [])  as { id: number; numero: string; estado: string; proyecto_nombre: string | null; actualizado_en: string }[]

  // ── Tableros (Taller / Oficina Técnica) ──────────────────────────
  const tablerosData = (tableros?.data ?? []) as { id: number; estado: string }[]
  const tablerosPorCubicar = tablerosData.filter(t => t.estado === 'por_cubicar').length
  const tablerosPorArmar   = tablerosData.filter(t => t.estado === 'por_armar').length

  // ── Pedidos de bodega / ajustes de inventario (Etapa 3) ──────────
  const pedidosBodegaPendCount = pedidosBodegaPend?.count ?? 0
  const ajusteInvPendCount     = ajusteInvPend?.count ?? 0

  // ── Documentos de trabajador por vencer (RRHH / Prevención) ──────
  const docsVencenRrhhCount = (docsVencenRrhh?.data ?? []).length
  const docsVencenPrevCount = (docsVencenPrev?.data ?? []).length

  // ── Tareas asignadas (propias, vía RLS) ──────────────────────────
  const tareasData = (tareas?.data ?? []) as { id: number; titulo: string; estado: string; fecha_limite: string | null; creado_en: string; completado_en: string | null }[]
  const tareasCompletadasHoy = tareasData.filter(t => t.estado === 'completada' && t.completado_en && t.completado_en >= inicioHoy)
  const tareasAbiertas       = tareasData.filter(t => t.estado === 'pendiente' || t.estado === 'aceptada')
  const tareasVencidas       = tareasAbiertas.filter(t => !!t.fecha_limite && t.fecha_limite < hoyISO)

  // ── Indicadores del día (tarjetas) ───────────────────────────────
  const indicadores: IndicadorDia[] = []
  if (verMovimientos)   indicadores.push({ key: 'mov',   label: 'Movimientos de inventario', value: movTotal,                              Icon: ArrowUpDown })
  if (verHerramientas)  indicadores.push({ key: 'her',   label: 'Herramientas entregadas',    value: entregas.length,                       Icon: HardHat })
  if (misHerramientasQuery) indicadores.push({ key: 'mis-her', label: 'Herramientas a tu nombre', value: misHerramientasCount,             Icon: Wrench })
  if (verCompras)       indicadores.push({ key: 'com',   label: 'Movimientos de compra',      value: solNuevas.length + solRecibidas.length, Icon: ShoppingCart })
  if (verAvanceObra)    indicadores.push({ key: 'ava',   label: 'Etapas de avance completadas', value: avanceItems.length,                  Icon: ListChecks })
  if (verRic || verPrevencion || verAlimentadores) {
    indicadores.push({ key: 'ver', label: 'Verificaciones e inspecciones', value: ric.length + prev.length + alim.length, Icon: ShieldCheck })
  }
  if (verTableros) indicadores.push({ key: 'tab', label: 'Tableros por cubicar/armar', value: tablerosPorCubicar + tablerosPorArmar, Icon: LayoutGrid })

  // ── Hechos del día ("Avances") ────────────────────────────────────
  const avances: HechoDia[] = []
  if (movTotal > 0) {
    avances.push({
      id: 'mov',
      texto: `${movTotal} movimiento${movTotal !== 1 ? 's' : ''} de inventario (${movPorTipo.entrada} entradas, ${movPorTipo.salida} salidas, ${movPorTipo.ajuste} ajustes, ${movPorTipo.devolucion} devoluciones)`,
      hora: movs[0].fecha,
      href: '/movimientos',
      Icon: ArrowUpDown,
    })
  }
  vales.forEach(v => avances.push({
    id: `val-${v.id}`,
    texto: `Despacho ${v.numero}${v.proyectos ? ` — ${v.proyectos.nombre}` : ''}`,
    hora: v.fecha,
    href: `/salidas/${v.id}`,
    Icon: PackageOpen,
  }))
  entregas.forEach(e => avances.push({
    id: `ent-${e.id}`,
    texto: `Herramientas entregadas a ${e.trabajador_nombre} (${e.numero})`,
    hora: e.fecha,
    href: `/herramientas/entregas/${e.id}/imprimir`,
    Icon: HardHat,
  }))
  solNuevas.forEach(s => avances.push({
    id: `scn-${s.id}`,
    texto: `Nueva solicitud de compra ${s.numero}`,
    hora: s.creado_en,
    href: `/solicitudes/${s.id}`,
    Icon: ShoppingCart,
  }))
  solRecibidas.forEach(s => avances.push({
    id: `scr-${s.id}`,
    texto: `Compra recibida: ${s.numero}`,
    hora: s.actualizado_en,
    href: `/solicitudes/${s.id}`,
    Icon: ShoppingCart,
  }))
  avanceItems.forEach(a => avances.push({
    id: `avi-${a.id}`,
    texto: `Etapa completada: "${a.etapa}"${a.avances_obra?.proyectos ? ` — ${a.avances_obra.proyectos.nombre}` : ''}`,
    hora: a.completado_en,
    href: a.avances_obra?.proyecto_id ? `/proyectos/${a.avances_obra.proyecto_id}` : '/avance-obra',
    Icon: ListChecks,
  }))
  proyectosNuevos.forEach(p => avances.push({
    id: `pry-${p.id}`,
    texto: `Nueva obra registrada: ${p.nombre} (${p.ot})`,
    hora: p.creado_en,
    href: `/proyectos/${p.id}`,
    Icon: ClipboardList,
  }))
  ric.forEach(r => avances.push({
    id: `ric-${r.id}`,
    texto: `Verificación RIC ${r.numero} ${r.estado === 'completa' ? 'completada' : 'actualizada'}${r.proyecto_nombre ? ` — ${r.proyecto_nombre}` : ''}`,
    hora: r.actualizado_en,
    href: `/verificacion-ric/${r.id}`,
    Icon: ShieldCheck,
  }))
  prev.forEach(p => avances.push({
    id: `prv-${p.id}`,
    texto: `Inspección de prevención ${p.numero} ${p.estado === 'completa' ? 'completada' : 'actualizada'}${p.centro_trabajo ? ` — ${p.centro_trabajo}` : ''}`,
    hora: p.actualizado_en,
    href: `/prevencion-riesgos/${p.id}`,
    Icon: ShieldAlert,
  }))
  alim.forEach(a => avances.push({
    id: `alm-${a.id}`,
    texto: `Test de alimentadores ${a.numero} ${a.estado === 'completa' ? 'completado' : 'actualizado'}${a.proyecto_nombre ? ` — ${a.proyecto_nombre}` : ''}`,
    hora: a.actualizado_en,
    href: `/pruebas-alimentadores/${a.id}`,
    Icon: ShieldCheck,
  }))
  tareasCompletadasHoy.forEach(t => avances.push({
    id: `tar-${t.id}`,
    texto: `Tarea completada: "${t.titulo}"`,
    hora: t.completado_en as string,
    href: '/itinerario',
    Icon: CheckSquare,
  }))

  avances.sort((a, b) => (a.hora < b.hora ? 1 : -1))
  const avancesTop = avances.slice(0, 10)

  // ── Alertas / atención requerida (estado actual, no solo de hoy) ──
  const alertas: AlertaDia[] = []
  if (sinStock.length > 0) {
    alertas.push({ id: 'sin-stock', texto: `${sinStock.length} material${sinStock.length !== 1 ? 'es' : ''} sin stock`, nivel: 'critico', href: '/materiales?bajo_minimo=1', Icon: PackageX })
  }
  if (bajoMinimo.length > 0) {
    alertas.push({ id: 'bajo-min', texto: `${bajoMinimo.length} material${bajoMinimo.length !== 1 ? 'es' : ''} bajo su stock mínimo`, nivel: 'atencion', href: '/materiales?bajo_minimo=1', Icon: PackageX })
  }
  if (herExtCount > 0) {
    alertas.push({ id: 'her-ext', texto: `${herExtCount} herramienta${herExtCount !== 1 ? 's' : ''} extraviada${herExtCount !== 1 ? 's' : ''}`, nivel: 'critico', href: '/herramientas', Icon: Search })
  }
  if (herRepCount > 0) {
    alertas.push({ id: 'her-rep', texto: `${herRepCount} herramienta${herRepCount !== 1 ? 's' : ''} en reparación`, nivel: 'atencion', href: '/herramientas', Icon: Wrench })
  }
  if (tablerosPorCubicar > 0) {
    alertas.push({ id: 'tab-cub', texto: `${tablerosPorCubicar} tablero${tablerosPorCubicar !== 1 ? 's' : ''} por cubicar`, nivel: 'atencion', href: '/proyectos', Icon: LayoutGrid })
  }
  if (tablerosPorArmar > 0) {
    alertas.push({ id: 'tab-arm', texto: `${tablerosPorArmar} tablero${tablerosPorArmar !== 1 ? 's' : ''} por armar`, nivel: 'atencion', href: '/proyectos', Icon: LayoutGrid })
  }
  if (pedidosBodegaPendCount > 0) {
    alertas.push({ id: 'ped-bod', texto: `${pedidosBodegaPendCount} pedido${pedidosBodegaPendCount !== 1 ? 's' : ''} a bodega por aprobar`, nivel: 'atencion', href: '/pedidos-bodega', Icon: PackageOpen })
  }
  if (ajusteInvPendCount > 0) {
    alertas.push({ id: 'ajuste-inv', texto: `${ajusteInvPendCount} ajuste${ajusteInvPendCount !== 1 ? 's' : ''} de inventario por aprobar`, nivel: 'atencion', href: '/solicitudes-ajuste', Icon: PackageX })
  }
  if (solPendCount > 0) {
    alertas.push({ id: 'sol-pend', texto: `${solPendCount} solicitud${solPendCount !== 1 ? 'es' : ''} de compra pendiente${solPendCount !== 1 ? 's' : ''}`, nivel: 'atencion', href: '/solicitudes', Icon: ShoppingCart })
  }
  if (prevAbiertasCount > 0) {
    alertas.push({ id: 'prev-abiertas', texto: `${prevAbiertasCount} inspección${prevAbiertasCount !== 1 ? 'es' : ''} de prevención en progreso`, nivel: 'atencion', href: '/prevencion-riesgos', Icon: ShieldAlert })
  }
  if (docsVencenRrhhCount > 0) {
    alertas.push({ id: 'docs-rrhh', texto: `${docsVencenRrhhCount} documento${docsVencenRrhhCount !== 1 ? 's' : ''} de RRHH vencido${docsVencenRrhhCount !== 1 ? 's' : ''} o por vencer`, nivel: 'atencion', href: '/trabajadores', Icon: FileText })
  }
  if (docsVencenPrevCount > 0) {
    alertas.push({ id: 'docs-prev', texto: `${docsVencenPrevCount} documento${docsVencenPrevCount !== 1 ? 's' : ''} de prevención vencido${docsVencenPrevCount !== 1 ? 's' : ''} o por vencer`, nivel: 'atencion', href: '/trabajadores', Icon: FileText })
  }
  // "del equipo" vs. "tuyas": mismo texto, alcance distinto — lo resuelve
  // solo la RLS de tareas_asignadas (migration_tareas_visibilidad_jefatura.sql),
  // acá nomás se nombra bien lo que ya llegó filtrado.
  const alcanceTareas = esJefe ? 'del equipo' : 'tuyas'
  if (tareasVencidas.length > 0) {
    alertas.push({ id: 'tar-venc', texto: `${tareasVencidas.length} tarea${tareasVencidas.length !== 1 ? 's' : ''} vencida${tareasVencidas.length !== 1 ? 's' : ''} ${alcanceTareas}`, nivel: 'critico', href: '/itinerario', Icon: CheckSquare })
  }
  if (tareasAbiertas.length > tareasVencidas.length) {
    alertas.push({ id: 'tar-abiertas', texto: `${tareasAbiertas.length} tarea${tareasAbiertas.length !== 1 ? 's' : ''} abierta${tareasAbiertas.length !== 1 ? 's' : ''} ${alcanceTareas} en el itinerario`, nivel: 'atencion', href: '/itinerario', Icon: ClipboardList })
  }

  // ── Recomendaciones (reglas determinísticas, más severas primero) ─
  const recomendaciones: RecomendacionDia[] = []
  const agregarRecomendacion = (id: string, texto: string) => {
    if (recomendaciones.length < 5) recomendaciones.push({ id, texto })
  }
  if (sinStock.length > 0) agregarRecomendacion('r-sin-stock', `Reponer ${sinStock.length} material${sinStock.length !== 1 ? 'es' : ''} sin stock antes de que frene un despacho u obra.`)
  if (bajoMinimo.length > 0) agregarRecomendacion('r-bajo-min', `Revisar compras para ${bajoMinimo.length} material${bajoMinimo.length !== 1 ? 'es' : ''} bajo su stock mínimo.`)
  if (herExtCount > 0) agregarRecomendacion('r-her-ext', `Investigar el paradero de ${herExtCount} herramienta${herExtCount !== 1 ? 's' : ''} extraviada${herExtCount !== 1 ? 's' : ''}.`)
  if (tareasVencidas.length > 0) agregarRecomendacion('r-tar-venc', `Resolver ${tareasVencidas.length} tarea${tareasVencidas.length !== 1 ? 's' : ''} vencida${tareasVencidas.length !== 1 ? 's' : ''} ${alcanceTareas} en el itinerario.`)
  if (solPendCount > 0) agregarRecomendacion('r-sol-pend', `Dar seguimiento a ${solPendCount} solicitud${solPendCount !== 1 ? 'es' : ''} de compra pendiente${solPendCount !== 1 ? 's' : ''} con los proveedores.`)
  if (prevAbiertasCount > 0) agregarRecomendacion('r-prev', `Cerrar ${prevAbiertasCount} inspección${prevAbiertasCount !== 1 ? 'es' : ''} de prevención que sigue${prevAbiertasCount !== 1 ? 'n' : ''} en progreso.`)
  if (herRepCount > 0) agregarRecomendacion('r-her-rep', `Dar seguimiento a ${herRepCount} herramienta${herRepCount !== 1 ? 's' : ''} en reparación.`)
  if (tablerosPorCubicar > 0) agregarRecomendacion('r-tab-cub', `Cubicar ${tablerosPorCubicar} tablero${tablerosPorCubicar !== 1 ? 's' : ''} para que Taller pueda empezar a armarlo${tablerosPorCubicar !== 1 ? 's' : ''}.`)
  if (tablerosPorArmar > 0) agregarRecomendacion('r-tab-arm', `Avanzar el armado de ${tablerosPorArmar} tablero${tablerosPorArmar !== 1 ? 's' : ''} en cola.`)
  if (pedidosBodegaPendCount > 0) agregarRecomendacion('r-ped-bod', `Aprobar o rechazar ${pedidosBodegaPendCount} pedido${pedidosBodegaPendCount !== 1 ? 's' : ''} a bodega antes de que frene a la obra que lo pidió.`)
  if (ajusteInvPendCount > 0) agregarRecomendacion('r-ajuste-inv', `Revisar ${ajusteInvPendCount} ajuste${ajusteInvPendCount !== 1 ? 's' : ''} de inventario pendiente${ajusteInvPendCount !== 1 ? 's' : ''} de aprobar.`)
  if (docsVencenRrhhCount > 0) agregarRecomendacion('r-docs-rrhh', `Renovar o archivar ${docsVencenRrhhCount} documento${docsVencenRrhhCount !== 1 ? 's' : ''} de RRHH vencido${docsVencenRrhhCount !== 1 ? 's' : ''} o por vencer.`)
  if (docsVencenPrevCount > 0) agregarRecomendacion('r-docs-prev', `Renovar ${docsVencenPrevCount} documento${docsVencenPrevCount !== 1 ? 's' : ''} de prevención vencido${docsVencenPrevCount !== 1 ? 's' : ''} o por vencer antes de que alguien quede sin certificación vigente en obra.`)

  // ── Síntesis ejecutiva (3–5 líneas, solo con datos reales) ────────
  const huboActividad = avancesTop.length > 0
  const sintesis: string[] = []
  if (!huboActividad) {
    sintesis.push(MENSAJE_SIN_ACTIVIDAD)
    if (alertas.length > 0) {
      sintesis.push(`Aun así, hay ${alertas.length} asunto${alertas.length !== 1 ? 's' : ''} que requiere${alertas.length !== 1 ? 'n' : ''} atención.`)
    }
  } else {
    if (movTotal > 0 || vales.length > 0 || entregas.length > 0) {
      const partes: string[] = []
      if (movTotal > 0) partes.push(`${movTotal} movimiento${movTotal !== 1 ? 's' : ''} de inventario`)
      if (vales.length > 0) partes.push(`${vales.length} despacho${vales.length !== 1 ? 's' : ''}`)
      if (entregas.length > 0) partes.push(`${entregas.length} entrega${entregas.length !== 1 ? 's' : ''} de herramientas`)
      sintesis.push(`Hoy se registraron ${partes.join(', ')}.`)
    }
    if (avanceItems.length > 0 || proyectosNuevos.length > 0) {
      const partes: string[] = []
      if (avanceItems.length > 0) partes.push(`${avanceItems.length} etapa${avanceItems.length !== 1 ? 's' : ''} de avance completada${avanceItems.length !== 1 ? 's' : ''}`)
      if (proyectosNuevos.length > 0) partes.push(`${proyectosNuevos.length} obra${proyectosNuevos.length !== 1 ? 's' : ''} nueva${proyectosNuevos.length !== 1 ? 's' : ''}`)
      sintesis.push(`En obra: ${partes.join(' y ')}.`)
    }
    if (solNuevas.length > 0 || solRecibidas.length > 0) {
      const partes: string[] = []
      if (solNuevas.length > 0) partes.push(`${solNuevas.length} nueva${solNuevas.length !== 1 ? 's' : ''}`)
      if (solRecibidas.length > 0) partes.push(`${solRecibidas.length} recibida${solRecibidas.length !== 1 ? 's' : ''}`)
      sintesis.push(`Compras: ${partes.join(' y ')}.`)
    }
    if (ric.length > 0 || prev.length > 0 || alim.length > 0) {
      const partes: string[] = []
      if (ric.length > 0) partes.push(`${ric.length} verificación${ric.length !== 1 ? 'es' : ''} RIC`)
      if (prev.length > 0) partes.push(`${prev.length} inspección${prev.length !== 1 ? 'es' : ''} de prevención`)
      if (alim.length > 0) partes.push(`${alim.length} test${alim.length !== 1 ? 's' : ''} de alimentadores`)
      sintesis.push(`Terreno: ${partes.join(', ')}.`)
    }
    if (alertas.length > 0) {
      sintesis.push(`${alertas.length} asunto${alertas.length !== 1 ? 's' : ''} requiere${alertas.length !== 1 ? 'n' : ''} atención: ${alertas.slice(0, 3).map(a => a.texto).join('; ')}.`)
    } else {
      sintesis.push('Sin alertas pendientes al cierre de esta jornada.')
    }
  }

  return {
    fecha,
    sintesis: sintesis.slice(0, 5),
    indicadores,
    avances: avancesTop,
    alertas,
    recomendaciones,
    huboActividad,
  }
}
