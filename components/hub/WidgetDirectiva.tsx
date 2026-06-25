import Link from 'next/link'
import { Package, DollarSign, Wrench, ClipboardList } from 'lucide-react'
import { getSupabaseServer } from '@/lib/supabase/server'
import { fetchAllMateriales } from '@/lib/supabase/fetchAll'
import { clp, num } from '@/lib/utils'

export default async function WidgetDirectiva() {
  const sb = getSupabaseServer()

  const [materiales, { count: matActivos }, { count: herOperativas }, { count: proyEnProceso }] = await Promise.all([
    fetchAllMateriales<{ stock_actual: number; precio_unitario: number | null }>(sb, 'stock_actual,precio_unitario'),
    sb.from('materiales').select('*', { count: 'exact', head: true }).eq('activo', true),
    sb.from('herramientas').select('*', { count: 'exact', head: true }).eq('estado', 'operativa'),
    sb.from('proyectos').select('*', { count: 'exact', head: true }).eq('estado', 'en_proceso'),
  ])

  const valorInventario = materiales.reduce((acc, m) => acc + m.stock_actual * (m.precio_unitario ?? 0), 0)

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-icon flex items-center justify-center bg-slate-100">
            <Package size={18} style={{ color: '#475569' }} />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800 leading-tight">{num(matActivos ?? 0, 0)}</div>
            <div className="text-xs text-slate-500 font-medium">Materiales activos</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon flex items-center justify-center bg-green-100">
            <DollarSign size={18} style={{ color: '#059669' }} />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800 leading-tight">{clp(valorInventario)}</div>
            <div className="text-xs text-slate-500 font-medium">Valor de inventario</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon flex items-center justify-center bg-blue-100">
            <Wrench size={18} style={{ color: '#1D4ED8' }} />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800 leading-tight">{num(herOperativas ?? 0, 0)}</div>
            <div className="text-xs text-slate-500 font-medium">Herramientas operativas</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon flex items-center justify-center bg-yellow-100">
            <ClipboardList size={18} style={{ color: '#D97706' }} />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800 leading-tight">{num(proyEnProceso ?? 0, 0)}</div>
            <div className="text-xs text-slate-500 font-medium">Proyectos en proceso</div>
          </div>
        </div>
      </div>

      <div className="mt-3 text-right">
        <Link href="/dashboard" className="btn btn-ghost btn-sm">Ver métricas completas →</Link>
      </div>
    </div>
  )
}
