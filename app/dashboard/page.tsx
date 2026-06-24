import { getSupabaseServer } from '@/lib/supabase/server'
import { fetchAllMateriales } from '@/lib/supabase/fetchAll'
import AlertasStockRealtime from '@/components/dashboard/AlertasStockRealtime'
import { clp, fechaHora, num, estaBajoMinimo } from '@/lib/utils'
import { BadgeTipo, BadgeEstadoProy } from '@/components/ui/Badge'
import {
  Package, AlertTriangle, DollarSign, ClipboardList,
  CheckCircle, Wrench, Search, ShoppingCart, PackageOpen,
  ArrowUpDown, type LucideIcon,
} from 'lucide-react'
import type { Material } from '@/types'
import type { Metadata } from 'next'

type MaterialDashboard = Pick<Material, 'id' | 'codigo' | 'descripcion' | 'stock_actual' | 'stock_minimo' | 'ubicacion' | 'precio_unitario'>

export const metadata: Metadata = { title: 'Métricas — 2C Inventario' }
export const dynamic   = 'force-dynamic'
export const revalidate = 0

const ESTADOS_PROY = ['presupuesto', 'en_proceso', 'terminado', 'entregado', 'cancelado'] as const

export default async function DashboardPage() {
  const sb = getSupabaseServer()

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [
    { count: totalItems },
    materiales,
    { count: herEnRep },
    { count: herExtraviadas },
    { count: herOperativas },
    { count: proyActivos },
    { data: proyectosTodos },
    { data: ultMov },
    solicRes,
    salidasRes,
  ] = await Promise.all([
    sb.from('materiales').select('*', { count: 'exact', head: true }).eq('activo', true),
    fetchAllMateriales<MaterialDashboard>(sb, 'id,codigo,descripcion,stock_actual,stock_minimo,ubicacion,precio_unitario'),
    sb.from('herramientas').select('*', { count: 'exact', head: true }).eq('estado', 'en_reparacion'),
    sb.from('herramientas').select('*', { count: 'exact', head: true }).eq('estado', 'extraviada'),
    sb.from('herramientas').select('*', { count: 'exact', head: true }).eq('estado', 'operativa'),
    sb.from('proyectos').select('*', { count: 'exact', head: true }).eq('estado', 'en_proceso'),
    sb.from('proyectos').select('estado'),
    sb.from('movimientos')
      .select('*,materiales(codigo,descripcion,unidad),proyectos(ot)')
      .order('fecha', { ascending: false })
      .limit(10),
    sb.from('solicitudes_compra').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente'),
    sb.from('vales_despacho').select('*', { count: 'exact', head: true }).gte('fecha', startOfMonth),
  ])

  const alertas         = materiales.filter(m => estaBajoMinimo(m.stock_actual, m.stock_minimo))
  const valorInventario = materiales.reduce((s, m) => s + m.stock_actual * (m.precio_unitario ?? 0), 0)
  const solicPend       = solicRes.error   ? 0 : (solicRes.count   ?? 0)
  const salidasMes      = salidasRes.error ? 0 : (salidasRes.count ?? 0)

  const proyPorEstado = (proyectosTodos ?? []).reduce<Record<string, number>>((acc, p: any) => {
    acc[p.estado] = (acc[p.estado] ?? 0) + 1
    return acc
  }, {})

  const stats: { Icon: LucideIcon; label: string; value: string; bg: string; iconColor: string }[] = [
    { Icon: Package,       label: 'Ítems en inventario', value: num(totalItems    ?? 0, 0), bg: 'bg-blue-100',   iconColor: '#1D4ED8' },
    { Icon: AlertTriangle, label: 'Bajo stock mínimo',   value: num(alertas.length,    0), bg: 'bg-red-100',    iconColor: '#DC2626' },
    { Icon: DollarSign,    label: 'Valor inventario',    value: clp(valorInventario),      bg: 'bg-green-100',  iconColor: '#059669' },
    { Icon: ClipboardList, label: 'Proy. en proceso',    value: num(proyActivos   ?? 0, 0), bg: 'bg-yellow-100', iconColor: '#D97706' },
    { Icon: CheckCircle,   label: 'Her. operativas',     value: num(herOperativas ?? 0, 0), bg: 'bg-green-100',  iconColor: '#059669' },
    { Icon: Wrench,        label: 'Her. en reparación',  value: num(herEnRep      ?? 0, 0), bg: 'bg-orange-100', iconColor: '#EA580C' },
    { Icon: Search,        label: 'Her. extraviadas',    value: num(herExtraviadas ?? 0, 0), bg: 'bg-red-100',   iconColor: '#DC2626' },
    { Icon: ShoppingCart,  label: 'Compras pendientes',  value: num(solicPend,         0), bg: solicPend > 0 ? 'bg-orange-100' : 'bg-slate-100', iconColor: solicPend > 0 ? '#EA580C' : '#909090' },
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
          <p className="text-sm text-slate-500">Resumen general del inventario</p>
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
              <div className="text-xs text-slate-500 font-medium">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Proyectos por estado */}
      {Object.keys(proyPorEstado).length > 0 && (
        <div className="panel mb-5">
          <div className="panel-header">
            <ClipboardList size={14} style={{ color: '#909090', flexShrink: 0 }} />
            <h2>Proyectos por estado</h2>
            <a href="/proyectos" className="btn btn-ghost btn-sm">Ver todos →</a>
          </div>
          <div className="flex flex-wrap gap-3 p-4">
            {ESTADOS_PROY.filter(e => proyPorEstado[e]).map(est => (
              <div key={est} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                <BadgeEstadoProy estado={est} />
                <span className="text-xl font-bold text-slate-800">{proyPorEstado[est]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alertas con Realtime */}
      <AlertasStockRealtime initialAlertas={alertas} />

      {/* Últimos movimientos */}
      <div className="panel">
        <div className="panel-header">
          <ArrowUpDown size={14} style={{ color: '#909090', flexShrink: 0 }} />
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
                  <td className="td"><span className="text-xs text-slate-500 whitespace-nowrap">{fechaHora(m.fecha)}</span></td>
                  <td className="td"><BadgeTipo tipo={m.tipo} /></td>
                  <td className="td">
                    <span className="code">{(m.materiales as any)?.codigo}</span>
                    <span className="text-slate-500 text-xs ml-1">{(m.materiales as any)?.descripcion}</span>
                  </td>
                  <td className="td-r text-sm font-medium">{num(m.cantidad)} <span className="text-slate-400 text-xs">{(m.materiales as any)?.unidad}</span></td>
                  <td className="td text-xs text-slate-500">{m.usuario ?? '—'}</td>
                  <td className="td"><span className="code text-slate-500">{(m.proyectos as any)?.ot ?? '—'}</span></td>
                </tr>
              ))}
              {!ultMov?.length && (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">Sin movimientos registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
