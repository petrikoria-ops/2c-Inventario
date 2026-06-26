import Link from 'next/link'
import { getSupabaseServer } from '@/lib/supabase/server'
import { fetchAllMateriales } from '@/lib/supabase/fetchAll'
import { estaBajoMinimo } from '@/lib/utils'
import { puedeVer, type Departamento } from '@/lib/auth/permisos.server'
import { getContextoUsuario, NOMBRE_DEPARTAMENTO } from '@/lib/auth/verComo'
import { getDeptConfig } from '@/lib/departamentos/config'
import VerComoSelector from '@/components/layout/VerComoSelector'
import CockpitHeader from '@/components/hub/CockpitHeader'
import CountUp from '@/components/ui/CountUp'
import Reveal from '@/components/ui/Reveal'
import WidgetBodega from '@/components/hub/WidgetBodega'
import WidgetTaller from '@/components/hub/WidgetTaller'
import WidgetOficinaTecnica from '@/components/hub/WidgetOficinaTecnica'
import WidgetPrevencion from '@/components/hub/WidgetPrevencion'
import WidgetRRHH from '@/components/hub/WidgetRRHH'
import WidgetDirectiva from '@/components/hub/WidgetDirectiva'
import {
  AlertTriangle, CheckCircle, ClipboardList, ShoppingCart,
  ArrowRight, Sparkles,
} from 'lucide-react'

export const dynamic    = 'force-dynamic'
export const revalidate = 0

const WIDGETS: Record<Departamento, (() => Promise<JSX.Element>) | null> = {
  bodega: WidgetBodega,
  taller: WidgetTaller,
  oficina_tecnica: WidgetOficinaTecnica,
  prevencion: WidgetPrevencion,
  rrhh: WidgetRRHH,
  directiva: WidgetDirectiva,
  admin_software: null,
}

function saludoSegunHora(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

export default async function HomePage() {
  const sb = getSupabaseServer()

  // Contexto: perfil real + perfil efectivo (aplica "ver como" si está activo).
  const { real: perfil, efectivo: perfilEfectivo, puedeSimular, verComo } = await getContextoUsuario()

  const departamentoMostrado = perfilEfectivo?.departamento as Departamento | undefined
  const cfg = getDeptConfig(departamentoMostrado)

  const [materiales, { count: proyActivos }, solicRes] = await Promise.all([
    fetchAllMateriales<{ stock_actual: number; stock_minimo: number }>(sb, 'stock_actual,stock_minimo'),
    sb.from('proyectos').select('*', { count: 'exact', head: true }).eq('estado', 'en_proceso'),
    sb.from('solicitudes_compra').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente'),
  ])

  const alertas   = materiales.filter(m => estaBajoMinimo(m.stock_actual, m.stock_minimo)).length
  const solicPend = solicRes.error ? 0 : (solicRes.count ?? 0)

  // Filtrado por permisos del perfil efectivo
  const verModulo = (modulo: Parameters<typeof puedeVer>[1]) => !perfilEfectivo || puedeVer(perfilEfectivo, modulo)
  const acciones = cfg.acciones.filter(a => verModulo(a.modulo))
  const secciones = cfg.herramientas
    .map(s => ({ ...s, items: s.items.filter(i => verModulo(i.modulo)) }))
    .filter(s => s.items.length > 0)

  const Widget = departamentoMostrado ? WIDGETS[departamentoMostrado] : null

  const fecha = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
  const rol = perfil
    ? verComo
      ? `Viendo como ${NOMBRE_DEPARTAMENTO[verComo]} · ${perfil.nombre_completo}`
      : `${perfil.puesto}`
    : null

  return (
    <div className="p-5 md:p-7 w-full">
      {/* Cabecera identitaria del área */}
      <CockpitHeader
        nombre={cfg.nombre}
        lema={cfg.lema}
        Icon={cfg.Icon}
        grad={cfg.grad}
        saludo={saludoSegunHora()}
        rol={rol}
        fecha={fecha}
      />

      {/* Selector "Ver como" — solo admin_software/master. Persiste vía cookie,
          así la barra lateral y todas las páginas se adaptan al área elegida. */}
      {puedeSimular && (
        <div className="mb-6 anim-fade-in">
          <VerComoSelector verComo={verComo} variant="pills" />
        </div>
      )}

      {/* Alerta de stock */}
      {alertas > 0 && (
        <div className="alert alert-red mb-6 anim-fade-in">
          <AlertTriangle size={15} />
          {alertas} material{alertas !== 1 ? 'es' : ''} bajo stock mínimo.{' '}
          <a href="/materiales?bajo_minimo=1" className="underline font-semibold">Ver ahora →</a>
        </div>
      )}

      {/* Pulso general — 3 KPIs con contador animado */}
      <h2 className="seccion-label" style={{ '--seccion-acento': cfg.acento } as React.CSSProperties}>
        <span className="dot" /> Pulso de la empresa
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 max-w-2xl stagger">
        <div className={`stat-card ${alertas > 0 ? 'ring-2 ring-red-200' : ''}`}>
          <div className={`stat-icon flex items-center justify-center ${alertas > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
            {alertas > 0
              ? <AlertTriangle size={18} style={{ color: '#DC2626' }} />
              : <CheckCircle  size={18} style={{ color: '#059669' }} />}
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800 leading-tight"><CountUp value={alertas} /></div>
            <div className="text-xs text-slate-500 font-medium">Alertas de stock</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon flex items-center justify-center bg-yellow-100">
            <ClipboardList size={18} style={{ color: '#D97706' }} />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800 leading-tight"><CountUp value={proyActivos ?? 0} /></div>
            <div className="text-xs text-slate-500 font-medium">Obras en proceso</div>
          </div>
        </div>

        <div className="stat-card">
          <div className={`stat-icon flex items-center justify-center ${solicPend > 0 ? 'bg-orange-100' : 'bg-slate-100'}`}>
            <ShoppingCart size={18} style={{ color: solicPend > 0 ? '#EA580C' : '#909090' }} />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800 leading-tight"><CountUp value={solicPend} /></div>
            <div className="text-xs text-slate-500 font-medium">Compras pendientes</div>
          </div>
        </div>
      </div>

      {/* Acciones rápidas — el "listo para resolver" del área */}
      {acciones.length > 0 && (
        <div className="mb-9">
          <h2 className="seccion-label" style={{ '--seccion-acento': cfg.acento } as React.CSSProperties}>
            <span className="dot" /> ¿Qué necesitas hacer?
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 stagger">
            {acciones.map(a => (
              <Link
                key={a.href + a.titulo}
                href={a.href}
                className="accion-card group"
                style={{ '--accion-acento': a.acento } as React.CSSProperties}
              >
                <div className="flex items-center justify-between">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-white flex-shrink-0
                               transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3"
                    style={{ background: a.acento }}
                  >
                    <a.Icon size={21} />
                  </div>
                  <ArrowRight
                    size={17}
                    className="text-slate-300 -translate-x-1 opacity-0 transition-all duration-300
                               group-hover:translate-x-0 group-hover:opacity-100"
                    style={{ color: a.acento }}
                  />
                </div>
                <div>
                  <div className="font-semibold text-slate-800 text-[15px] leading-tight mb-0.5">{a.titulo}</div>
                  <div className="text-xs text-slate-400 leading-snug">{a.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Panel en vivo del departamento */}
      {Widget && (
        <Reveal className="mb-9">
          <h2 className="seccion-label" style={{ '--seccion-acento': cfg.acento } as React.CSSProperties}>
            <span className="dot" /> Tu panel de {cfg.nombre} en vivo
          </h2>
          <Widget />
        </Reveal>
      )}

      {/* Todas las herramientas del área, agrupadas */}
      {secciones.length > 0 && (
        <div className="mb-4">
          <h2 className="seccion-label" style={{ '--seccion-acento': cfg.acento } as React.CSSProperties}>
            <Sparkles size={13} style={{ color: cfg.acento }} /> Herramientas de {cfg.nombre}
          </h2>
          <div className="space-y-6">
            {secciones.map((s, idx) => (
              <Reveal key={s.titulo} delay={idx * 60}>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">{s.titulo}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {s.items.map(i => (
                    <Link key={i.href + i.titulo} href={i.href} className="tool-card group">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0
                                   transition-colors duration-200"
                        style={{ background: `${cfg.acento}14`, color: cfg.acento }}
                      >
                        <i.Icon size={17} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-800 text-[13px] leading-tight truncate group-hover:text-slate-900">{i.titulo}</div>
                        <div className="text-[11px] text-slate-400 leading-snug truncate">{i.desc}</div>
                      </div>
                      <ArrowRight size={14} className="text-slate-300 flex-shrink-0 opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0" />
                    </Link>
                  ))}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
