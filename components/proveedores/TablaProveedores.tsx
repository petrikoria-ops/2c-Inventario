'use client'
import { useState, useMemo, useCallback } from 'react'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/contexts/ToastContext'
import type { Proveedor } from '@/types'

const BLANK: Partial<Proveedor> = { plazo_dias: 7, activo: true }

export default function TablaProveedores({ initialData }: { initialData: Proveedor[] }) {
  const { showToast } = useToast()
  const [items, setItems]       = useState<Proveedor[]>(initialData)
  const [q, setQ]               = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando]   = useState<Partial<Proveedor>>(BLANK)
  const [saving, setSaving]       = useState(false)

  const filtered = useMemo(() =>
    items.filter(p => !q || [p.nombre,p.rut,p.contacto].some(s => s?.toLowerCase().includes(q.toLowerCase())))
  , [items, q])

  const guardar = useCallback(async () => {
    setSaving(true)
    try {
      const method = editando.id ? 'PUT' : 'POST'
      const url    = editando.id ? `/api/proveedores/${editando.id}` : '/api/proveedores'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editando) })
      if (!res.ok) throw new Error((await res.json()).error)
      const updated = await (await fetch('/api/proveedores')).json()
      setItems(updated)
      showToast(editando.id ? 'Proveedor actualizado' : 'Proveedor creado', 'success')
      setModalOpen(false)
    } catch (e: any) { showToast(e.message, 'error') }
    finally { setSaving(false) }
  }, [editando, showToast])

  const eliminar = useCallback(async (p: Proveedor) => {
    if (!confirm(`¿Eliminar "${p.nombre}"?`)) return
    await fetch(`/api/proveedores/${p.id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(x => x.id !== p.id))
    showToast('Proveedor eliminado')
  }, [showToast])

  return (
    <>
      <div className="panel">
        <div className="panel-header">
          <h2>🏭 Proveedores</h2>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditando(BLANK); setModalOpen(true) }}>+ Nuevo</button>
        </div>
        <div className="filters">
          <input className="input w-52" placeholder="🔍 Nombre, RUT, contacto…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              <th className="th">Nombre</th><th className="th">RUT</th><th className="th">Contacto</th>
              <th className="th">Teléfono</th><th className="th">Email</th><th className="th">Plazo</th><th className="th">Acciones</th>
            </tr></thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="tr-hover">
                  <td className="td font-medium">{p.nombre}</td>
                  <td className="td text-xs text-slate-500">{p.rut ?? '—'}</td>
                  <td className="td">{p.contacto ?? '—'}</td>
                  <td className="td text-xs">{p.telefono ?? '—'}</td>
                  <td className="td">{p.email ? <a href={`mailto:${p.email}`} className="text-blue-600 hover:underline text-xs">{p.email}</a> : '—'}</td>
                  <td className="td"><span className="badge badge-blue">{p.plazo_dias}d</span></td>
                  <td className="td"><div className="flex gap-0.5">
                    <button className="btn-icon" onClick={() => { setEditando({ ...p }); setModalOpen(true) }}>✏️</button>
                    <button className="btn-icon" onClick={() => eliminar(p)}>🗑</button>
                  </div></td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={7} className="text-center py-8 text-slate-400">📭 Sin proveedores</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} title={editando.id ? `Editar — ${editando.nombre}` : 'Nuevo proveedor'}
        onClose={() => setModalOpen(false)} onSave={guardar} saving={saving}>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className="label">Nombre *</label><input className="input" value={editando.nombre??''} onChange={e=>setEditando(p=>({...p,nombre:e.target.value}))} /></div>
          <div><label className="label">RUT</label><input className="input" value={editando.rut??''} onChange={e=>setEditando(p=>({...p,rut:e.target.value}))} placeholder="76.123.456-7" /></div>
          <div><label className="label">Plazo entrega (días)</label><input type="number" className="input" min="1" value={editando.plazo_dias??7} onChange={e=>setEditando(p=>({...p,plazo_dias:parseInt(e.target.value)}))} /></div>
          <div><label className="label">Contacto</label><input className="input" value={editando.contacto??''} onChange={e=>setEditando(p=>({...p,contacto:e.target.value}))} /></div>
          <div><label className="label">Teléfono</label><input className="input" value={editando.telefono??''} onChange={e=>setEditando(p=>({...p,telefono:e.target.value}))} /></div>
          <div className="col-span-2"><label className="label">Email</label><input type="email" className="input" value={editando.email??''} onChange={e=>setEditando(p=>({...p,email:e.target.value}))} /></div>
          <div className="col-span-2"><label className="label">Dirección</label><input className="input" value={editando.direccion??''} onChange={e=>setEditando(p=>({...p,direccion:e.target.value}))} /></div>
          <div className="col-span-2"><label className="label">Notas</label><textarea className="textarea" value={editando.notas??''} onChange={e=>setEditando(p=>({...p,notas:e.target.value}))} /></div>
        </div>
      </Modal>
    </>
  )
}
