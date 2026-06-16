'use client'
import { useState, useMemo, useCallback } from 'react'
import Modal from '@/components/ui/Modal'
import { BadgeEstadoHer } from '@/components/ui/Badge'
import { diasHastaMant, fechaCorta } from '@/lib/utils'
import { useToast } from '@/contexts/ToastContext'
import type { Herramienta } from '@/types'

const ESTADOS = ['operativa','en_reparacion','extraviada','dada_de_baja']
const BLANK: Partial<Herramienta> = { estado: 'operativa', frecuencia_mant_dias: 365 }

export default function TablaHerramientas({ initialData }: { initialData: Herramienta[] }) {
  const { showToast } = useToast()
  const [items, setItems]         = useState<Herramienta[]>(initialData)
  const [q, setQ]                 = useState('')
  const [filtroEst, setFiltroEst] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando]   = useState<Partial<Herramienta>>(BLANK)
  const [saving, setSaving]       = useState(false)

  const filtered = useMemo(() =>
    items.filter(h => {
      const mq = !q || h.codigo.toLowerCase().includes(q.toLowerCase()) || h.descripcion.toLowerCase().includes(q.toLowerCase())
      const me = !filtroEst || h.estado === filtroEst
      return mq && me
    }), [items, q, filtroEst])

  const guardar = useCallback(async () => {
    if (!editando.codigo?.trim())      { showToast('El código es obligatorio', 'error'); return }
    if (!editando.descripcion?.trim()) { showToast('La descripción es obligatoria', 'error'); return }
    setSaving(true)
    try {
      const method = editando.id ? 'PUT' : 'POST'
      const url    = editando.id ? `/api/herramientas/${editando.id}` : '/api/herramientas'
      const payload = { ...editando, activo: true }
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error((await res.json()).error)
      const updated = await (await fetch('/api/herramientas')).json()
      setItems(updated)
      showToast(editando.id ? 'Herramienta actualizada' : 'Herramienta creada', 'success')
      setModalOpen(false)
    } catch (e: any) { showToast(e.message, 'error') }
    finally { setSaving(false) }
  }, [editando, showToast])

  const eliminar = useCallback(async (h: Herramienta) => {
    if (!confirm(`¿Eliminar "${h.descripcion}"?`)) return
    const res = await fetch(`/api/herramientas/${h.id}`, { method: 'DELETE' })
    if (!res.ok) { showToast('Error al eliminar la herramienta', 'error'); return }
    setItems(prev => prev.filter(x => x.id !== h.id))
    showToast('Herramienta eliminada', 'success')
  }, [showToast])

  return (
    <>
      <div className="panel">
        <div className="panel-header">
          <h2>🔧 Herramientas</h2>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditando(BLANK); setModalOpen(true) }}>+ Nueva</button>
        </div>
        <div className="filters">
          <input className="input w-52" placeholder="🔍 Código, descripción…" value={q} onChange={e => setQ(e.target.value)} />
          <select className="select w-auto" value={filtroEst} onChange={e => setFiltroEst(e.target.value)}>
            <option value="">Todos los estados</option>
            {ESTADOS.map(e => <option key={e} value={e}>{e.replace('_',' ')}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Código</th><th className="th">Descripción</th><th className="th">Marca / Modelo</th>
                <th className="th">Estado</th><th className="th">Responsable</th><th className="th">Ubicación</th>
                <th className="th">Próx. mantención</th><th className="th">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(h => {
                const dias = diasHastaMant(h.fecha_ultima_mant, h.frecuencia_mant_dias)
                return (
                  <tr key={h.id} className="tr-hover">
                    <td className="td"><span className="code">{h.codigo}</span></td>
                    <td className="td font-medium">{h.descripcion}</td>
                    <td className="td text-xs text-slate-500">{[h.marca, h.modelo].filter(Boolean).join(' ')}</td>
                    <td className="td"><BadgeEstadoHer estado={h.estado} /></td>
                    <td className="td text-xs">{h.responsable ?? '—'}</td>
                    <td className="td text-xs text-slate-500">{h.ubicacion ?? '—'}</td>
                    <td className="td">
                      {dias === null ? '—' :
                        dias < 0  ? <span className="badge badge-red">Vencida {Math.abs(dias)}d</span> :
                        dias <= 30 ? <span className="badge badge-yellow">En {dias}d</span> :
                                    <span className="badge badge-green">En {dias}d</span>}
                    </td>
                    <td className="td">
                      <div className="flex gap-0.5">
                        <button className="btn-icon" onClick={() => { setEditando({ ...h }); setModalOpen(true) }}>✏️</button>
                        <button className="btn-icon" onClick={() => eliminar(h)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!filtered.length && <tr><td colSpan={8} className="text-center py-8 text-slate-400">📭 Sin herramientas</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} title={editando.id ? `Editar — ${editando.codigo}` : 'Nueva herramienta'}
        onClose={() => setModalOpen(false)} onSave={guardar} saving={saving}>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Código *</label><input className="input" value={editando.codigo??''} onChange={e=>setEditando(p=>({...p,codigo:e.target.value}))} /></div>
          <div><label className="label">Estado</label>
            <select className="select" value={editando.estado??'operativa'} onChange={e=>setEditando(p=>({...p,estado:e.target.value as any}))}>
              {ESTADOS.map(e=><option key={e} value={e}>{e.replace('_',' ')}</option>)}
            </select>
          </div>
          <div className="col-span-2"><label className="label">Descripción *</label><input className="input" value={editando.descripcion??''} onChange={e=>setEditando(p=>({...p,descripcion:e.target.value}))} /></div>
          <div><label className="label">Marca</label><input className="input" value={editando.marca??''} onChange={e=>setEditando(p=>({...p,marca:e.target.value}))} /></div>
          <div><label className="label">Modelo</label><input className="input" value={editando.modelo??''} onChange={e=>setEditando(p=>({...p,modelo:e.target.value}))} /></div>
          <div><label className="label">Responsable</label><input className="input" value={editando.responsable??''} onChange={e=>setEditando(p=>({...p,responsable:e.target.value}))} /></div>
          <div><label className="label">Ubicación</label><input className="input" value={editando.ubicacion??''} onChange={e=>setEditando(p=>({...p,ubicacion:e.target.value}))} /></div>
          <div><label className="label">Última mantención</label><input type="date" className="input" value={fechaCorta(editando.fecha_ultima_mant)} onChange={e=>setEditando(p=>({...p,fecha_ultima_mant:e.target.value}))} /></div>
          <div><label className="label">Frecuencia mant. (días)</label><input type="number" className="input" min="1" value={editando.frecuencia_mant_dias??365} onChange={e=>setEditando(p=>({...p,frecuencia_mant_dias:parseInt(e.target.value)}))} /></div>
          <div className="col-span-2"><label className="label">Notas</label><textarea className="textarea" value={editando.notas??''} onChange={e=>setEditando(p=>({...p,notas:e.target.value}))} /></div>
        </div>
      </Modal>
    </>
  )
}
