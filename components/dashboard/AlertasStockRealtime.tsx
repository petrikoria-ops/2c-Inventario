'use client'
import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle, Wifi, WifiOff } from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { fetchAllMateriales } from '@/lib/supabase/fetchAll'
import { num, estaBajoMinimo } from '@/lib/utils'
import Link from 'next/link'

interface Alerta {
  id: number
  codigo: string
  descripcion: string
  stock_actual: number
  stock_minimo: number
  ubicacion: string | null
}

// El panel del dashboard es un resumen, no el listado completo — se muestran
// solo los más urgentes (menor stock primero) y el resto se ve en
// /materiales?bajo_minimo=1, que sí pagina la tabla completa.
const MAX_VISIBLES = 50

export default function AlertasStockRealtime({ initialAlertas }: { initialAlertas: Alerta[] }) {
  const [alertas, setAlertas]       = useState<Alerta[]>(initialAlertas)
  const [realtimeOk, setRealtimeOk] = useState(true)

  useEffect(() => {
    const sb = getSupabaseBrowser()

    const channel = sb
      .channel('stock-alertas')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'materiales' },
        async () => {
          try {
            const mats = await fetchAllMateriales<Alerta>(sb, 'id,codigo,descripcion,stock_actual,stock_minimo,ubicacion')
            setAlertas(mats.filter(m => estaBajoMinimo(m.stock_actual, m.stock_minimo)))
            setRealtimeOk(true)
          } catch {
            setRealtimeOk(false)
          }
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED')                               setRealtimeOk(true)
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setRealtimeOk(false)
      })

    return () => { sb.removeChannel(channel) }
  }, [])

  if (!alertas.length) {
    return (
      <div className="alert alert-green mb-5">
        <CheckCircle size={15} />
        Todos los materiales están sobre el stock mínimo.
      </div>
    )
  }

  const visibles = [...alertas].sort((a, b) => a.stock_actual - b.stock_actual).slice(0, MAX_VISIBLES)

  return (
    <div className="panel mb-5">
      <div className="panel-header">
        <AlertTriangle size={14} style={{ color: '#D97706', flexShrink: 0 }} />
        <h2>
          Materiales bajo stock mínimo
          <span className="ml-2 badge badge-red">{alertas.length}</span>
          {realtimeOk
            ? <span className="ml-2 text-xs font-normal inline-flex items-center gap-1" style={{ color: '#059669' }}>
                <Wifi size={11} /> En tiempo real
              </span>
            : <span className="ml-2 text-xs font-normal inline-flex items-center gap-1" style={{ color: '#D97706' }} title="Suscripción en tiempo real inactiva — recarga para actualizar">
                <WifiOff size={11} /> Sin tiempo real
              </span>
          }
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
            {visibles.map(a => (
              <tr key={a.id} className="bg-red-50/40 hover:bg-red-50 transition-colors">
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
      {alertas.length > MAX_VISIBLES && (
        <div className="px-4 py-3 text-xs text-slate-500 border-t" style={{ borderColor: '#eceef1' }}>
          Mostrando los {MAX_VISIBLES} con menor stock de {alertas.length} en total — <Link href="/materiales?bajo_minimo=1" className="underline font-medium">ver todos →</Link>
        </div>
      )}
    </div>
  )
}
