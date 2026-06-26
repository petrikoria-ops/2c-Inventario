// Fuente única de verdad de la EXPERIENCIA de cada departamento.
//
// El control de acceso vive en lib/auth/permisos.ts (qué puede ver/editar
// cada perfil). Esto es la otra cara: cómo se SIENTE cada área cuando entra
// a la app — su identidad visual, sus tareas frecuentes ("listo para
// resolver") y sus herramientas agrupadas con sentido. La home (app/page.tsx)
// lee este archivo y arma el "cockpit" del departamento mostrado, filtrando
// cada acción/herramienta por puedeVer() del perfil efectivo.
//
// Solo datos + referencias a iconos de lucide — sin next/headers ni Supabase,
// así se puede importar desde Server o Client Components.

import type { LucideIcon } from 'lucide-react'
import type { Departamento, Modulo } from '@/lib/auth/permisos'
import {
  PackageOpen, Handshake, ArrowUpDown, ShoppingCart, HardHat, Tag,
  Package, Wrench, Users, Upload, Building2, ClipboardList,
  Calculator, CheckSquare, Bot,
  ShieldCheck, BarChart3, Warehouse, Hammer,
  DraftingCompass, HeartPulse, Crown, LayoutGrid, FileBarChart,
} from 'lucide-react'

export interface AccionRapida {
  href: string
  Icon: LucideIcon
  titulo: string
  desc: string
  modulo: Modulo
  /** color de acento de la tarjeta (hex) */
  acento: string
}

export interface ItemHerramienta {
  href: string
  Icon: LucideIcon
  titulo: string
  desc: string
  modulo: Modulo
}

export interface SeccionHerramientas {
  titulo: string
  items: ItemHerramienta[]
}

export interface DeptConfig {
  /** clave del departamento, o 'general' para admin/sin perfil */
  slug: Departamento | 'general'
  nombre: string
  /** una línea: la misión del área, lo que se resuelve aquí */
  lema: string
  Icon: LucideIcon
  /** gradiente de la cabecera [desde, hasta] */
  grad: [string, string]
  /** color de acento del área (chips, barras, dots) */
  acento: string
  acciones: AccionRapida[]
  herramientas: SeccionHerramientas[]
}

// Acentos reutilizables para las acciones rápidas
const A = {
  azul: '#2563EB', cian: '#0E7490', violeta: '#7C3AED', verde: '#059669',
  naranja: '#EA580C', ambar: '#D97706', indigo: '#4F46E5', rosa: '#E11D48',
  pizarra: '#475569', oro: '#C9A000', teal: '#0D9488',
}

// ── Bodega ──────────────────────────────────────────────────────
const BODEGA: DeptConfig = {
  slug: 'bodega',
  nombre: 'Bodega',
  lema: 'El corazón logístico de 2C — stock, despachos y herramientas siempre al día.',
  Icon: Warehouse,
  grad: ['#1E3A8A', '#2563EB'],
  acento: A.azul,
  acciones: [
    { href: '/salidas/nueva',         Icon: PackageOpen, titulo: 'Nuevo despacho',        desc: 'Salida de materiales a una obra',     modulo: 'movimientos',  acento: A.azul },
    { href: '/entregas/nueva',        Icon: Handshake,   titulo: 'Entrega por mano',      desc: 'Sin proyecto, descuenta stock',       modulo: 'movimientos',  acento: A.cian },
    { href: '/movimientos',           Icon: ArrowUpDown, titulo: 'Registrar movimiento',  desc: 'Entrada, ajuste o devolución',        modulo: 'movimientos',  acento: A.violeta },
    { href: '/solicitudes/nueva',     Icon: ShoppingCart,titulo: 'Solicitud de compra',   desc: 'Pedir material al proveedor',         modulo: 'compras',      acento: A.verde },
    { href: '/herramientas/entregar', Icon: HardHat,     titulo: 'Entregar herramientas', desc: 'Comprobante + responsable',           modulo: 'herramientas', acento: A.naranja },
    { href: '/etiquetas',             Icon: Tag,         titulo: 'Imprimir etiqueta',     desc: 'Pallets, racks y cajones',            modulo: 'etiquetas',    acento: A.ambar },
  ],
  herramientas: [
    { titulo: 'Inventario', items: [
      { href: '/materiales',   Icon: Package, titulo: 'Materiales',   desc: 'Stock, precios y ubicaciones', modulo: 'materiales' },
      { href: '/herramientas', Icon: Wrench,  titulo: 'Herramientas', desc: 'Estado y ubicación de equipos', modulo: 'herramientas' },
      { href: '/importar',     Icon: Upload,  titulo: 'Importar',     desc: 'Carga masiva desde Excel/CSV', modulo: 'materiales' },
    ]},
    { titulo: 'Operación diaria', items: [
      { href: '/salidas',      Icon: PackageOpen, titulo: 'Despachos',   desc: 'Vales de despacho VD-AAAA', modulo: 'movimientos' },
      { href: '/movimientos',  Icon: ArrowUpDown, titulo: 'Movimientos', desc: 'Historial de entradas y salidas', modulo: 'movimientos' },
    ]},
    { titulo: 'Compras', items: [
      { href: '/solicitudes', Icon: ShoppingCart, titulo: 'Compras',     desc: 'Solicitudes SC-AAAA', modulo: 'compras' },
      { href: '/proveedores', Icon: Building2,    titulo: 'Proveedores', desc: 'Contactos y catálogo', modulo: 'proveedores' },
    ]},
    { titulo: 'Apoyo', items: [
      { href: '/trabajadores', Icon: Users, titulo: 'Trabajadores', desc: 'Personal y herramientas asignadas', modulo: 'trabajadores' },
      { href: '/agente',       Icon: Bot,   titulo: 'Agente IA',    desc: 'Pregunta por stock en lenguaje natural', modulo: 'agente' },
    ]},
  ],
}

// ── Taller ──────────────────────────────────────────────────────
const TALLER: DeptConfig = {
  slug: 'taller',
  nombre: 'Taller',
  lema: 'Donde se arman los tableros — obras, equipos y control de calidad.',
  Icon: Hammer,
  grad: ['#B45309', '#F59E0B'],
  acento: A.ambar,
  acciones: [
    { href: '/herramientas/entregar', Icon: HardHat,     titulo: 'Entregar herramientas', desc: 'Asignar equipo a un trabajador', modulo: 'herramientas', acento: A.naranja },
    { href: '/checklist',             Icon: CheckSquare, titulo: 'Checklist tablero',     desc: 'Verificación antes de entregar', modulo: 'checklist',    acento: A.teal },
    { href: '/proyectos',             Icon: ClipboardList,titulo: 'Obras activas',        desc: 'Tableros en proceso y entregas', modulo: 'proyectos',    acento: A.ambar },
    { href: '/etiquetas',             Icon: Tag,         titulo: 'Etiquetas de obra',     desc: 'Identificar bultos y tableros',  modulo: 'etiquetas',    acento: A.oro },
    { href: '/recursos',              Icon: Calculator,  titulo: 'Recursos técnicos',     desc: 'Calculadoras eléctricas',        modulo: 'recursos_tecnicos', acento: A.indigo },
  ],
  herramientas: [
    { titulo: 'Producción', items: [
      { href: '/proyectos', Icon: ClipboardList, titulo: 'Obras activas',     desc: 'Tableros y factibilidad', modulo: 'proyectos' },
      { href: '/checklist', Icon: CheckSquare,   titulo: 'Checklist tablero', desc: 'Armado y pruebas', modulo: 'checklist' },
      { href: '/etiquetas', Icon: Tag,           titulo: 'Etiquetas de obra', desc: 'Pallets y bultos imprimibles', modulo: 'etiquetas' },
    ]},
    { titulo: 'Equipos', items: [
      { href: '/herramientas',          Icon: Wrench,  titulo: 'Herramientas',         desc: 'Estado y mantención', modulo: 'herramientas' },
      { href: '/herramientas/entregar', Icon: HardHat, titulo: 'Entregar herramientas', desc: 'Comprobante EH-AAAA', modulo: 'herramientas' },
    ]},
    { titulo: 'Apoyo', items: [
      { href: '/materiales',  Icon: Package,     titulo: 'Materiales',       desc: 'Consulta de stock', modulo: 'materiales' },
      { href: '/recursos',    Icon: Calculator,  titulo: 'Recursos técnicos', desc: 'Cálculos eléctricos', modulo: 'recursos_tecnicos' },
      { href: '/agente',      Icon: Bot,         titulo: 'Agente IA',        desc: 'Consultas rápidas', modulo: 'agente' },
    ]},
  ],
}

// ── Oficina Técnica ─────────────────────────────────────────────
const OFICINA_TECNICA: DeptConfig = {
  slug: 'oficina_tecnica',
  nombre: 'Oficina Técnica',
  lema: 'Proyectos, factibilidad y compras técnicas — el cerebro de cada obra.',
  Icon: DraftingCompass,
  grad: ['#3730A3', '#6366F1'],
  acento: A.indigo,
  acciones: [
    { href: '/proyectos',         Icon: ClipboardList, titulo: 'Obras activas',     desc: 'Crear y seguir proyectos OT', modulo: 'proyectos', acento: A.ambar },
    { href: '/solicitudes/nueva', Icon: ShoppingCart,  titulo: 'Solicitud de compra', desc: 'Pedir material para una obra', modulo: 'compras', acento: A.verde },
    { href: '/recursos',          Icon: Calculator,    titulo: 'Recursos técnicos', desc: 'Cargas, caídas de tensión', modulo: 'recursos_tecnicos', acento: A.indigo },
    { href: '/materiales',        Icon: Package,       titulo: 'Consultar stock',   desc: 'Factibilidad de material', modulo: 'materiales', acento: A.pizarra },
  ],
  herramientas: [
    { titulo: 'Proyectos', items: [
      { href: '/proyectos',   Icon: ClipboardList, titulo: 'Obras activas', desc: 'Estados y factibilidad', modulo: 'proyectos' },
      { href: '/solicitudes', Icon: ShoppingCart,  titulo: 'Compras',       desc: 'Solicitudes de material', modulo: 'compras' },
    ]},
    { titulo: 'Técnico', items: [
      { href: '/recursos',    Icon: Calculator, titulo: 'Recursos técnicos', desc: 'Calculadoras eléctricas', modulo: 'recursos_tecnicos' },
      { href: '/materiales',  Icon: Package,    titulo: 'Materiales',        desc: 'Stock para factibilidad', modulo: 'materiales' },
      { href: '/proveedores', Icon: Building2,  titulo: 'Proveedores',       desc: 'Catálogo y contactos', modulo: 'proveedores' },
    ]},
    { titulo: 'Apoyo', items: [
      { href: '/agente', Icon: Bot, titulo: 'Agente IA', desc: 'Consultas en lenguaje natural', modulo: 'agente' },
    ]},
  ],
}

// ── Prevención ──────────────────────────────────────────────────
const PREVENCION: DeptConfig = {
  slug: 'prevencion',
  nombre: 'Prevención',
  lema: 'Seguridad primero — verificación de tableros, normas y control de equipos.',
  Icon: ShieldCheck,
  grad: ['#047857', '#10B981'],
  acento: A.verde,
  acciones: [
    { href: '/checklist',   Icon: CheckSquare, titulo: 'Checklist tablero', desc: 'Verificación eléctrica imprimible', modulo: 'checklist', acento: A.teal },
    { href: '/recursos',    Icon: Calculator,  titulo: 'Recursos técnicos', desc: 'Normas y cálculos de respaldo', modulo: 'recursos_tecnicos', acento: A.indigo },
    { href: '/herramientas',Icon: Wrench,      titulo: 'Estado de equipos', desc: 'Mantención y equipos con problema', modulo: 'herramientas', acento: A.naranja },
  ],
  herramientas: [
    { titulo: 'Seguridad', items: [
      { href: '/checklist', Icon: CheckSquare, titulo: 'Checklist tablero', desc: 'Armado y pruebas por obra', modulo: 'checklist' },
      { href: '/recursos',  Icon: Calculator,  titulo: 'Recursos técnicos', desc: 'Normativa de respaldo', modulo: 'recursos_tecnicos' },
    ]},
    { titulo: 'Control', items: [
      { href: '/herramientas', Icon: Wrench, titulo: 'Herramientas', desc: 'Estado y mantención (lectura)', modulo: 'herramientas' },
    ]},
  ],
}

// ── Recursos Humanos ────────────────────────────────────────────
const RRHH: DeptConfig = {
  slug: 'rrhh',
  nombre: 'Recursos Humanos',
  lema: 'Las personas de 2C — fichas, asignaciones y equipos a cargo de cada trabajador.',
  Icon: HeartPulse,
  grad: ['#9D174D', '#EC4899'],
  acento: A.rosa,
  acciones: [
    { href: '/trabajadores', Icon: Users, titulo: 'Trabajadores', desc: 'Ficha del personal activo', modulo: 'trabajadores', acento: A.rosa },
  ],
  herramientas: [
    { titulo: 'Personas', items: [
      { href: '/trabajadores', Icon: Users, titulo: 'Trabajadores', desc: 'Alta, edición y herramientas asignadas', modulo: 'trabajadores' },
    ]},
  ],
}

// ── Directiva ───────────────────────────────────────────────────
const DIRECTIVA: DeptConfig = {
  slug: 'directiva',
  nombre: 'Directiva',
  lema: 'La visión global de 2C — métricas, control y estado de toda la empresa.',
  Icon: Crown,
  grad: ['#2E333A', '#C9A000'],
  acento: A.oro,
  acciones: [
    { href: '/dashboard',  Icon: BarChart3,    titulo: 'Métricas',       desc: 'Indicadores de toda la empresa', modulo: 'metricas', acento: A.oro },
    { href: '/proyectos',  Icon: ClipboardList,titulo: 'Obras activas',  desc: 'Estado de cada proyecto', modulo: 'proyectos', acento: A.ambar },
    { href: '/agente',     Icon: Bot,          titulo: 'Agente IA',      desc: 'Pregunta por el negocio', modulo: 'agente', acento: A.violeta },
    { href: '/materiales', Icon: Package,      titulo: 'Inventario',     desc: 'Valor y existencias', modulo: 'materiales', acento: A.pizarra },
  ],
  herramientas: [
    { titulo: 'Control', items: [
      { href: '/dashboard',  Icon: FileBarChart, titulo: 'Métricas',      desc: 'KPIs y gráficos', modulo: 'metricas' },
      { href: '/proyectos',  Icon: ClipboardList,titulo: 'Obras activas', desc: 'Seguimiento de obras', modulo: 'proyectos' },
      { href: '/agente',     Icon: Bot,          titulo: 'Agente IA',     desc: 'Consultas del negocio', modulo: 'agente' },
    ]},
    { titulo: 'Inventario y compras', items: [
      { href: '/materiales',  Icon: Package,      titulo: 'Materiales',   desc: 'Existencias y valor', modulo: 'materiales' },
      { href: '/herramientas',Icon: Wrench,       titulo: 'Herramientas', desc: 'Equipos de la empresa', modulo: 'herramientas' },
      { href: '/solicitudes', Icon: ShoppingCart, titulo: 'Compras',      desc: 'Solicitudes de material', modulo: 'compras' },
    ]},
    { titulo: 'Personas', items: [
      { href: '/trabajadores', Icon: Users, titulo: 'Trabajadores', desc: 'Personal de la empresa', modulo: 'trabajadores' },
    ]},
  ],
}

// ── Vista general (admin de software / sin perfil) ──────────────
const GENERAL: DeptConfig = {
  slug: 'general',
  nombre: 'Centro de operaciones',
  lema: 'Toda la operación de 2C en un solo lugar — elige un área para entrar a su panel.',
  Icon: LayoutGrid,
  grad: ['#2E333A', '#475569'],
  acento: A.oro,
  acciones: [
    { href: '/salidas/nueva',     Icon: PackageOpen,  titulo: 'Nuevo despacho',      desc: 'Salida de materiales',     modulo: 'movimientos', acento: A.azul },
    { href: '/herramientas/entregar', Icon: HardHat,  titulo: 'Entregar herramientas', desc: 'Comprobante + responsable', modulo: 'herramientas', acento: A.naranja },
    { href: '/proyectos',         Icon: ClipboardList,titulo: 'Obras activas',       desc: 'Proyectos en proceso',     modulo: 'proyectos', acento: A.ambar },
    { href: '/dashboard',         Icon: BarChart3,    titulo: 'Métricas',            desc: 'Estado global',            modulo: 'metricas', acento: A.oro },
    { href: '/solicitudes/nueva', Icon: ShoppingCart, titulo: 'Solicitud de compra', desc: 'Pedir material',           modulo: 'compras', acento: A.verde },
    { href: '/agente',            Icon: Bot,          titulo: 'Agente IA',           desc: 'Consultas del negocio',    modulo: 'agente', acento: A.violeta },
  ],
  herramientas: [
    { titulo: 'Inventario', items: [
      { href: '/materiales',   Icon: Package, titulo: 'Materiales',   desc: 'Stock y precios', modulo: 'materiales' },
      { href: '/herramientas', Icon: Wrench,  titulo: 'Herramientas', desc: 'Equipos', modulo: 'herramientas' },
      { href: '/importar',     Icon: Upload,  titulo: 'Importar',     desc: 'Carga masiva', modulo: 'materiales' },
      { href: '/trabajadores', Icon: Users,   titulo: 'Trabajadores', desc: 'Personal', modulo: 'trabajadores' },
    ]},
    { titulo: 'Operación', items: [
      { href: '/salidas',     Icon: PackageOpen, titulo: 'Despachos',   desc: 'Vales VD', modulo: 'movimientos' },
      { href: '/movimientos', Icon: ArrowUpDown, titulo: 'Movimientos', desc: 'Historial', modulo: 'movimientos' },
      { href: '/entregas/nueva', Icon: Handshake,titulo: 'Entrega por mano', desc: 'Sin proyecto', modulo: 'movimientos' },
    ]},
    { titulo: 'Gestión', items: [
      { href: '/proyectos',   Icon: ClipboardList, titulo: 'Obras activas', desc: 'Tableros', modulo: 'proyectos' },
      { href: '/solicitudes', Icon: ShoppingCart,  titulo: 'Compras',       desc: 'Solicitudes', modulo: 'compras' },
      { href: '/proveedores', Icon: Building2,     titulo: 'Proveedores',   desc: 'Catálogo', modulo: 'proveedores' },
    ]},
    { titulo: 'Recursos', items: [
      { href: '/recursos',  Icon: Calculator,  titulo: 'Recursos técnicos', desc: 'Calculadoras', modulo: 'recursos_tecnicos' },
      { href: '/checklist', Icon: CheckSquare, titulo: 'Checklist tablero', desc: 'Verificación', modulo: 'checklist' },
      { href: '/etiquetas', Icon: Tag,         titulo: 'Etiquetas de obra', desc: 'Imprimibles', modulo: 'etiquetas' },
      { href: '/agente',    Icon: Bot,         titulo: 'Agente IA',         desc: 'Consultas', modulo: 'agente' },
    ]},
  ],
}

export const DEPT_CONFIG: Record<Departamento, DeptConfig> = {
  bodega: BODEGA,
  taller: TALLER,
  oficina_tecnica: OFICINA_TECNICA,
  prevencion: PREVENCION,
  rrhh: RRHH,
  directiva: DIRECTIVA,
  admin_software: GENERAL,
}

export const CONFIG_GENERAL = GENERAL

export function getDeptConfig(depto: Departamento | undefined | null): DeptConfig {
  if (!depto) return GENERAL
  return DEPT_CONFIG[depto] ?? GENERAL
}
