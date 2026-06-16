import Link from 'next/link'
import { getSupabaseServer } from '@/lib/supabase/server'
import { num } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const ACCIONES = [
  { href: '/salidas/nueva',     icon: '📤', title: 'Nuevo despacho',       desc: 'Registrar salida de materiales',    color: 'bg-blue-600'    },
  { href: '/solicitudes/nueva', icon: '🛒', title: 'Solicitud de compra',  desc: 'Pedir materiales al proveedor',      color: 'bg-emerald-600' },
  { href: '/movimientos',       icon: '↕️', title: 'Movimiento',           desc: 'Entrada, ajuste o devolución',       color: 'bg-violet-600'  },
  { href: '/materiales',        icon: '🔌', title: 'Inventario',           desc: 'Ver y gestionar materiales',         color: 'bg-slate-600'   },
  { href: '/proyectos',         icon: '📋', title: 'Proyectos / OT',       desc: 'Órdenes de trabajo y factibilidad',  color: 'bg-amber-600'   },
  { href: '/herramientas',      icon: '🔧', title: 'Herramientas',         desc: 'Estado y ubicación de equipos',      color: 'bg-rose-600'    },
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

  const alertas       = (materiales ?? []).filter(m => m.stock_actual <= m.stock_minimo).length
  const solicPend     = solicRes.error ? 0 : (solicRes.count ?? 0)

  return (
    <div className="p-5 max-w-4xl">
      {/* Cabecera */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">2C Electricidad</h1>
        <p className="text-sm text-slate-500">Taller de tableros eléctricos — Inventario</p>
      </div>

      {/* Alerta de stock */}
      {alertas > 0 && (
        <div className="alert alert-red mb-5">
          ⚠️ {alertas} material{alertas !== 1 ? 'es' : ''} bajo stock mínimo.{' '}
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
            <div className={`w-10 h-10 ${a.color} rounded-lg flex items-center justify-center text-lg text-white mb-1 flex-shrink-0`}>
              {a.icon}
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
          <div className={`stat-icon ${alertas > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
            {alertas > 0 ? '⚠️' : '✅'}
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800 leading-tight">{num(alertas, 0)}</div>
            <div className="text-xs text-slate-500 font-medium">Alertas stock</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-yellow-100">📋</div>
          <div>
            <div className="text-xl font-bold text-slate-800 leading-tight">{num(proyActivos ?? 0, 0)}</div>
            <div className="text-xs text-slate-500 font-medium">Proy. activos</div>
          </div>
        </div>

        <div className="stat-card">
          <div className={`stat-icon ${solicPend > 0 ? 'bg-orange-100' : 'bg-slate-100'}`}>🛒</div>
          <div>
            <div className="text-xl font-bold text-slate-800 leading-tight">{num(solicPend, 0)}</div>
            <div className="text-xs text-slate-500 font-medium">Compras pend.</div>
          </div>
        </div>
      </div>
    </div>
  )
}
