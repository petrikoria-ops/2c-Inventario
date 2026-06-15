import { getSupabaseServer } from '@/lib/supabase/server'
import AlertasStockRealtime from '@/components/dashboard/AlertasStockRealtime'
import { clp, fechaHora, num } from '@/lib/utils'
import { BadgeTipo } from '@/components/ui/Badge'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage() {
  const sb = getSupabaseServer()

  // Estadísticas en paralelo
  const [
    { count: totalItems },
    { data: materiales },
    { count: herEnRep },
    { count: herExtraviadas },
    { count: proyActivos },
    { data: ultMov },
  ] = await Promise.all([
    sb.from('materiales').select('*', { count: 'exact', head: true }).eq('activo', true),
    sb.from('materiales').select('id,codigo,descripcion,stock_actual,stock_minimo,ubicacion,precio_unitario').eq('activo', true),
    sb.from('herramientas').select('*', { count: 'exact', head: true }).eq('estado', 'en_reparacion'),
    sb.from('herramientas').select('*', { count: 'exact', head: true }).eq('estado', 'extraviada'),
    sb.from('proyectos').select('*', { count: 'exact', head: true }).eq('estado', 'en_proceso'),
    sb.from('movimientos')
      .select('*,materiales(codigo,descripcion,unidad),proyectos(ot)')
      .order('fecha', { ascending: false })
      .limit(10),
  ])

  const alertas = (materiales ?? []).filter(m => m.stock_actual <= m.stock_minimo)
  const valorInventario = (materiales ?? []).reduce((s, m) => s + m.stock_actual * m.precio_unitario, 0)

  const stats = [
    { icon: '🔌', label: 'Ítems en inventario', value: num(totalItems ?? 0, 0), bg: 'bg-blue-100' },
    { icon: '⚠️', label: 'Bajo stock mínimo',    value: num(alertas.length, 0),  bg: 'bg-red-100' },
    { icon: '💰', label: 'Valor inventario',      value: clp(valorInventario),    bg: 'bg-green-100' },
    { icon: '📋', label: 'Proyectos en proceso',  value: num(proyActivos ?? 0, 0),bg: 'bg-yellow-100' },
    ...(herEnRep     ? [{ icon: '🔧', label: 'Her. en reparación', value: num(herEnRep,     0), bg: 'bg-orange-100' }] : []),
    ...(herExtraviadas ? [{ icon: '🔍', label: 'Herramientas extraviadas', value: num(herExtraviadas, 0), bg: 'bg-red-100' }] : []),
  ]

  return (
    <div className="p-5">
      <h1 className="text-lg font-bold text-slate-800 mb-4">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-5">
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className={`stat-icon ${s.bg}`}>{s.icon}</div>
            <div>
              <div className="text-xl font-bold text-slate-800 leading-tight">{s.value}</div>
              <div className="text-xs text-slate-500 font-medium">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Alertas con Realtime */}
      <AlertasStockRealtime initialAlertas={alertas} />

      {/* Últimos movimientos */}
      <div className="panel">
        <div className="panel-header">
          <h2>↕️ Últimos movimientos</h2>
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
