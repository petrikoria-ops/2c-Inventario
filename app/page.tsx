import Link from 'next/link'
import { getSupabaseServer } from '@/lib/supabase/server'
import { num } from '@/lib/utils'
import {
  PackageOpen, ShoppingCart, ArrowUpDown, Package,
  ClipboardList, Wrench, AlertTriangle, CheckCircle,
  Calculator, CheckSquare, Tag, Handshake, HardHat, Users, Bot,
  type LucideIcon,
} from 'lucide-react'

export const dynamic   = 'force-dynamic'
export const revalidate = 0

const ACCIONES: { href: string; Icon: LucideIcon; title: string; desc: string; color: string }[] = [
  { href: '/salidas/nueva',     Icon: PackageOpen,    title: 'Nuevo despacho',       desc: 'Registrar salida de materiales',    color: 'bg-blue-600'    },
  { href: '/entregas/nueva',    Icon: Handshake,      title: 'Entrega por mano',     desc: 'Sin proyecto, descuenta stock',     color: 'bg-cyan-700'    },
  { href: '/solicitudes/nueva', Icon: ShoppingCart,   title: 'Solicitud de compra',  desc: 'Pedir materiales al proveedor',     color: 'bg-emerald-600' },
  { href: '/movimientos',       Icon: ArrowUpDown,    title: 'Movimiento',           desc: 'Entrada, ajuste o devolución',      color: 'bg-violet-600'  },
  { href: '/materiales',        Icon: Package,        title: 'Inventario General',   desc: 'Ver y gestionar materiales',        color: 'bg-slate-600'   },
  { href: '/proyectos',         Icon: ClipboardList,  title: 'Obras activas',        desc: 'Tableros y factibilidad de obra',  color: 'bg-amber-600'   },
  { href: '/herramientas',      Icon: Wrench,         title: 'Herramientas',         desc: 'Estado y ubicación de equipos',     color: 'bg-rose-600'    },
  { href: '/recursos',          Icon: Calculator,     title: 'Recursos Técnicos',    desc: 'Calculadoras eléctricas y normas',  color: 'bg-indigo-600'  },
  { href: '/checklist',         Icon: CheckSquare,    title: 'Checklist tablero',    desc: 'Verificación eléctrica imprimible', color: 'bg-teal-600'    },
  { href: '/etiquetas',          Icon: Tag,            title: 'Etiquetas de obra',    desc: 'Pallets y bultos imprimibles',       color: 'bg-yellow-600'  },
  { href: '/herramientas/entregar', Icon: HardHat,   title: 'Entregar herramientas', desc: 'Comprobante + actualiza responsable', color: 'bg-orange-700'  },
  { href: '/trabajadores',      Icon: Users,          title: 'Trabajadores',         desc: 'Personal asignado a herramientas',   color: 'bg-slate-500'   },
  { href: '/agente',            Icon: Bot,            title: 'Agente IA',            desc: 'Consultas en lenguaje natural',       color: 'bg-purple-600'  },
]

export default async function HomePage() {
  const sb = getSupabaseServer()

  const [
    { data: materiales },
    { count: proyActivos },
    solicRes,
  ] = await Promise.all([
    sb.from('materiales').select('stock_actual,stock_minimo').eq('activo', true),
    sb.from('proyectos').select('*', { count: 'exact', head: true }).eq('estado', 'en_proceso'),
    sb.from('solicitudes_compra').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente'),
  ])

  const alertas   = (materiales ?? []).filter(m => m.stock_actual <= m.stock_minimo).length
  const solicPend = solicRes.error ? 0 : (solicRes.count ?? 0)

  return (
    <div className="p-5 max-w-4xl">
      {/* Cabecera */}
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: '#2E333A' }}>2C Montajes y Proyectos Eléctricos</h1>
        <p className="text-sm text-slate-500">Inventario General</p>
      </div>

      {/* Alerta de stock */}
      {alertas > 0 && (
        <div className="alert alert-red mb-5">
          <AlertTriangle size={15} />
          {alertas} material{alertas !== 1 ? 'es' : ''} bajo stock mínimo.{' '}
          <a href="/materiales?bajo_minimo=1" className="underline font-semibold">Ver ahora →</a>
        </div>
      )}

      {/* Acciones rápidas */}
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Acciones rápidas</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {ACCIONES.map(a => (
          <Link key={a.href} href={a.href}
            className="flex flex-col gap-1.5 p-4 bg-white rounded-xl shadow-sm border border-slate-100
                       hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 group">
            <div className={`w-10 h-10 ${a.color} rounded-lg flex items-center justify-center text-white mb-1 flex-shrink-0`}>
              <a.Icon size={20} />
            </div>
            <div className="font-semibold text-slate-800 text-sm group-hover:text-blue-700 transition-colors leading-tight">
              {a.title}
            </div>
            <div className="text-xs text-slate-400 leading-snug">{a.desc}</div>
          </Link>
        ))}
      </div>

      {/* Mini stats */}
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Estado actual</h2>
      <div className="grid grid-cols-3 gap-3">
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
    </div>
  )
}
