import Link from 'next/link'
import Image from 'next/image'
import { getSupabaseServer } from '@/lib/supabase/server'
import { fetchAllMateriales } from '@/lib/supabase/fetchAll'
import { num, estaBajoMinimo } from '@/lib/utils'
import { getPerfil, puedeVer, type Modulo, type Departamento, type Perfil } from '@/lib/auth/permisos.server'
import WidgetBodega from '@/components/hub/WidgetBodega'
import WidgetTaller from '@/components/hub/WidgetTaller'
import WidgetOficinaTecnica from '@/components/hub/WidgetOficinaTecnica'
import WidgetPrevencion from '@/components/hub/WidgetPrevencion'
import WidgetRRHH from '@/components/hub/WidgetRRHH'
import WidgetDirectiva from '@/components/hub/WidgetDirectiva'
import {
  PackageOpen, ShoppingCart, ArrowUpDown, Package,
  ClipboardList, Wrench, AlertTriangle, CheckCircle,
  Calculator, CheckSquare, Tag, Handshake, HardHat, Users, Bot, Eye,
  type LucideIcon,
} from 'lucide-react'

export const dynamic   = 'force-dynamic'
export const revalidate = 0

interface Accion { href: string; Icon: LucideIcon; title: string; desc: string; color: string; modulo: Modulo }
interface Grupo  { titulo: string; acciones: Accion[] }

const GRUPOS: Grupo[] = [
  {
    titulo: 'Operación diaria',
    acciones: [
      { href: '/salidas/nueva',     Icon: PackageOpen,  title: 'Nuevo despacho',       desc: 'Registrar salida de materiales',     color: 'bg-blue-600',    modulo: 'movimientos' },
      { href: '/entregas/nueva',    Icon: Handshake,    title: 'Entrega por mano',     desc: 'Sin proyecto, descuenta stock',      color: 'bg-cyan-700',    modulo: 'movimientos' },
      { href: '/movimientos',       Icon: ArrowUpDown,  title: 'Movimiento',           desc: 'Entrada, ajuste o devolución',       color: 'bg-violet-600',  modulo: 'movimientos' },
      { href: '/solicitudes/nueva', Icon: ShoppingCart, title: 'Solicitud de compra',  desc: 'Pedir materiales al proveedor',      color: 'bg-emerald-600', modulo: 'compras' },
      { href: '/herramientas/entregar', Icon: HardHat,  title: 'Entregar herramientas', desc: 'Comprobante + actualiza responsable', color: 'bg-orange-700', modulo: 'herramientas' },
    ],
  },
  {
    titulo: 'Inventario y obras',
    acciones: [
      { href: '/materiales',   Icon: Package,       title: 'Inventario General', desc: 'Ver y gestionar materiales',       color: 'bg-slate-600', modulo: 'materiales' },
      { href: '/herramientas', Icon: Wrench,        title: 'Herramientas',       desc: 'Estado y ubicación de equipos',    color: 'bg-rose-600',  modulo: 'herramientas' },
      { href: '/proyectos',    Icon: ClipboardList, title: 'Obras activas',      desc: 'Tableros y factibilidad de obra',  color: 'bg-amber-600', modulo: 'proyectos' },
      { href: '/trabajadores', Icon: Users,         title: 'Trabajadores',       desc: 'Personal asignado a herramientas', color: 'bg-slate-500', modulo: 'trabajadores' },
    ],
  },
  {
    titulo: 'Recursos',
    acciones: [
      { href: '/recursos',  Icon: Calculator,  title: 'Recursos Técnicos', desc: 'Calculadoras eléctricas y normas',  color: 'bg-indigo-600', modulo: 'recursos_tecnicos' },
      { href: '/checklist', Icon: CheckSquare, title: 'Checklist tablero', desc: 'Verificación eléctrica imprimible', color: 'bg-teal-600',   modulo: 'checklist' },
      { href: '/etiquetas', Icon: Tag,         title: 'Etiquetas de obra', desc: 'Pallets y bultos imprimibles',      color: 'bg-yellow-600', modulo: 'etiquetas' },
      { href: '/agente',    Icon: Bot,         title: 'Agente IA',         desc: 'Consultas en lenguaje natural',     color: 'bg-purple-600', modulo: 'agente' },
    ],
  },
]

const NOMBRE_DEPARTAMENTO: Record<string, string> = {
  bodega: 'Bodega', taller: 'Taller', oficina_tecnica: 'Oficina Técnica',
  prevencion: 'Prevención', rrhh: 'Recursos Humanos', directiva: 'Directiva',
  admin_software: 'Administración de software',
}

// Departamentos operativos previsualizables desde el hub de
// admin_software/master — admin_software en sí no es un departamento
// con herramientas propias, no aparece en el selector.
const DEPARTAMENTOS_OPERATIVOS: Departamento[] = ['bodega', 'taller', 'oficina_tecnica', 'prevencion', 'rrhh', 'directiva']

const WIDGETS: Record<Departamento, (() => Promise<JSX.Element>) | null> = {
  bodega: WidgetBodega,
  taller: WidgetTaller,
  oficina_tecnica: WidgetOficinaTecnica,
  prevencion: WidgetPrevencion,
  rrhh: WidgetRRHH,
  directiva: WidgetDirectiva,
  admin_software: null,
}

export default async function HomePage({ searchParams }: { searchParams: { depto?: string } }) {
  const sb = getSupabaseServer()
  const perfil = await getPerfil()

  const esAdminTotal = perfil?.nivel_acceso === 'master' || perfil?.nivel_acceso === 'admin_software'
  const deptoParam = searchParams?.depto as Departamento | undefined
  const deptoPreview = esAdminTotal && deptoParam && DEPARTAMENTOS_OPERATIVOS.includes(deptoParam) ? deptoParam : undefined

  // Para decidir qué accesos/herramientas mostrar se usa un perfil
  // "efectivo": el real, o uno simulado con el departamento elegido en
  // el selector (solo admin_software/master pueden simularlo). Esto no
  // cambia los permisos reales de edición — esos siguen siendo los del
  // perfil real vía requireEditable() en cada API.
  const perfilEfectivo: Perfil | null = deptoPreview && perfil
    ? { ...perfil, departamento: deptoPreview, nivel_acceso: 'jefe_departamento' }
    : perfil

  const departamentoMostrado = deptoPreview ?? perfil?.departamento

  const [
    materiales,
    { count: proyActivos },
    solicRes,
  ] = await Promise.all([
    fetchAllMateriales<{ stock_actual: number; stock_minimo: number }>(sb, 'stock_actual,stock_minimo'),
    sb.from('proyectos').select('*', { count: 'exact', head: true }).eq('estado', 'en_proceso'),
    sb.from('solicitudes_compra').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente'),
  ])

  const alertas   = materiales.filter(m => estaBajoMinimo(m.stock_actual, m.stock_minimo)).length
  const solicPend = solicRes.error ? 0 : (solicRes.count ?? 0)

  // Sin perfil (no debería pasar — el middleware ya redirige a
  // /pendiente-aprobacion) se ve todo, igual que antes de tener roles.
  const grupos = GRUPOS
    .map(g => ({ ...g, acciones: g.acciones.filter(a => !perfilEfectivo || puedeVer(perfilEfectivo, a.modulo)) }))
    .filter(g => g.acciones.length > 0)

  const Widget = departamentoMostrado ? WIDGETS[departamentoMostrado as Departamento] : null

  return (
    <div className="p-5 md:p-7 w-full">
      {/* Cabecera */}
      <div className="flex items-center gap-3 mb-6">
        <div className="hidden md:flex w-11 h-11 rounded-xl items-center justify-center flex-shrink-0 overflow-hidden bg-white border" style={{ borderColor: '#E8EAED' }}>
          <Image src="/logo-2c.png" alt="2C Montajes" width={28} height={28} style={{ width: 28, height: 28, objectFit: 'contain' }} priority />
        </div>
        <div>
          <h1 className="text-xl font-bold leading-tight" style={{ color: '#2E333A' }}>2C Montajes y Proyectos Eléctricos</h1>
          <p className="text-sm text-slate-500">
            {perfil ? `${NOMBRE_DEPARTAMENTO[perfil.departamento] ?? perfil.departamento} — ${perfil.puesto}` : 'Inventario General'}
          </p>
        </div>
      </div>

      {/* Selector de departamento — solo admin_software/master, para
          previsualizar y operar el hub de cualquier área. */}
      {esAdminTotal && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Eye size={13} /> Ver como:
          </span>
          <Link href="/" className={`btn btn-sm ${!deptoPreview ? 'btn-secondary' : 'btn-outline'}`}>
            {NOMBRE_DEPARTAMENTO[perfil!.departamento] ?? 'Mi vista'}
          </Link>
          {DEPARTAMENTOS_OPERATIVOS.filter(d => d !== perfil!.departamento).map(d => (
            <Link key={d} href={`/?depto=${d}`} className={`btn btn-sm ${deptoPreview === d ? 'btn-secondary' : 'btn-outline'}`}>
              {NOMBRE_DEPARTAMENTO[d]}
            </Link>
          ))}
        </div>
      )}

      {/* Alerta de stock */}
      {alertas > 0 && (
        <div className="alert alert-red mb-6">
          <AlertTriangle size={15} />
          {alertas} material{alertas !== 1 ? 'es' : ''} bajo stock mínimo.{' '}
          <a href="/materiales?bajo_minimo=1" className="underline font-semibold">Ver ahora →</a>
        </div>
      )}

      {/* Estado actual — primero los números, antes de las acciones */}
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Estado actual</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 max-w-2xl">
        <div className={`stat-card ${alertas > 0 ? 'ring-2 ring-red-200' : ''}`}>
          <div className={`stat-icon flex items-center justify-center ${alertas > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
            {alertas > 0
              ? <AlertTriangle size={18} style={{ color: '#DC2626' }} />
              : <CheckCircle  size={18} style={{ color: '#059669' }} />
            }
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800 leading-tight">{num(alertas, 0)}</div>
            <div className="text-xs text-slate-500 font-medium">Alertas stock</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon flex items-center justify-center bg-yellow-100">
            <ClipboardList size={18} style={{ color: '#D97706' }} />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800 leading-tight">{num(proyActivos ?? 0, 0)}</div>
            <div className="text-xs text-slate-500 font-medium">Proy. activos</div>
          </div>
        </div>

        <div className="stat-card">
          <div className={`stat-icon flex items-center justify-center ${solicPend > 0 ? 'bg-orange-100' : 'bg-slate-100'}`}>
            <ShoppingCart size={18} style={{ color: solicPend > 0 ? '#EA580C' : '#909090' }} />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800 leading-tight">{num(solicPend, 0)}</div>
            <div className="text-xs text-slate-500 font-medium">Compras pend.</div>
          </div>
        </div>
      </div>

      {/* Herramientas propias del departamento — el "hub personalizado" */}
      {Widget && (
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
            Herramientas de {NOMBRE_DEPARTAMENTO[departamentoMostrado as string] ?? ''}
          </h2>
          <Widget />
        </div>
      )}

      {/* Accesos agrupados por tipo de tarea, en vez de una sola grilla plana */}
      {grupos.map(grupo => (
        <div key={grupo.titulo} className="mb-8">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">{grupo.titulo}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {grupo.acciones.map(a => (
              <Link key={a.href} href={a.href}
                className="flex flex-col gap-1.5 p-4 bg-white rounded-2xl border shadow-[var(--shadow-sm)]
                           hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] transition-all duration-200 group"
                style={{ borderColor: '#E8EAED' }}
              >
                <div className={`w-10 h-10 ${a.color} rounded-lg flex items-center justify-center text-white mb-1 flex-shrink-0 transition-transform duration-200 group-hover:scale-105`}>
                  <a.Icon size={20} />
                </div>
                <div className="font-semibold text-slate-800 text-sm group-hover:text-blue-700 transition-colors leading-tight">
                  {a.title}
                </div>
                <div className="text-xs text-slate-400 leading-snug">{a.desc}</div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
