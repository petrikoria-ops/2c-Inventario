'use client'
import { useState, useMemo, useCallback } from 'react'
import Modal from '@/components/ui/Modal'
import { BadgeEstadoProy } from '@/components/ui/Badge'
import { clp, fechaCorta, num } from '@/lib/utils'
import { useToast } from '@/contexts/ToastContext'
import type { Movimiento, Proyecto } from '@/types'

const ESTADOS = ['presupuesto','en_proceso','terminado','entregado','cancelado']
const BLANK: Partial<Proyecto> = { estado: 'en_proceso' }

export default function TablaProyectos({ initialData }: { initialData: Proyecto[] }) {
  const { showToast } = useToast()
  const [items, setItems]       = useState<Proyecto[]>(initialData)
  const [q, setQ]               = useState('')
  const [filtroEst, setFiltroEst] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando]   = useState<Partial<Proyecto>>(BLANK)
  const [saving, setSaving]       = useState(false)
  const [detalle, setDetalle]     = useState<(Proyecto & { movimientos: Movimiento[] }) | null>(null)

  const filtered = useMemo(() =>
    items.filter(p =>
      (!q || [p.ot, p.nombre, p.cliente].some(s => s?.toLowerCase().includes(q.toLowerCase()))) &&
      (!filtroEst || p.estado === filtroEst)
    ), [items, q, filtroEst])

  const reload = useCallback(async () => {
    const r = await (await fetch('/api/proyectos')).json()
    setItems(r)
  }, [])

  const guardar = useCallback(async () => {
    setSaving(true)
    try {
      const method = editando.id ? 'PUT' : 'POST'
      const url    = editando.id ? `/api/proyectos/${editando.id}` : '/api/proyectos'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editando) })
      if (!res.ok) throw new Error((await res.json()).error)
      await reload()
      showToast(editando.id ? 'Proyecto actualizado' : 'Proyecto creado', 'success')
      setModalOpen(false)
    } catch (e: any) { showToast(e.message, 'error') }
    finally { setSaving(false) }
  }, [editando, reload, showToast])

  const verDetalle = useCallback(async (p: Proyecto) => {
    const res = await fetch(`/api/proyectos/${p.id}`)
    setDetalle(await res.json())
  }, [])

  const eliminar = useCallback(async (p: Proyecto) => {
    if (!confirm(`¿Eliminar "${p.ot}"?`)) return
    await fetch(`/api/proyectos/${p.id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(x => x.id !== p.id))
    showToast('Proyecto eliminado')
  }, [showToast])

  return (
    <>
      <div className="panel">
        <div className="panel-header">
          <h2>📋 Proyectos / Órdenes de Trabajo</h2>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditando(BLANK); setModalOpen(true) }}>+ Nueva OT</button>
        </div>
        <div className="filters">
          <input className="input w-52" placeholder="🔍 OT, nombre, cliente…" value={q} onChange={e => setQ(e.target.value)} />
          <select className="select w-auto" value={filtroEst} onChange={e => setFiltroEst(e.target.value)}>
            <option value="">Todos los estados</option>
            {ESTADOS.map(e => <option key={e} value={e}>{e.replace('_',' ')}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              <th className="th">OT</th><th className="th">Nombre</th><th className="th">Cliente</th>
              <th className="th">Estado</th><th className="th">Inicio</th><th className="th">Entrega</th>
              <th className="th text-right">Costo mat.</th><th className="th">Acciones</th>
            </tr></thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="tr-hover">
                  <td className="td"><span className="code">{p.ot}</span></td>
                  <td className="td font-medium">{p.nombre}</td>
                  <td className="td text-slate-600">{p.cliente ?? '—'}</td>
                  <td className="td"><BadgeEstadoProy estado={p.estado} /></td>
                  <td className="td text-xs text-slate-500">{fechaCorta(p.fecha_inicio)}</td>
                  <td className="td text-xs text-slate-500">{fechaCorta(p.fecha_entrega)}</td>
                  <td className="td-r font-medium text-slate-700">{clp(p.costo_total)}</td>
                  <td className="td"><div className="flex gap-0.5">
                    <button className="btn-icon" title="Ver movimientos" onClick={() => verDetalle(p)}>📜</button>
                    <a href={`/proyectos/${p.id}/factibilidad`} className="btn-icon" title="Factibilidad">🔍</a>
                    <button className="btn-icon" title="Editar" onClick={() => { setEditando({ ...p }); setModalOpen(true) }}>✏️</button>
                    <button className="btn-icon" title="Eliminar" onClick={() => eliminar(p)}>🗑</button>
                  </div></td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={8} className="text-center py-8 text-slate-400">📭 Sin proyectos</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} title={editando.id ? `Editar — ${editando.ot}` : 'Nueva Orden de Trabajo'}
        onClose={() => setModalOpen(false)} onSave={guardar} saving={saving}>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">N° OT *</label><input className="input" value={editando.ot??''} onChange={e=>setEditando(p=>({...p,ot:e.target.value}))} placeholder="OT-2026-005" /></div>
          <div><label className="label">Estado</label>
            <select className="select" value={editando.estado??'en_proceso'} onChange={e=>setEditando(p=>({...p,estado:e.target.value as any}))}>
              {ESTADOS.map(e=><option key={e} value={e}>{e.replace('_',' ')}</option>)}
            </select>
          </div>
          <div className="col-span-2"><label className="label">Nombre / Tablero *</label><input className="input" value={editando.nombre??''} onChange={e=>setEditando(p=>({...p,nombre:e.target.value}))} /></div>
          <div className="col-span-2"><label className="label">Cliente</label><input className="input" value={editando.cliente??''} onChange={e=>setEditando(p=>({...p,cliente:e.target.value}))} /></div>
          <div><label className="label">Fecha inicio</label><input type="date" className="input" value={editando.fecha_inicio??''} onChange={e=>setEditando(p=>({...p,fecha_inicio:e.target.value}))} /></div>
          <div><label className="label">Fecha entrega</label><input type="date" className="input" value={editando.fecha_entrega??''} onChange={e=>setEditando(p=>({...p,fecha_entrega:e.target.value}))} /></div>
          <div className="col-span-2"><label className="label">Notas</label><textarea className="textarea" value={editando.notas??''} onChange={e=>setEditando(p=>({...p,notas:e.target.value}))} /></div>
        </div>
      </Modal>

      {/* Detalle con movimientos */}
      <Modal open={!!detalle} title={detalle ? `Detalle OT — ${detalle.nombre}` : ''}
        onClose={() => setDetalle(null)} hideFooter wide>
        {detalle && (
          <>
            <div className="flex flex-wrap gap-4 mb-3 text-sm">
              <span><strong>OT:</strong> {detalle.ot}</span>
              <span><strong>Cliente:</strong> {detalle.cliente ?? '—'}</span>
              <BadgeEstadoProy estado={detalle.estado} />
            </div>
            <div className="alert alert-blue mb-3">
              Costo total de materiales: <strong>{clp(detalle.movimientos?.reduce((s,m)=>s+(m.cantidad*(m.precio_unit??0)),0)??0)}</strong>
              &nbsp;— {detalle.movimientos?.length} movimiento(s)
            </div>
            {detalle.movimientos?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr>
                    <th className="th">Fecha</th><th className="th">Código</th><th className="th">Descripción</th>
                    <th className="th text-right">Cant.</th><th className="th text-right">Precio U.</th><th className="th text-right">Subtotal</th>
                  </tr></thead>
                  <tbody>
                    {detalle.movimientos.map(m=>(
                      <tr key={m.id} className="tr-hover">
                        <td className="td text-xs text-slate-500">{fechaCorta(m.fecha)}</td>
                        <td className="td"><span className="code">{(m.materiales as any)?.codigo}</span></td>
                        <td className="td">{(m.materiales as any)?.descripcion}</td>
                        <td className="td-r">{num(m.cantidad)} <span className="text-slate-400 text-xs">{(m.materiales as any)?.unidad}</span></td>
                        <td className="td-r text-slate-500">{clp(m.precio_unit)}</td>
                        <td className="td-r font-medium">{clp(m.cantidad*(m.precio_unit??0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-center py-6 text-slate-400">📭 Sin materiales consumidos</p>}
          </>
        )}
      </Modal>
    </>
  )
}
