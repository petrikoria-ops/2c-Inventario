// Tipos que reflejan el esquema de Supabase (PostgreSQL)

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
  creado_en: string
  actualizado_en: string
  solicitudes_compra_items?: SolicitudCompraItem[]
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
