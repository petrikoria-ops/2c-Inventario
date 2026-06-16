'use client'
import { useState, useMemo, useCallback } from 'react'
import { useToast } from '@/contexts/ToastContext'
import { fechaHora, num } from '@/lib/utils'
import type { ValeDespacho } from '@/types'

export default function TablaSalidas({ initialData }: { initialData: any[] }) {
  const [items, setItems] = useState<any[]>(initialData)
  const [q, setQ]         = useState('')
  const { showToast } = useToast()

  const filtered = useMemo(() =>
    items.filter(v =>
      !q || v.numero?.toLowerCase().includes(q.toLowerCase()) ||
            v.usuario?.toLowerCase().includes(q.toLowerCase()) ||
            v.proyectos?.ot?.toLowerCase().includes(q.toLowerCase())
    ), [items, q])

  const eliminar = useCallback(async (v: any) => {
    if (!confirm(`¿Eliminar vale ${v.numero}?\n\nNota: el stock no se revertirá automáticamente.`)) return
    const res = await fetch(`/api/salidas/${v.id}`, { method: 'DELETE' })
    if (!res.ok) { showToast('Error al eliminar', 'error'); return }
    setItems(prev => prev.filter(x => x.id !== v.id))
    showToast('Vale eliminado', 'success')
  }, [showToast])

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>📤 Vales de despacho</h2>
        <a href="/salidas/nueva" className="btn btn-primary btn-sm">+ Nuevo despacho</a>
      </div>
      <div className="filters">
        <input className="input w-64" placeholder="🔍 Número, usuario, OT…" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead><tr>
            <th className="th">N° Vale</th>
            <th className="th">Fecha</th>
            <th className="th">Proyecto</th>
            <th className="th">Solicitado por</th>
            <th className="th">Motivo</th>
            <th className="th text-right">Ítems</th>
            <th className="th">Acciones</th>
          </tr></thead>
          <tbody>
            {filtered.map(v => (
              <tr key={v.id} className="tr-hover">
                <td className="td"><span className="code">{v.numero}</span></td>
                <td className="td text-xs text-slate-500">{fechaHora(v.fecha)}</td>
                <td className="td text-slate-600">
                  {v.proyectos ? <><span className="code text-xs">{v.proyectos.ot}</span> {v.proyectos.nombre}</> : <span className="text-slate-400">—</span>}
                </td>
                <td className="td">{v.usuario}</td>
                <td className="td text-slate-500 text-sm">{v.motivo ?? '—'}</td>
                <td className="td text-right font-medium">{v.vales_despacho_items?.length ?? 0}</td>
                <td className="td">
                  <div className="flex gap-0.5">
                    <a href={`/salidas/${v.id}/imprimir`} className="btn-icon" title="Ver / Imprimir">🖨</a>
                    <button onClick={() => eliminar(v)} className="btn-icon" title="Eliminar">🗑</button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr><td colSpan={7} className="text-center py-8 text-slate-400">📭 Sin vales de despacho</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
