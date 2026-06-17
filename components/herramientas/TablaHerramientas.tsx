'use client'
import { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Wrench, Search, Pencil, Trash2, X } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { BadgeEstadoHer } from '@/components/ui/Badge'
import { diasHastaMant, fechaCorta } from '@/lib/utils'
import { useToast } from '@/contexts/ToastContext'
import type { Herramienta } from '@/types'

const ESTADOS = ['operativa','en_reparacion','extraviada','dada_de_baja']
const BLANK: Partial<Herramienta> = { estado: 'operativa', frecuencia_mant_dias: 365 }

export default function TablaHerramientas({ initialData }: { initialData: Herramienta[] }) {
  const router                    = useRouter()
  const { showToast }             = useToast()
  const [items, setItems]         = useState<Herramienta[]>(initialData)
  useEffect(() => { setItems(initialData) }, [initialData])
  const [q, setQ]                 = useState('')
  const [filtroEst, setFiltroEst] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando]   = useState<Partial<Herramienta>>(BLANK)
  const [saving, setSaving]       = useState(false)

  // ── Selección múltiple ─────────────────────────────────────────
  const [selectedIds,   setSelectedIds]   = useState<Set<number>>(new Set())
  const [modalBulkEdit, setModalBulkEdit] = useState(false)
  const [bulkFields,    setBulkFields]    = useState<{
    estado?: string; responsable?: string; ubicacion?: string; frecuencia_mant_dias?: string
  }>({})
  const [bulkSaving,    setBulkSaving]    = useState(false)

  const filtered = useMemo(() =>
    items.filter(h => {
      const mq = !q || h.codigo.toLowerCase().includes(q.toLowerCase()) || h.descripcion.toLowerCase().includes(q.toLowerCase())
      const me = !filtroEst || h.estado === filtroEst
      return mq && me
    }), [items, q, filtroEst])

  // ── Selección ─────────────────────────────────────────────────
  const allFilteredSelected = filtered.length > 0 && filtered.every(h => selectedIds.has(h.id))
  const someSelected        = filtered.some(h => selectedIds.has(h.id))

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(prev => { const next = new Set(prev); filtered.forEach(h => next.delete(h.id)); return next })
    } else {
      setSelectedIds(prev => { const next = new Set(prev); filtered.forEach(h => next.add(h.id)); return next })
    }
  }
  const toggleOne = (id: number) =>
    setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  const clearSelection = () => setSelectedIds(new Set())

  // ── Bulk delete ────────────────────────────────────────────────
  const bulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds)
    if (!ids.length) return
    if (!confirm(`¿Eliminar ${ids.length} herramienta${ids.length !== 1 ? 's' : ''}?`)) return
    const res = await fetch('/api/herramientas/bulk', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
    if (!res.ok) { showToast('Error al eliminar', 'error'); return }
    setItems(prev => prev.filter(h => !ids.includes(h.id)))
    clearSelection()
    router.refresh()
    showToast(`${ids.length} herramienta${ids.length !== 1 ? 's' : ''} eliminada${ids.length !== 1 ? 's' : ''}`, 'success')
  }, [selectedIds, router, showToast])

  // ── Bulk edit ─────────────────────────────────────────────────
  const bulkEdit = useCallback(async () => {
    const ids = Array.from(selectedIds)
    if (!ids.length) return
    const fields: Record<string, unknown> = {}
    if (bulkFields.estado              && bulkFields.estado !== '')              fields.estado               = bulkFields.estado
    if (bulkFields.responsable         && bulkFields.responsable.trim() !== '')  fields.responsable          = bulkFields.responsable.trim()
    if (bulkFields.ubicacion           && bulkFields.ubicacion.trim() !== '')    fields.ubicacion            = bulkFields.ubicacion.trim()
    if (bulkFields.frecuencia_mant_dias && bulkFields.frecuencia_mant_dias !== '') fields.frecuencia_mant_dias = parseInt(bulkFields.frecuencia_mant_dias)

    if (!Object.keys(fields).length) { showToast('No hay campos para actualizar', 'error'); return }
    setBulkSaving(true)
    try {
      const res = await fetch('/api/herramientas/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, fields }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      // Actualizar state local con los nuevos campos
      setItems(prev => prev.map(h => ids.includes(h.id) ? { ...h, ...fields } as Herramienta : h))
      showToast(`${ids.length} herramienta${ids.length !== 1 ? 's' : ''} actualizada${ids.length !== 1 ? 's' : ''}`, 'success')
      setModalBulkEdit(false)
      clearSelection()
      router.refresh()
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setBulkSaving(false)
    }
  }, [selectedIds, bulkFields, router, showToast])

  // ── CRUD ───────────────────────────────────────────────────────
  const guardar = useCallback(async () => {
    if (!editando.codigo?.trim())      { showToast('El código es obligatorio', 'error'); return }
    if (!editando.descripcion?.trim()) { showToast('La descripción es obligatoria', 'error'); return }
    setSaving(true)
    try {
      const isEdit  = !!editando.id
      const method  = isEdit ? 'PUT' : 'POST'
      const url     = isEdit ? `/api/herramientas/${editando.id}` : '/api/herramientas'
      const payload = { ...editando, activo: true }
      delete (payload as any).id

      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al guardar')

      if (isEdit) {
        setItems(prev => prev.map(h =>
          h.id === editando.id ? { ...h, ...payload, id: editando.id! } as Herramienta : h
        ))
      } else {
        const saved = await res.json()
        if (saved?.id) {
          setItems(prev => [...prev, saved as Herramienta])
        } else {
          const listRes  = await fetch('/api/herramientas')
          const listData = await listRes.json()
          if (Array.isArray(listData)) setItems(listData)
        }
      }

      router.refresh()
      showToast(isEdit ? 'Herramienta actualizada' : 'Herramienta creada', 'success')
      setModalOpen(false)
    } catch (e: any) { showToast(e.message, 'error') }
    finally { setSaving(false) }
  }, [editando, router, showToast])

  const eliminar = useCallback(async (h: Herramienta) => {
    if (!confirm(`¿Eliminar "${h.descripcion}"?`)) return
    const res = await fetch(`/api/herramientas/${h.id}`, { method: 'DELETE' })
    if (!res.ok) { showToast('Error al eliminar la herramienta', 'error'); return }
    setItems(prev => prev.filter(x => x.id !== h.id))
    router.refresh()
    showToast('Herramienta eliminada', 'success')
  }, [router, showToast])

  const numSelected = selectedIds.size

  return (
    <>
      <div className="panel">
        <div className="panel-header">
          <Wrench size={14} style={{ color: '#909090', flexShrink: 0 }} />
          <h2>Herramientas</h2>
          <button className="btn btn-primary btn-sm ml-auto" onClick={() => { setEditando(BLANK); setModalOpen(true) }}>+ Nueva</button>
        </div>

        {/* ── Barra de selección múltiple ──────────────────────── */}
        {numSelected > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 border-b"
            style={{ background: '#FFF8E0', borderColor: '#F0C000' }}>
            <span className="text-sm font-semibold" style={{ color: '#2E333A' }}>
              {numSelected} seleccionada{numSelected !== 1 ? 's' : ''}
            </span>
            <button className="btn btn-sm btn-outline"
              onClick={() => { setBulkFields({}); setModalBulkEdit(true) }}>
              <Pencil size={12} /> Editar selección
            </button>
            <button className="btn btn-sm btn-danger" onClick={bulkDelete}>
              <Trash2 size={12} /> Eliminar selección
            </button>
            <button className="btn btn-ghost btn-sm ml-auto" onClick={clearSelection}>
              <X size={12} /> Deseleccionar
            </button>
          </div>
        )}

        <div className="filters">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#BBBBBB' }} />
            <input className="input w-52 pl-8" placeholder="Código, descripción…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <select className="select w-auto" value={filtroEst} onChange={e => setFiltroEst(e.target.value)}>
            <option value="">Todos los estados</option>
            {ESTADOS.map(e => <option key={e} value={e}>{e.replace('_',' ')}</option>)}
          </select>
          <span className="text-xs text-slate-400 ml-auto self-center">
            Mostrando <strong>{filtered.length}</strong> de {items.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th" style={{ width: 36, padding: '0 10px' }}>
                  <input type="checkbox"
                    checked={allFilteredSelected}
                    ref={el => { if (el) el.indeterminate = someSelected && !allFilteredSelected }}
                    onChange={toggleAll}
                    className="cursor-pointer"
                  />
                </th>
                <th className="th">Código</th>
                <th className="th">Descripción</th>
                <th className="th">Marca / Modelo</th>
                <th className="th">Estado</th>
                <th className="th">Responsable</th>
                <th className="th">Ubicación</th>
                <th className="th">Próx. mantención</th>
                <th className="th">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(h => {
                const dias       = diasHastaMant(h.fecha_ultima_mant, h.frecuencia_mant_dias)
                const isSelected = selectedIds.has(h.id)
                return (
                  <tr key={h.id} className={`tr-hover ${isSelected ? 'bg-amber-50/60' : ''}`}>
                    <td className="td" style={{ padding: '0 10px' }}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleOne(h.id)} className="cursor-pointer" />
                    </td>
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
                        <button className="btn-icon" title="Editar" onClick={() => { setEditando({ ...h }); setModalOpen(true) }}>
                          <Pencil size={13} />
                        </button>
                        <button className="btn-icon" title="Eliminar" onClick={() => eliminar(h)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!filtered.length && (
                <tr><td colSpan={9} className="text-center py-10 text-slate-400">Sin herramientas registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal CRUD ─────────────────────────────────────────── */}
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

      {/* ── Modal edición en bulk ─────────────────────────────── */}
      <Modal open={modalBulkEdit}
        title={`Editar ${numSelected} herramienta${numSelected !== 1 ? 's' : ''} seleccionada${numSelected !== 1 ? 's' : ''}`}
        onClose={() => setModalBulkEdit(false)} onSave={bulkEdit} saveLabel="Aplicar cambios" saving={bulkSaving}>
        <p className="text-xs text-slate-500 mb-4">Solo se actualizarán los campos que completes.</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Estado</label>
            <select className="select" value={bulkFields.estado ?? ''}
              onChange={e => setBulkFields(p => ({ ...p, estado: e.target.value }))}>
              <option value="">— no cambiar —</option>
              {ESTADOS.map(e => <option key={e} value={e}>{e.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Responsable</label>
            <input className="input" placeholder="— no cambiar —" value={bulkFields.responsable ?? ''}
              onChange={e => setBulkFields(p => ({ ...p, responsable: e.target.value }))} />
          </div>
          <div>
            <label className="label">Ubicación</label>
            <input className="input" placeholder="— no cambiar —" value={bulkFields.ubicacion ?? ''}
              onChange={e => setBulkFields(p => ({ ...p, ubicacion: e.target.value }))} />
          </div>
          <div>
            <label className="label">Frecuencia mant. (días)</label>
            <input className="input" type="number" min="1" placeholder="— no cambiar —"
              value={bulkFields.frecuencia_mant_dias ?? ''}
              onChange={e => setBulkFields(p => ({ ...p, frecuencia_mant_dias: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </>
  )
}
