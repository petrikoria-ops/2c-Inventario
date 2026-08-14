'use client'
import { useState, useCallback } from 'react'
import { PackageOpen, Check, X, Truck } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { fechaHora, cn } from '@/lib/utils'
import type { PedidoBodega, EstadoPedidoBodega } from '@/types'

const ESTADO_BADGE: Record<EstadoPedidoBodega, [string, string]> = {
  pendiente:  ['badge-yellow', 'Pendiente'],
  aprobado:   ['badge-blue',   'Aprobado'],
  rechazado:  ['badge-red',    'Rechazado'],
  despachado: ['badge-green',  'Despachado'],
  cancelado:  ['badge-gray',   'Cancelado'],
}

interface Props {
  initialData: PedidoBodega[]
  puedeAprobar?: boolean
  puedeDespachar?: boolean
}

export default function TablaPedidos({ initialData, puedeAprobar = false, puedeDespachar = false }: Props) {
  const [rows, setRows] = useState<PedidoBodega[]>(initialData)
  const [busyId, setBusyId] = useState<number | null>(null)
  const { showToast } = useToast()

  const cambiarEstado = useCallback(async (id: number, estado: EstadoPedidoBodega) => {
    setBusyId(id)
    try {
      const res = await fetch(`/api/pedidos-bodega/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al actualizar')
      setRows(prev => prev.map(r => r.id === id ? data : r))
      showToast(`Pedido ${data.numero}: ${ESTADO_BADGE[estado as EstadoPedidoBodega][1].toLowerCase()}`, 'success')
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setBusyId(null)
    }
  }, [showToast])

  if (rows.length === 0) {
    return (
      <div className="panel py-16 text-center">
        <PackageOpen size={36} className="mx-auto mb-3" style={{ color: '#D8D8D8' }} />
        <p className="font-medium mb-1 text-brand-n500">No hay pedidos a bodega</p>
      </div>
    )
  }

  return (
    <div className="panel">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">N° Pedido</th>
              <th className="th">Fecha</th>
              <th className="th">Solicitante</th>
              <th className="th">Obra</th>
              <th className="th td-r">Ítems</th>
              <th className="th">Estado</th>
              <th className="th">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(p => (
              <tr key={p.id} className="tr-hover">
                <td className="td"><span className="code font-bold" style={{ color: '#2E333A' }}>{p.numero}</span></td>
                <td className="td text-sm text-slate-600">{fechaHora(p.creado_en)}</td>
                <td className="td text-sm">{p.solicitante_nombre}</td>
                <td className="td text-sm text-brand-n500">{p.proyectos ? <span className="code">{p.proyectos.ot}</span> : '—'}</td>
                <td className="td-r"><span className="badge badge-blue">{p.pedidos_bodega_items?.length ?? 0}</span></td>
                <td className="td"><span className={cn('badge', ESTADO_BADGE[p.estado][0])}>{ESTADO_BADGE[p.estado][1]}</span></td>
                <td className="td">
                  <div className="flex gap-1">
                    {puedeAprobar && p.estado === 'pendiente' && (
                      <>
                        <button onClick={() => cambiarEstado(p.id, 'aprobado')} disabled={busyId === p.id}
                          className="btn btn-ghost btn-sm" style={{ color: '#059669' }} title="Aprobar">
                          <Check size={13} /> Aprobar
                        </button>
                        <button onClick={() => cambiarEstado(p.id, 'rechazado')} disabled={busyId === p.id}
                          className="btn btn-ghost btn-sm" style={{ color: '#DC2626' }} title="Rechazar">
                          <X size={13} /> Rechazar
                        </button>
                      </>
                    )}
                    {puedeDespachar && p.estado === 'aprobado' && (
                      <button onClick={() => cambiarEstado(p.id, 'despachado')} disabled={busyId === p.id}
                        className="btn btn-outline btn-sm" title="Marcar como despachado una vez armado y entregado">
                        <Truck size={13} /> Marcar despachado
                      </button>
                    )}
                    {!((puedeAprobar && p.estado === 'pendiente') || (puedeDespachar && p.estado === 'aprobado')) && (
                      <span className="text-xs text-brand-n500">—</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
