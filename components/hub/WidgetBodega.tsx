import Link from 'next/link'
import { AlertTriangle, PackageOpen, Wrench } from 'lucide-react'
import { getSupabaseServer } from '@/lib/supabase/server'
import { fetchAllMateriales } from '@/lib/supabase/fetchAll'
import { estaBajoMinimo, num } from '@/lib/utils'

export default async function WidgetBodega() {
  const sb = getSupabaseServer()
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [materiales, { count: despachosMes }, { count: herRepar }] = await Promise.all([
    fetchAllMateriales<{ id: number; codigo: string; descripcion: string; stock_actual: number; stock_minimo: number; ubicacion: string | null }>(
      sb, 'id,codigo,descripcion,stock_actual,stock_minimo,ubicacion',
    ),
    sb.from('vales_despacho').select('*', { count: 'exact', head: true }).gte('fecha', startOfMonth),
    sb.from('herramientas').select('*', { count: 'exact', head: true }).eq('estado', 'en_reparacion'),
  ])

  const bajoMinimo = materiales
    .filter(m => estaBajoMinimo(m.stock_actual, m.stock_minimo))
    .sort((a, b) => a.stock_actual - b.stock_actual)
    .slice(0, 5)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 panel">
        <div className="panel-header">
          <AlertTriangle size={14} style={{ color: '#D97706', flexShrink: 0 }} />
          <h2>Materiales más urgentes de reponer</h2>
          <Link href="/materiales?bajo_minimo=1" className="btn btn-ghost btn-sm">Ver todos →</Link>
        </div>
        {bajoMinimo.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-400">Ningún material está bajo su mínimo configurado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className="th">Código</th><th className="th">Descripción</th><th className="th td-r">Stock</th><th className="th td-r">Mínimo</th><th className="th">Ubicación</th></tr></thead>
              <tbody>
                {bajoMinimo.map(m => (
                  <tr key={m.id} className="tr-hover bg-red-50/40">
                    <td className="td"><span className="code">{m.codigo}</span></td>
                    <td className="td font-medium text-red-900">{m.descripcion}</td>
                    <td className="td-r font-bold text-red-700">{num(m.stock_actual)}</td>
                    <td className="td-r text-slate-500">{num(m.stock_minimo)}</td>
                    <td className="td text-xs text-slate-500">{m.ubicacion ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="stat-card">
          <div className="stat-icon flex items-center justify-center bg-blue-100">
            <PackageOpen size={18} style={{ color: '#1D4ED8' }} />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800 leading-tight">{num(despachosMes ?? 0, 0)}</div>
            <div className="text-xs text-slate-500 font-medium">Despachos este mes</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon flex items-center justify-center bg-orange-100">
            <Wrench size={18} style={{ color: '#EA580C' }} />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800 leading-tight">{num(herRepar ?? 0, 0)}</div>
            <div className="text-xs text-slate-500 font-medium">Herramientas en reparación</div>
          </div>
        </div>
      </div>
    </div>
  )
}
