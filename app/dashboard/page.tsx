import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getPerfil, puedeVer, puedeVerPrecios } from '@/lib/auth/permisos.server'
import { fetchAllMateriales } from '@/lib/supabase/fetchAll'
import AlertasStockRealtime from '@/components/dashboard/AlertasStockRealtime'
import { MovimientosTrend, BarraCategorias, BarraProporcion, type SerieDia, type CategoriaValor, type Segmento } from '@/components/dashboard/DashboardCharts'
import { clp, fechaHora, num, estaBajoMinimo } from '@/lib/utils'
import { BadgeTipo } from '@/components/ui/Badge'
import {
  Package, AlertTriangle, DollarSign, ClipboardList,
  CheckCircle, Wrench, Search, ShoppingCart, PackageOpen,
  ArrowUpDown, TrendingUp, BarChart3, type LucideIcon,
} from 'lucide-react'
import type { Material, Categoria } from '@/types'
import type { Metadata } from 'next'

type MaterialDashboard = Pick<Material, 'id' | 'codigo' | 'descripcion' | 'stock_actual' | 'stock_minimo' | 'ubicacion' | 'precio_unitario' | 'categoria_id'> & {
  categorias: Pick<Categoria, 'nombre' | 'color'> | null
}

export const metadata: Metadata = { title: 'Métricas — 2C Inventario' }
export const dynamic   = 'force-dynamic'
export const revalidate = 0

const ESTADOS_PROY = ['presupuesto', 'en_proceso', 'terminado', 'entregado', 'cancelado'] as const

// Mismos colores que ya usan BadgeEstadoProy / BadgeEstadoHer / BadgeTipo
// (components/ui/Badge.tsx) — se reutilizan tal cual para que un mismo
// estado se vea siempre del mismo color en toda la app.
const COLOR_PROY: Record<string, string> = {
  presupuesto: 'var(--n-500)', en_proceso: '#D97706', terminado: '#1D4ED8',
  entregado: '#059669', cancelado: '#DC2626',
}
const LABEL_PROY: Record<string, string> = {
  presupuesto: 'Presupuesto', en_proceso: 'En proceso', terminado: 'Terminado',
  entregado: 'Entregado', cancelado: 'Cancelado',
}
const ESTADOS_HER = ['operativa', 'en_reparacion', 'extraviada', 'dada_de_baja'] as const
const COLOR_HER: Record<string, string> = {
  operativa: '#059669', en_reparacion: '#D97706', extraviada: '#DC2626', dada_de_baja: 'var(--n-500)',
}
const LABEL_HER: Record<string, string> = {
  operativa: 'Operativa', en_reparacion: 'En reparación', extraviada: 'Extraviada', dada_de_baja: 'Dada de baja',
}

// Ventana de la tendencia de movimientos — 14 días es suficiente para ver
// el pulso reciente de bodega sin cargar demasiadas filas.
const DIAS_TENDENCIA = 14
const MAX_CATEGORIAS_CHART = 8

export default async function DashboardPage() {
  const perfil = await getPerfil()
  if (perfil && !puedeVer(perfil, 'metricas')) redirect('/')

  const sb = getSupabaseServer()

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const inicioTendencia = new Date()
  inicioTendencia.setHours(0, 0, 0, 0)
  inicioTendencia.setDate(inicioTendencia.getDate() - (DIAS_TENDENCIA - 1))

  const [
    { count: totalItems },
    materiales,
    { data: herramientasEstado },
    { count: proyActivos },
    { data: proyectosTodos },
    { data: ultMov },
    { data: movTendencia },
    solicRes,
    salidasRes,
  ] = await Promise.all([
    sb.from('materiales').select('*', { count: 'exact', head: true }).eq('activo', true),
    fetchAllMateriales<MaterialDashboard>(sb, 'id,codigo,descripcion,stock_actual,stock_minimo,ubicacion,precio_unitario,categoria_id,categorias(nombre,color)'),
    sb.from('herramientas').select('estado').eq('activo', true),
    sb.from('proyectos').select('*', { count: 'exact', head: true }).eq('estado', 'en_proceso'),
    sb.from('proyectos').select('estado'),
    sb.from('movimientos')
      .select('*,materiales(codigo,descripcion,unidad),proyectos(ot)')
      .order('fecha', { ascending: false })
      .limit(10),
    sb.from('movimientos')
      .select('fecha,tipo')
      .gte('fecha', inicioTendencia.toISOString())
      .in('tipo', ['entrada', 'salida']),
    sb.from('solicitudes_compra').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente'),
    sb.from('vales_despacho').select('*', { count: 'exact', head: true }).gte('fecha', startOfMonth),
  ])

  const verPrecios      = puedeVerPrecios(perfil)
  const alertas         = materiales.filter(m => estaBajoMinimo(m.stock_actual, m.stock_minimo))
  const valorInventario = materiales.reduce((s, m) => s + m.stock_actual * (m.precio_unitario ?? 0), 0)
  const solicPend       = solicRes.error   ? 0 : (solicRes.count   ?? 0)
  const salidasMes      = salidasRes.error ? 0 : (salidasRes.count ?? 0)

  const proyPorEstado = (proyectosTodos ?? []).reduce<Record<string, number>>((acc, p: any) => {
    acc[p.estado] = (acc[p.estado] ?? 0) + 1
    return acc
  }, {})
  const proyeccionSegmentos: Segmento[] = ESTADOS_PROY
    .map(e => ({ label: LABEL_PROY[e], count: proyPorEstado[e] ?? 0, color: COLOR_PROY[e] }))

  const herPorEstado = (herramientasEstado ?? []).reduce<Record<string, number>>((acc, h: any) => {
    acc[h.estado] = (acc[h.estado] ?? 0) + 1
    return acc
  }, {})
  const herramientasSegmentos: Segmento[] = ESTADOS_HER
    .map(e => ({ label: LABEL_HER[e], count: herPorEstado[e] ?? 0, color: COLOR_HER[e] }))
  const herOperativas   = herPorEstado['operativa']     ?? 0
  const herEnRep        = herPorEstado['en_reparacion'] ?? 0
  const herExtraviadas  = herPorEstado['extraviada']    ?? 0

  // Tendencia de movimientos — se arma un balde por día (aunque no haya
  // movimientos ese día) para que el gráfico no "salte" fechas.
  const diasTendencia: SerieDia[] = Array.from({ length: DIAS_TENDENCIA }, (_, i) => {
    const fecha = new Date(inicioTendencia)
    fecha.setDate(fecha.getDate() + i)
    return { fecha, entradas: 0, salidas: 0 }
  })
  const indicePorDia = new Map(diasTendencia.map(d => [d.fecha.toISOString().slice(0, 10), d]))
  for (const m of movTendencia ?? []) {
    const dia = indicePorDia.get(String(m.fecha).slice(0, 10))
    if (!dia) continue
    if (m.tipo === 'entrada') dia.entradas++
    else if (m.tipo === 'salida') dia.salidas++
  }

  // Valor de inventario por categoría — solo tiene sentido calcularlo si
  // el perfil puede ver precios (mismo gate que "Valor inventario" arriba).
  let categoriasValor: CategoriaValor[] = []
  let valorCategorizado = 0
  if (verPrecios) {
    const acc = new Map<string, CategoriaValor>()
    for (const m of materiales) {
      const valor = m.stock_actual * (m.precio_unitario ?? 0)
      if (valor <= 0) continue
      const nombre = m.categorias?.nombre ?? 'Sin categoría'
      const color  = m.categorias?.color ?? 'var(--n-400)'
      const prev = acc.get(nombre) ?? { nombre, color, valor: 0 }
      prev.valor += valor
      acc.set(nombre, prev)
    }
    const todas = Array.from(acc.values()).sort((a, b) => b.valor - a.valor)
    valorCategorizado = todas.reduce((s, c) => s + c.valor, 0)
    if (todas.length > MAX_CATEGORIAS_CHART) {
      const top = todas.slice(0, MAX_CATEGORIAS_CHART - 1)
      const resto = todas.slice(MAX_CATEGORIAS_CHART - 1).reduce((s, c) => s + c.valor, 0)
      categoriasValor = [...top, { nombre: 'Otras', color: 'var(--n-400)', valor: resto }]
    } else {
      categoriasValor = todas
    }
  }

  const stats: { Icon: LucideIcon; label: string; value: string; bg: string; iconColor: string }[] = [
    { Icon: Package,       label: 'Ítems en inventario', value: num(totalItems    ?? 0, 0), bg: 'bg-blue-100',   iconColor: '#1D4ED8' },
    { Icon: AlertTriangle, label: 'Bajo stock mínimo',   value: num(alertas.length,    0), bg: 'bg-red-100',    iconColor: '#DC2626' },
    // "Valor inventario" es precio × stock — jefatura solamente, ver
    // puedeVerPrecios() en lib/auth/permisos.ts.
    ...(verPrecios ? [{ Icon: DollarSign, label: 'Valor inventario', value: clp(valorInventario), bg: 'bg-green-100', iconColor: '#059669' }] : []),
    { Icon: ClipboardList, label: 'Proy. en proceso',    value: num(proyActivos   ?? 0, 0), bg: 'bg-yellow-100', iconColor: '#D97706' },
    { Icon: CheckCircle,   label: 'Her. operativas',     value: num(herOperativas ?? 0, 0), bg: 'bg-green-100',  iconColor: '#059669' },
    { Icon: Wrench,        label: 'Her. en reparación',  value: num(herEnRep      ?? 0, 0), bg: 'bg-orange-100', iconColor: '#EA580C' },
    { Icon: Search,        label: 'Her. extraviadas',    value: num(herExtraviadas ?? 0, 0), bg: 'bg-red-100',   iconColor: '#DC2626' },
    { Icon: ShoppingCart,  label: 'Compras pendientes',  value: num(solicPend,         0), bg: solicPend > 0 ? 'bg-orange-100' : 'bg-slate-100', iconColor: solicPend > 0 ? '#EA580C' : 'var(--n-500)' },
    { Icon: PackageOpen,   label: 'Salidas este mes',    value: num(salidasMes,        0), bg: 'bg-violet-100', iconColor: '#7C3AED' },
  ]

  return (
    <div className="p-5 md:p-7">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-white border" style={{ borderColor: '#E8EAED' }}>
          <ClipboardList size={18} style={{ color: '#2E333A' }} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-800 leading-tight">Métricas</h1>
          <p className="text-sm text-brand-n500">Resumen general del inventario</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-5">
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className={`stat-icon flex items-center justify-center ${s.bg}`}>
              <s.Icon size={17} style={{ color: s.iconColor }} />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-800 leading-tight">{s.value}</div>
              <div className="text-xs text-brand-n500 font-medium">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tendencia de movimientos */}
      <div className="panel">
        <div className="panel-header">
          <TrendingUp size={14} style={{ color: 'var(--n-500)', flexShrink: 0 }} />
          <h2>Movimientos por día</h2>
          <a href="/movimientos" className="btn btn-ghost btn-sm">Ver todos →</a>
        </div>
        <div className="p-4">
          <MovimientosTrend dias={diasTendencia} />
        </div>
      </div>

      {/* Valor de inventario por categoría — jefatura solamente */}
      {verPrecios && categoriasValor.length > 0 && (
        <div className="panel">
          <div className="panel-header">
            <BarChart3 size={14} style={{ color: 'var(--n-500)', flexShrink: 0 }} />
            <h2>Valor de inventario por categoría</h2>
            <span className="text-xs text-brand-n500 font-medium">{clp(valorCategorizado)} total</span>
          </div>
          <div className="p-4">
            <BarraCategorias categorias={categoriasValor} total={valorCategorizado} />
          </div>
        </div>
      )}

      {/* Proyectos y herramientas por estado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {Object.keys(proyPorEstado).length > 0 && (
          <div className="panel mb-0">
            <div className="panel-header">
              <ClipboardList size={14} style={{ color: 'var(--n-500)', flexShrink: 0 }} />
              <h2>Proyectos por estado</h2>
              <a href="/proyectos" className="btn btn-ghost btn-sm">Ver todos →</a>
            </div>
            <div className="p-4">
              <BarraProporcion segmentos={proyeccionSegmentos} />
            </div>
          </div>
        )}

        <div className="panel mb-0">
          <div className="panel-header">
            <Wrench size={14} style={{ color: 'var(--n-500)', flexShrink: 0 }} />
            <h2>Herramientas por estado</h2>
            <a href="/herramientas" className="btn btn-ghost btn-sm">Ver todas →</a>
          </div>
          <div className="p-4">
            <BarraProporcion segmentos={herramientasSegmentos} />
          </div>
        </div>
      </div>

      {/* Alertas con Realtime — solo los campos que la tabla realmente
          pinta, para no viajar precio_unitario al cliente igual (Material[]
          lo trae de más aunque Alerta no lo declare). */}
      <AlertasStockRealtime initialAlertas={alertas.map(({ id, codigo, descripcion, stock_actual, stock_minimo, ubicacion }) =>
        ({ id, codigo, descripcion, stock_actual, stock_minimo, ubicacion }))} />

      {/* Últimos movimientos */}
      <div className="panel">
        <div className="panel-header">
          <ArrowUpDown size={14} style={{ color: 'var(--n-500)', flexShrink: 0 }} />
          <h2>Últimos movimientos</h2>
          <a href="/movimientos" className="btn btn-ghost btn-sm">Ver todos →</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Fecha</th>
                <th className="th">Tipo</th>
                <th className="th">Material</th>
                <th className="th td-r">Cantidad</th>
                <th className="th">Usuario</th>
                <th className="th">Proyecto</th>
              </tr>
            </thead>
            <tbody>
              {(ultMov ?? []).map(m => (
                <tr key={m.id} className="tr-hover">
                  <td className="td"><span className="text-xs text-brand-n500 whitespace-nowrap">{fechaHora(m.fecha)}</span></td>
                  <td className="td"><BadgeTipo tipo={m.tipo} /></td>
                  <td className="td">
                    <span className="code">{(m.materiales as any)?.codigo}</span>
                    <span className="text-brand-n500 text-xs ml-1">{(m.materiales as any)?.descripcion}</span>
                  </td>
                  <td className="td-r text-sm font-medium">{num(m.cantidad)} <span className="text-brand-n500 text-xs">{(m.materiales as any)?.unidad}</span></td>
                  <td className="td text-xs text-brand-n500">{m.usuario ?? '—'}</td>
                  <td className="td"><span className="code text-brand-n500">{(m.proyectos as any)?.ot ?? '—'}</span></td>
                </tr>
              ))}
              {!ultMov?.length && (
                <tr><td colSpan={6} className="text-center py-8 text-brand-n500">Sin movimientos registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
