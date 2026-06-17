'use client'
import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Pencil, Trash2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/contexts/ToastContext'
import type { Trabajador } from '@/types'

const BLANK: Partial<Trabajador> = { nombre: '', rut: '', cargo: '', telefono: '' }

export default function TablaTrabjadores({ initialData }: { initialData: Trabajador[] }) {
  const router = useRouter()
  const { showToast } = useToast()

  const [items,      setItems]      = useState<Trabajador[]>(initialData)
  useEffect(() => { setItems(initialData) }, [initialData])
  const [modalOpen,  setModalOpen]  = useState(false)
  const [editando,   setEditando]   = useState<Partial<Trabajador>>(BLANK)
  const [saving,     setSaving]     = useState(false)

  const guardar = useCallback(async () => {
    if (!editando.nombre?.trim()) { showToast('El nombre es obligatorio', 'error'); return }
    setSaving(true)
    try {
      const isEdit = !!editando.id
      const method = isEdit ? 'PUT' : 'POST'
      const url    = isEdit ? `/api/trabajadores/${editando.id}` : '/api/trabajadores'
      const payload = { ...editando, activo: true }
      delete (payload as any).id

      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al guardar')

      if (isEdit) {
        setItems(prev => prev.map(t => t.id === editando.id ? { ...t, ...payload, id: editando.id! } as Trabajador : t))
      } else {
        const saved = await res.json()
        if (saved?.id) setItems(prev => [...prev, saved as Trabajador])
      }

      router.refresh()
      showToast(isEdit ? 'Trabajador actualizado' : 'Trabajador creado', 'success')
      setModalOpen(false)
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }, [editando, router, showToast])

  const eliminar = useCallback(async (t: Trabajador) => {
    if (!confirm(`¿Desactivar a "${t.nombre}"?`)) return
    const res = await fetch(`/api/trabajadores/${t.id}`, { method: 'DELETE' })
    if (!res.ok) { showToast('Error al eliminar', 'error'); return }
    setItems(prev => prev.filter(x => x.id !== t.id))
    router.refresh()
    showToast('Trabajador desactivado', 'success')
  }, [router, showToast])

  return (
    <>
      <div className="panel">
        <div className="panel-header">
          <Users size={14} style={{ color: '#909090', flexShrink: 0 }} />
          <h2>Trabajadores</h2>
          <a href="/herramientas/entregar" className="btn btn-outline btn-sm ml-auto">
            Entregar herramientas →
          </a>
          <button className="btn btn-primary btn-sm"
            onClick={() => { setEditando(BLANK); setModalOpen(true) }}>
            + Nuevo
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Nombre</th>
                <th className="th">RUT</th>
                <th className="th">Cargo</th>
                <th className="th">Teléfono</th>
                <th className="th">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map(t => (
                <tr key={t.id} className="tr-hover">
                  <td className="td font-medium">{t.nombre}</td>
                  <td className="td text-xs text-slate-500">{t.rut ?? '—'}</td>
                  <td className="td text-xs text-slate-500">{t.cargo ?? '—'}</td>
                  <td className="td text-xs text-slate-500">{t.telefono ?? '—'}</td>
                  <td className="td">
                    <div className="flex gap-0.5">
                      <button className="btn-icon" title="Editar"
                        onClick={() => { setEditando({ ...t }); setModalOpen(true) }}>
                        <Pencil size={13} />
                      </button>
                      <button className="btn-icon" title="Desactivar" onClick={() => eliminar(t)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr><td colSpan={5} className="text-center py-10 text-slate-400">Sin trabajadores registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} title={editando.id ? `Editar — ${editando.nombre}` : 'Nuevo trabajador'}
        onClose={() => setModalOpen(false)} onSave={guardar} saving={saving}>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Nombre completo *</label>
            <input className="input" value={editando.nombre ?? ''} onChange={e => setEditando(p => ({ ...p, nombre: e.target.value }))} />
          </div>
          <div>
            <label className="label">RUT</label>
            <input className="input" placeholder="12.345.678-9" value={editando.rut ?? ''}
              onChange={e => setEditando(p => ({ ...p, rut: e.target.value }))} />
          </div>
          <div>
            <label className="label">Cargo</label>
            <input className="input" placeholder="Técnico, Operario…" value={editando.cargo ?? ''}
              onChange={e => setEditando(p => ({ ...p, cargo: e.target.value }))} />
          </div>
          <div>
            <label className="label">Teléfono</label>
            <input className="input" value={editando.telefono ?? ''}
              onChange={e => setEditando(p => ({ ...p, telefono: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </>
  )
}
