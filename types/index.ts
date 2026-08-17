// Tipos que reflejan el esquema de Supabase (PostgreSQL)
import type { CategoriaDocumentoTrabajador } from '@/lib/departamentos/documentosTrabajador'

export interface Categoria {
  id: number
  nombre: string
  color: string
}

export interface Proveedor {
  id: number
  nombre: string
  rut: string | null
  contacto: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  plazo_dias: number
  notas: string | null
  activo: boolean
  creado_en: string
}

export interface Material {
  id: number
  codigo: string
  descripcion: string
  categoria_id: number | null
  unidad: string
  stock_actual: number
  stock_minimo: number
  ubicacion: string | null
  precio_unitario: number
  proveedor_id: number | null
  codigo_barras: string | null
  activo: boolean
  notas: string | null
  creado_en: string
  actualizado_en: string
  // Joins
  categorias?: Categoria | null
  proveedores?: Pick<Proveedor, 'id' | 'nombre'> | null
}

export interface Herramienta {
  id: number
  codigo: string
  descripcion: string
  marca: string | null
  modelo: string | null
  numero_serie: string | null
  estado: 'operativa' | 'en_reparacion' | 'extraviada' | 'dada_de_baja'
  responsable: string | null
  ubicacion: string | null
  fecha_ultima_mant: string | null
  frecuencia_mant_dias: number | null
  notas: string | null
  activo: boolean
  creado_en: string
}

export interface Proyecto {
  id: number
  ot: string
  nombre: string
  cliente: string | null
  descripcion: string | null
  estado: 'presupuesto' | 'en_proceso' | 'terminado' | 'entregado' | 'cancelado'
  fecha_inicio: string | null
  fecha_entrega: string | null
  notas: string | null
  creado_en: string
  // Computed
  costo_total?: number
}

export interface Movimiento {
  id: number
  material_id: number
  tipo: 'entrada' | 'salida' | 'ajuste' | 'devolucion'
  cantidad: number
  stock_antes: number
  stock_despues: number
  proyecto_id: number | null
  usuario: string
  motivo: string | null
  precio_unit: number | null
  fecha: string
  notas: string | null
  // Joins
  materiales?: Pick<Material, 'id' | 'codigo' | 'descripcion' | 'unidad'> | null
  proyectos?: Pick<Proyecto, 'id' | 'ot' | 'nombre'> | null
}

export interface SolicitudCompraItem {
  id: number
  solicitud_id: number
  material_id: number | null
  codigo: string
  descripcion: string
  unidad: string | null
  cantidad_pedida: number
  proveedor_sugerido: string | null
  precio_unitario: number | null
}

export interface SolicitudCompra {
  id: number
  numero: string
  fecha: string
  estado: 'pendiente' | 'comprado'
  observaciones: string | null
  obra: string | null
  supervisor: string | null
  visitador: string | null
  fecha_entrega: string | null
  proyecto_id: number | null
  creado_en: string
  actualizado_en: string
  solicitudes_compra_items?: SolicitudCompraItem[]
  proyectos?: Pick<Proyecto, 'id' | 'ot' | 'nombre'> | null
}

export interface ValeDespachoItem {
  id: number
  vale_id: number
  material_id: number
  codigo: string
  descripcion: string
  unidad: string | null
  cantidad_entregada: number
  precio_unit: number | null
}

export interface ValeDespacho {
  id: number
  numero: string
  fecha: string
  proyecto_id: number | null
  usuario: string
  motivo: string | null
  observaciones: string | null
  creado_en: string
  vales_despacho_items?: ValeDespachoItem[]
  proyectos?: (Pick<Proyecto, 'id' | 'ot' | 'nombre'> & { cliente?: string | null }) | null
}

export type EstadoPedidoBodega = 'pendiente' | 'aprobado' | 'rechazado' | 'despachado' | 'cancelado'

export interface PedidoBodegaItem {
  id: number
  pedido_id: number
  material_id: number | null
  codigo: string
  descripcion: string
  unidad: string | null
  cantidad_pedida: number
}

export interface PedidoBodega {
  id: number
  numero: string
  proyecto_id: number | null
  solicitante_id: string | null
  solicitante_nombre: string
  estado: EstadoPedidoBodega
  observaciones: string | null
  aprobado_por: string | null
  aprobado_por_nombre: string | null
  aprobado_en: string | null
  vale_despacho_id: number | null
  creado_en: string
  actualizado_en: string
  pedidos_bodega_items?: PedidoBodegaItem[]
  proyectos?: Pick<Proyecto, 'id' | 'ot' | 'nombre'> | null
}

export type MotivoAjusteInventario = 'conteo_fisico' | 'perdida' | 'dano' | 'error_registro' | 'otro'
export type EstadoAjusteInventario = 'pendiente' | 'aprobado' | 'rechazado'

export interface SolicitudAjusteInventario {
  id: number
  numero: string
  material_id: number
  codigo: string
  descripcion: string
  stock_actual_sistema: number
  cantidad_reportada: number
  motivo: MotivoAjusteInventario
  observaciones: string | null
  solicitante_id: string | null
  solicitante_nombre: string
  estado: EstadoAjusteInventario
  aprobado_por: string | null
  aprobado_por_nombre: string | null
  aprobado_en: string | null
  movimiento_id: number | null
  creado_en: string
  actualizado_en: string
}

export interface ProyectoMaterial {
  id: number
  proyecto_id: number
  material_id: number | null
  codigo: string
  descripcion: string
  unidad: string
  cantidad_requerida: number
  notas: string | null
}

export interface Trabajador {
  id: number
  nombre: string
  rut: string | null
  cargo: string | null
  telefono: string | null
  activo: boolean
  creado_en: string
}

export interface DocumentoTrabajador {
  id: number
  trabajador_id: number
  proyecto_id: number | null
  categoria: CategoriaDocumentoTrabajador
  titulo: string
  archivo_url: string
  archivo_nombre: string | null
  fecha_documento: string | null
  fecha_vencimiento: string | null
  notas: string | null
  subido_por: string | null
  subido_por_nombre: string | null
  creado_en: string
  proyectos?: Pick<Proyecto, 'id' | 'ot' | 'nombre'> | null
}

export interface EntregaHerramientaItem {
  id: number
  entrega_id: number
  herramienta_id: number
  codigo: string
  descripcion: string
  notas: string | null
}

export interface EntregaHerramienta {
  id: number
  numero: string
  trabajador_id: number | null
  trabajador_nombre: string
  usuario: string
  observaciones: string | null
  fecha: string
  entregas_herramientas_items?: EntregaHerramientaItem[]
  trabajadores?: Pick<Trabajador, 'id' | 'nombre' | 'cargo'> | null
}

export interface DashboardStats {
  totalItems: number
  bajoMinimo: number
  valorInventario: number
  herEnReparacion: number
  herExtraviadas: number
  proyActivos: number
  alertas: Pick<Material, 'id' | 'codigo' | 'descripcion' | 'stock_actual' | 'stock_minimo' | 'ubicacion'>[]
  ultMovimientos: (Movimiento & {
    materiales: Pick<Material, 'codigo' | 'descripcion' | 'unidad'>
    proyectos: Pick<Proyecto, 'ot'> | null
  })[]
}

export interface SolicitudEnrolamiento {
  id: number
  nombre_completo: string
  email: string
  departamento_solicitado: string
  puesto_solicitado: string
  codigo_verificacion: string
  estado: 'pendiente' | 'aprobada' | 'rechazada'
  creado_en: string
  resuelto_en: string | null
  resuelto_por: string | null
}

export interface ProyectoTrabajador {
  id: number
  proyecto_id: number
  trabajador_id: number
  rol_en_obra: string | null
  fecha_asignacion: string
  activo: boolean
  creado_en: string
  trabajadores?: Pick<Trabajador, 'id' | 'nombre' | 'cargo' | 'telefono'> | null
}

export interface AvanceObraItem {
  id: number
  avance_id: number
  orden: number
  etapa: string
  descripcion: string | null
  fecha_estimada: string | null
  completado: boolean
  completado_por: string | null
  completado_por_nombre: string | null
  completado_en: string | null
  creado_en: string
}

export interface AvanceObra {
  id: number
  proyecto_id: number
  creado_por: string | null
  creado_por_nombre: string | null
  notas: string | null
  creado_en: string
  actualizado_en: string
  avances_obra_items?: AvanceObraItem[]
}

export type EstadoTablero = 'por_cubicar' | 'por_armar' | 'armado' | 'en_pruebas' | 'terminado'

// Checklist RIC N°2 de armado de tablero — mismas 3 secciones/26 ítems fijos
// que ya vivían solo en sesión en app/checklist/page.tsx (SECTIONS), ahora
// persistidos por tablero. `checks` guarda el mismo shape que el estado de
// React de esa página: clave `${seccion}_${índice}` → boolean.
export interface TableroChecklist {
  id: number
  tablero_id: number
  checks: Record<string, boolean>
  tecnico: string | null
  fecha_inspeccion: string | null
  observaciones: string | null
  completado_en: string | null
  actualizado_en: string
}

export interface Tablero {
  id: number
  proyecto_id: number
  nombre: string
  amperaje: number | null
  requiere_fat_sat: boolean
  estado: EstadoTablero
  creado_por: string | null
  creado_por_nombre: string | null
  creado_en: string
  actualizado_en: string
  // Joins
  proyectos?: Pick<Proyecto, 'id' | 'ot' | 'nombre'> | null
  tableros_checklist?: TableroChecklist | TableroChecklist[] | null
}

export interface VerificacionRicItem {
  id: number
  verificacion_id: number
  bloque: string
  tipo: 'verificacion' | 'foto' | 'nota'
  orden: number
  texto: string
  resultado: 'pasa' | 'no_pasa' | 'na' | null
  foto_tomada: boolean
  foto_url: string | null
  notas: string | null
  actualizado_en: string
}

export interface VerificacionRic {
  id: number
  numero: string
  proyecto_id: number | null
  proyecto_nombre: string | null
  cliente_mandante: string | null
  ubicacion: string | null
  fecha_visita: string
  inspectores: string | null
  num_tableros: number | null
  estado: 'en_progreso' | 'completa'
  declaracion_conformidad: boolean
  firma_nombre: string | null
  firma_rut: string | null
  firma_cargo: string | null
  firma_imagen_url: string | null
  creado_por: string | null
  creado_en: string
  actualizado_en: string
  verificaciones_ric_items?: VerificacionRicItem[]
}

export interface ChecklistDrsItem {
  id: number
  checklist_id: number
  seccion: string
  tipo: 'medicion' | 'foto'
  orden: number
  etiqueta: string
  referencia: string | null
  valor: string | null
  estado: 'pasa' | 'no_pasa' | 'na' | null
  foto_tomada: boolean
  foto_url: string | null
  editable_fila: boolean
  notas: string | null
  actualizado_en: string
}

export interface ChecklistDrs {
  id: number
  numero: string
  proyecto_id: number | null
  proyecto_nombre: string | null
  cliente_mandante: string | null
  ubicacion: string | null
  fecha_visita: string
  inspectores: string | null
  num_tableros: number | null
  estado: 'en_progreso' | 'completa'
  firma_nombre: string | null
  firma_rut: string | null
  firma_cargo: string | null
  firma_imagen_url: string | null
  creado_por: string | null
  creado_en: string
  actualizado_en: string
  checklists_drs_items?: ChecklistDrsItem[]
}

export interface CatalogoHallazgo {
  id: string
  checklist_n: number | null
  categoria: string | null
  keywords: string[]
  diagnostico: string
  tipo: string | null
  riesgo: string | null
  nivel: 'CRITICO' | 'ALTO' | 'MEDIO' | 'BAJO' | null
  norma: string | null
  medidas_mp: string[]
  medida_texto: string | null
  origen: string | null
  creado_en: string
}

export interface InspeccionPrevencionItem {
  id: number
  inspeccion_id: number
  n: number | null
  item: string
  categoria: string | null
  resultado: 'cumple' | 'no_cumple' | 'na' | null
  detalle: string | null
  nivel: 'CRITICO' | 'ALTO' | 'MEDIO' | 'BAJO' | null
  norma: string | null
  medidas_mp: string[]
  medida_texto: string | null
  responsable: string | null
  plazo: string | null
  catalogo_id: string | null
  foto_url: string | null
  orden: number
  actualizado_en: string
}

export interface InspeccionPrevencion {
  id: number
  numero: string
  proyecto_id: number | null
  centro_trabajo: string
  direccion: string | null
  comuna: string | null
  mandante: string | null
  lugares_inspeccionados: string | null
  fecha: string
  prevencionista: string | null
  dirigido_a: string | null
  n_trabajadores: string | null
  introduccion: string | null
  observaciones_generales: string | null
  firma_prevencionista: string | null
  firma_encargado: string | null
  firma_prevencionista_imagen_url: string | null
  firma_encargado_imagen_url: string | null
  estado: 'en_progreso' | 'completa'
  creado_por: string | null
  creado_en: string
  actualizado_en: string
  inspecciones_prevencion_items?: InspeccionPrevencionItem[]
}

export interface PruebaAlimentadoresItem {
  id: number
  prueba_id: number
  alimentador_id: number
  orden: number
  texto: string
  valor: string | null
  foto_url: string | null
  actualizado_en: string
}

export interface PruebaAlimentadoresAlimentador {
  id: number
  prueba_id: number
  orden: number
  nombre: string
  proteccion_aguas_arriba: string | null
  largo: string | null
  creado_en: string
  actualizado_en: string
  pruebas_alimentadores_items?: PruebaAlimentadoresItem[]
}

export interface PruebaAlimentadores {
  id: number
  numero: string
  proyecto_id: number | null
  proyecto_nombre: string | null
  cliente_mandante: string | null
  ubicacion: string | null
  fecha_visita: string
  inspectores: string | null
  identificacion_alimentador: string | null
  instrumento: string | null
  observaciones: string | null
  estado: 'en_progreso' | 'completa'
  firma_nombre: string | null
  firma_rut: string | null
  firma_cargo: string | null
  firma_imagen_url: string | null
  creado_por: string | null
  creado_en: string
  actualizado_en: string
  pruebas_alimentadores_alimentadores?: PruebaAlimentadoresAlimentador[]
}

export interface ErrorLog {
  id: number
  creado_en: string
  usuario_id: string | null
  usuario: string | null
  departamento: string | null
  archivo: string | null
  mensaje: string
  stack: string | null
  resuelto: boolean
  resuelto_en: string | null
  resuelto_por: string | null
}

export interface Mensaje {
  id: number
  remitente_id: string
  destinatario_id: string
  contenido: string
  leido_en: string | null
  creado_en: string
}

// Fila que devuelve la función SECURITY DEFINER perfiles_directorio() —
// solo lo mínimo para mostrar a un colega en el directorio de mensajería,
// nunca email/nivel_acceso/licencia SEC (ver migration_mensajeria.sql).
export interface PerfilDirectorio {
  id: string
  nombre_completo: string
  departamento: string
  puesto: string
}

// Enlaces públicos (sin login) para que alguien externo llene una
// verificación ya creada — ver lib/enlacesPublicos/modulos.ts.
export type ModuloPublico = 'verificacion_ric' | 'checklist_drs' | 'prevencion_riesgos' | 'pruebas_alimentadores'

export interface EnlacePublico {
  id: number
  token: string
  modulo: ModuloPublico
  registro_id: number
  descripcion: string | null
  activo: boolean
  expira_en: string
  creado_por: string | null
  creado_por_nombre: string | null
  creado_en: string
  ultima_actividad_en: string | null
  completado_en: string | null
  completado_por_nombre: string | null
  completado_por_rut: string | null
}

export type ModuloTarea = 'pruebas_alimentadores' | 'verificacion_ric' | 'prevencion_riesgos' | 'avance_obra'
export type EstadoTarea = 'pendiente' | 'aceptada' | 'rechazada' | 'completada'

export interface TareaAsignada {
  id: number
  asignado_por: string
  asignado_a: string
  titulo: string
  descripcion: string | null
  proyecto_id: number | null
  proyecto_nombre: string | null
  modulo: ModuloTarea | null
  fecha_limite: string | null
  estado: EstadoTarea
  creado_en: string
  respondido_en: string | null
  completado_en: string | null
}
