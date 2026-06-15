'use client'
import { useEffect, useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { num } from '@/lib/utils'
import Link from 'next/link'

interface Alerta {
  id: number
  codigo: string
  descripcion: string
  stock_actual: number
  stock_minimo: number
  ubicacion: string | null
}

export default function AlertasStockRealtime({ initialAlertas }: { initialAlertas: Alerta[] }) {
  const [alertas, setAlertas] = useState<Alerta[]>(initialAlertas)

  useEffect(() => {
    const sb = getSupabaseBrowser()

    // Suscripción a cambios en materiales para actualizar alertas en tiempo real
    const channel = sb
      .channel('stock-alertas')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'materiales' },
        async () => {
          // Al detectar cualquier cambio en materiales, refrescar la lista de alertas
          const { data: mats } = await sb
            .from('materiales')
            .select('id,codigo,descripcion,stock_actual,stock_minimo,ubicacion')
            .eq('activo', true)
          if (mats) {
            setAlertas(
              (mats as Alerta[]).filter(m => m.stock_actual <= m.stock_minimo)
            )
          }
        }
      )
      .subscribe()

    return () => { sb.removeChannel(channel) }
  }, [])

  if (!alertas.length) {
    return (
      <div className="alert alert-green mb-5">
        ✔ Todos los materiales están sobre el stock mínimo.
      </div>
    )
  }

  return (
    <div className="panel mb-5">
      <div className="panel-header">
        <h2>⚠️ Materiales bajo stock mínimo
          <span className="ml-2 badge badge-red">{alertas.length}</span>
          <span className="ml-2 text-xs text-green-600 font-normal">● En tiempo real</span>
        </h2>
        <Link href="/materiales?bajo_minimo=1" className="btn btn-ghost btn-sm">Ver todos →</Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Código</th>
              <th className="th">Descripción</th>
              <th className="th">Ubicación</th>
              <th className="th td-r">Stock actual</th>
              <th className="th td-r">Mínimo</th>
              <th className="th">Estado</th>
            </tr>
          </thead>
          <tbody>
            {alertas.map(a => (
              <tr key={a.id} className="bg-red-50/50 hover:bg-red-50 transition-colors">
                <td className="td"><span className="code">{a.codigo}</span></td>
                <td className="td font-medium text-red-900">{a.descripcion}</td>
                <td className="td text-xs text-slate-500">{a.ubicacion ?? '—'}</td>
                <td className="td-r font-bold text-red-700">{num(a.stock_actual)}</td>
                <td className="td-r text-slate-500">{num(a.stock_minimo)}</td>
                <td className="td">
                  {a.stock_actual <= 0
                    ? <span className="badge badge-red">Sin stock</span>
                    : <span className="badge badge-yellow">Bajo mínimo</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
