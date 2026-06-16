'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Printer, Trash2, ClipboardList } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { fechaCorta } from '@/lib/utils'
import type { SolicitudCompra } from '@/types'

type SolicitudRow = SolicitudCompra & { items_count: number }

export default function TablaSolicitudes({ initialData }: { initialData: SolicitudRow[] }) {
  const [rows, setRows] = useState<SolicitudRow[]>(initialData)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const { showToast } = useToast()
  const router = useRouter()

  const toggleEstado = useCallback(async (sol: SolicitudRow) => {
    const nuevoEstado = sol.estado === 'pendiente' ? 'comprado' : 'pendiente'
    const res = await fetch(`/api/solicitudes/${sol.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevoEstado }),
    })
    if (!res.ok) { showToast('Error al cambiar estado', 'error'); return }
    setRows(prev => prev.map(r => r.id === sol.id ? { ...r, estado: nuevoEstado } : r))
    showToast(`Solicitud marcada como "${nuevoEstado}"`, 'success')
  }, [showToast])

  const handleDelete = useCallback(async (id: number, numero: string) => {
    if (!confirm(`¿Eliminar la solicitud ${numero}? Esta acción no se puede deshacer.`)) return
    setDeletingId(id)
    const res = await fetch(`/api/solicitudes/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setRows(prev => prev.filter(r => r.id !== id))
      showToast(`Solicitud ${numero} eliminada`, 'success')
      router.refresh()
    } else {
      showToast('Error al eliminar', 'error')
    }
    setDeletingId(null)
  }, [showToast, router])

  if (rows.length === 0) {
    return (
      <div className="panel py-16 text-center">
        <ClipboardList size={36} className="mx-auto mb-3" style={{ color: '#D8D8D8' }} />
        <p className="font-medium mb-1 text-slate-500">No hay solicitudes de compra</p>
        <p className="text-sm mb-4 text-slate-400">Crea una para comenzar a gestionar tus compras</p>
        <Link href="/solicitudes/nueva" className="btn btn-primary btn-sm">+ Nueva solicitud</Link>
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
              <th className="th td-r">Ítems</th>
              <th className="th">Estado</th>
              <th className="th">Observaciones</th>
              <th className="th">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(sol => (
              <tr key={sol.id} className="tr-hover">
                <td className="td">
                  <span className="code font-bold" style={{ color: '#2E333A' }}>{sol.numero}</span>
                </td>
                <td className="td text-sm text-slate-600">{fechaCorta(sol.fecha)}</td>
                <td className="td-r">
                  <span className="badge badge-blue">{sol.items_count}</span>
                </td>
                <td className="td">
                  <button
                    onClick={() => toggleEstado(sol)}
                    title="Clic para cambiar estado"
                    className={`badge cursor-pointer hover:opacity-80 transition-opacity select-none
                      ${sol.estado === 'comprado' ? 'badge-green' : 'badge-yellow'}`}
                  >
                    {sol.estado === 'comprado' ? 'Comprado' : 'Pendiente'}
                  </button>
                </td>
                <td className="td text-sm text-slate-500 max-w-[220px] truncate" title={sol.observaciones ?? ''}>
                  {sol.observaciones ?? '—'}
                </td>
                <td className="td">
                  <div className="flex gap-1">
                    <Link href={`/solicitudes/${sol.id}/imprimir`} className="btn btn-ghost btn-sm" title="Ver e imprimir">
                      <Printer size={13} /> Ver
                    </Link>
                    <button
                      onClick={() => handleDelete(sol.id, sol.numero)}
                      disabled={deletingId === sol.id}
                      className="btn btn-ghost btn-sm"
                      style={{ color: '#DC2626' }}
                      title="Eliminar solicitud"
                    >
                      {deletingId === sol.id ? '…' : <Trash2 size={13} />}
                    </button>
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
