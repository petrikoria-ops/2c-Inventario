import Link from 'next/link'
import { Suspense } from 'react'
import { getSupabaseServer } from '@/lib/supabase/server'
import { fetchAllMateriales, type MaterialAlerta } from '@/lib/supabase/fetchAll'
import { estaBajoMinimo } from '@/lib/utils'
import { puedeVer, type Departamento } from '@/lib/auth/permisos.server'
import { getContextoUsuario, NOMBRE_DEPARTAMENTO } from '@/lib/auth/verComo'
import { getDeptConfig } from '@/lib/departamentos/config'
import VerComoSelector from '@/components/layout/VerComoSelector'
import CockpitHeader from '@/components/hub/CockpitHeader'
import Reveal from '@/components/ui/Reveal'
import ResumenEjecutivoDia from '@/components/hub/ResumenEjecutivoDia'
import ResumenEjecutivoDiaSkeleton from '@/components/hub/ResumenEjecutivoDiaSkeleton'
import WidgetBodega from '@/components/hub/WidgetBodega'
import WidgetTaller from '@/components/hub/WidgetTaller'
import WidgetOficinaTecnica from '@/components/hub/WidgetOficinaTecnica'
import WidgetPrevencion from '@/components/hub/WidgetPrevencion'
import WidgetRRHH from '@/components/hub/WidgetRRHH'
import WidgetDirectiva from '@/components/hub/WidgetDirectiva'
import { AlertTriangle, ArrowRight } from 'lucide-react'

export const dynamic    = 'force-dynamic'
export const revalidate = 0

type WidgetComponent = (props: { materiales: MaterialAlerta[] }) => Promise<JSX.Element>

const WIDGETS: Record<Departamento, WidgetComponent | null> = {
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

  // El contexto del usuario y el catálogo de materiales no dependen entre sí:
  // salen juntos para que el Inicio tarde lo que la consulta más lenta y no la
  // suma. Es la pestaña más visitada de la app. Las columnas cubren lo que
  // necesitan tanto ResumenEjecutivoDia como el Widget del departamento.
  const [
    { real: perfil, efectivo: perfilEfectivo, puedeSimular, verComo, verComoPuesto },
    materiales,
  ] = await Promise.all([
    getContextoUsuario(),
    fetchAllMateriales<MaterialAlerta>(sb, 'id,codigo,descripcion,stock_actual,stock_minimo,ubicacion'),
  ])

  const departamentoMostrado = perfilEfectivo?.departamento as Departamento | undefined
  const cfg = getDeptConfig(departamentoMostrado, perfilEfectivo?.puesto)

  const alertas = materiales.filter(m => estaBajoMinimo(m.stock_actual, m.stock_minimo)).length

  // Filtrado por permisos del perfil efectivo
  const verModulo = (modulo: Parameters<typeof puedeVer>[1]) => !perfilEfectivo || puedeVer(perfilEfectivo, modulo)
  const acciones = cfg.acciones.filter(a => verModulo(a.modulo))

  const Widget = departamentoMostrado ? WIDGETS[departamentoMostrado] : null

  const fecha = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
  const primerNombre = perfil?.nombre_completo?.trim().split(/\s+/)[0]
  const saludo = primerNombre ? `${saludoSegunHora()}, ${primerNombre}` : saludoSegunHora()
  const rol = perfil
    ? verComo
      ? `Viendo como ${perfilEfectivo?.puesto ?? NOMBRE_DEPARTAMENTO[verComo]} (${NOMBRE_DEPARTAMENTO[verComo]}) · ${perfil.nombre_completo}`
      : `${perfil.nombre_completo} · ${perfil.puesto}`
    : null

  return (
    <div className="p-5 md:p-7 w-full">
      {/* Cabecera identitaria del área */}
      <CockpitHeader
        nombre={cfg.nombre}
        lema={cfg.lema}
        Icon={cfg.Icon}
        grad={cfg.grad}
        saludo={saludo}
        rol={rol}
        fecha={fecha}
      />

      {/* Selector "Ver como" — solo admin_software/master. Persiste vía cookie,
          así la barra lateral y todas las páginas se adaptan al área elegida. */}
      {puedeSimular && (
        <div className="mb-6 anim-fade-in">
          <VerComoSelector verComo={verComo} verComoPuesto={verComoPuesto} variant="pills" />
        </div>
      )}

      {/* Alerta de stock */}
      {alertas > 0 && (
        <div className="alert alert-red mb-6 anim-fade-in">
          <AlertTriangle size={15} />
          {alertas} material{alertas !== 1 ? 'es' : ''} bajo stock mínimo.{' '}
          <Link href="/materiales?bajo_minimo=1" className="underline font-semibold">Ver ahora →</Link>
        </div>
      )}

      {/* Resumen ejecutivo del día — único bloque de pulso, KPIs, avances y
          alertas del día. Streameado aparte con Suspense para no bloquear el
          resto del inicio. */}
      <Suspense fallback={<ResumenEjecutivoDiaSkeleton />}>
        <ResumenEjecutivoDia perfil={perfilEfectivo} acento={cfg.acento} materiales={materiales} />
      </Suspense>

      {/* Acciones rápidas — el "listo para resolver" del área (solo verbos del
          día; el catálogo completo vive en la barra lateral, no se repite aquí). */}
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
                {...(a.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
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
                  <div className="text-xs text-brand-n500 leading-snug">{a.desc}</div>
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
          <Widget materiales={materiales} />
        </Reveal>
      )}
    </div>
  )
}
