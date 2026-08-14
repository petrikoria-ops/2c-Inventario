'use client'
import { useState, useCallback } from 'react'
import { ClipboardList, Check, X } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { fechaHora, num, cn } from '@/lib/utils'
import type { SolicitudAjusteInventario, EstadoAjusteInventario, MotivoAjusteInventario } from '@/types'

const ESTADO_BADGE: Record<EstadoAjusteInventario, [string, string]> = {
  pendiente: ['badge-yellow', 'Pendiente'],
  aprobado:  ['badge-green',  'Aprobado'],
  rechazado: ['badge-red',    'Rechazado'],
}

const MOTIVO_LABEL: Record<MotivoAjusteInventario, string> = {
  conteo_fisico: 'Conteo físico',
  perdida: 'Pérdida',
  dano: 'Daño',
  error_registro: 'Error de registro',
  otro: 'Otro',
}

interface Props {
  initialData: SolicitudAjusteInventario[]
  puedeAprobar?: boolean
}

export default function TablaSolicitudesAjuste({ initialData, puedeAprobar = false }: Props) {
  const [rows, setRows] = useState<SolicitudAjusteInventario[]>(initialData)
  const [busyId, setBusyId] = useState<number | null>(null)
  const { showToast } = useToast()

  const resolver = useCallback(async (id: number, estado: 'aprobado' | 'rechazado') => {
    setBusyId(id)
    try {
      const res = await fetch(`/api/solicitudes-ajuste/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al actualizar')
      setRows(prev => prev.map(r => r.id === id ? data : r))
      showToast(estado === 'aprobado' ? `Ajuste aplicado — stock actualizado` : 'Solicitud rechazada', 'success')
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setBusyId(null)
    }
  }, [showToast])

  if (rows.length === 0) {
    return (
      <div className="panel py-16 text-center">
        <ClipboardList size={36} className="mx-auto mb-3" style={{ color: '#D8D8D8' }} />
        <p className="font-medium mb-1 text-brand-n500">No hay solicitudes de ajuste</p>
      </div>
    )
  }

  return (
    <div className="panel">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">N° Solicitud</th>
              <th className="th">Fecha</th>
              <th className="th">Material</th>
              <th className="th td-r">Sistema</th>
              <th className="th td-r">Real</th>
              <th className="th">Motivo</th>
              <th className="th">Estado</th>
              <th className="th">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(s => (
              <tr key={s.id} className="tr-hover">
                <td className="td"><span className="code font-bold" style={{ color: '#2E333A' }}>{s.numero}</span></td>
                <td className="td text-sm text-slate-600">{fechaHora(s.creado_en)}</td>
                <td className="td">
                  <span className="code text-xs">{s.codigo}</span>
                  <span className="text-xs text-brand-n500 ml-1">{s.descripcion}</span>
                </td>
                <td className="td-r text-slate-600">{num(s.stock_actual_sistema)}</td>
                <td className="td-r font-bold" style={{ color: s.cantidad_reportada < s.stock_actual_sistema ? '#DC2626' : '#059669' }}>
                  {num(s.cantidad_reportada)}
                </td>
                <td className="td text-xs text-brand-n500">{MOTIVO_LABEL[s.motivo]}</td>
                <td className="td"><span className={cn('badge', ESTADO_BADGE[s.estado][0])}>{ESTADO_BADGE[s.estado][1]}</span></td>
                <td className="td">
                  {puedeAprobar && s.estado === 'pendiente' ? (
                    <div className="flex gap-1">
                      <button onClick={() => resolver(s.id, 'aprobado')} disabled={busyId === s.id}
                        className="btn btn-ghost btn-sm" style={{ color: '#059669' }} title="Aprobar y aplicar al stock">
                        <Check size={13} /> Aprobar
                      </button>
                      <button onClick={() => resolver(s.id, 'rechazado')} disabled={busyId === s.id}
                        className="btn btn-ghost btn-sm" style={{ color: '#DC2626' }} title="Rechazar">
                        <X size={13} /> Rechazar
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-brand-n500">{s.aprobado_por_nombre ?? '—'}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
