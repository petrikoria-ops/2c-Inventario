'use client'
import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  ClipboardList, Search, ScrollText, ClipboardCheck, Building2, Pencil, Trash2,
  List, LayoutGrid, Calendar,
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { BadgeEstadoProy } from '@/components/ui/Badge'
import { clp, fechaCorta, num, cn } from '@/lib/utils'
import { useToast } from '@/contexts/ToastContext'
import TableroProyectos from '@/components/proyectos/TableroProyectos'
import CalendarioProyectos from '@/components/proyectos/CalendarioProyectos'
import { ESTADOS_PROY, ESTADO_PROY, type EstadoProy } from '@/lib/proyectos/estados'
import type { Movimiento, Proyecto } from '@/types'

const BLANK: Partial<Proyecto> = { estado: 'en_proceso' }

type Vista = 'tabla' | 'tablero' | 'calendario'
const VISTAS: { id: Vista; label: string; Icon: typeof List }[] = [
  { id: 'tabla',      label: 'Tabla',      Icon: List },
  { id: 'tablero',    label: 'Tablero',    Icon: LayoutGrid },
  { id: 'calendario', label: 'Calendario', Icon: Calendar },
]

// Solo "salida" representa consumo real del proyecto; "devolucion" debe
// restar ese consumo. "entrada"/"ajuste" no son costo atribuible al proyecto.
const calcCosto = (movs: unknown): number =>
  Array.isArray(movs)
    ? (movs as any[]).reduce((s, m) => {
        const monto = (m.cantidad ?? 0) * (m.precio_unit ?? 0)
        if (m.tipo === 'salida')     return s + monto
        if (m.tipo === 'devolucion') return s - monto
        return s
      }, 0)
    : 0

// Módulo de Obras con tres vistas sobre los MISMOS datos (patrón monday/ClickUp:
// vistas sobre un módulo, no módulos separados): Tabla (lista + CRUD completo),
// Tablero (kanban por estado) y Calendario (por fecha de entrega). La búsqueda
// aplica a todas; el filtro por estado aplica a Tabla y Calendario (en Tablero
// sobra, porque las columnas YA son los estados). Reemplaza a TablaProyectos.
export default function VistasProyectos({ initialData, editable = true }: { initialData: Proyecto[]; editable?: boolean }) {
  const { showToast } = useToast()
  const [items, setItems]       = useState<Proyecto[]>(initialData)
  const [q, setQ]               = useState('')
  const [filtroEst, setFiltroEst] = useState('')
  const [vista, setVista]       = useState<Vista>('tabla')
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando]   = useState<Partial<Proyecto>>(BLANK)
  const [saving, setSaving]       = useState(false)
  const [detalle, setDetalle]     = useState<(Proyecto & { movimientos: Movimiento[] }) | null>(null)

  // Recuerda la vista elegida por este usuario (conveniencia local).
  useEffect(() => {
    try {
      const s = localStorage.getItem('obras_vista')
      if (s === 'tabla' || s === 'tablero' || s === 'calendario') setVista(s)
    } catch { /* storage no disponible */ }
  }, [])
  const cambiarVista = (v: Vista) => {
    setVista(v)
    try { localStorage.setItem('obras_vista', v) } catch { /* no-op */ }
  }

  const bySearch = useMemo(() =>
    items.filter(p => !q || [p.ot, p.nombre, p.cliente].some(s => s?.toLowerCase().includes(q.toLowerCase()))),
    [items, q])
  const filtered = useMemo(() =>
    bySearch.filter(p => !filtroEst || p.estado === filtroEst),
    [bySearch, filtroEst])

  const reload = useCallback(async () => {
    const r = await (await fetch('/api/proyectos')).json()
    setItems(r)
  }, [])

  const guardar = useCallback(async () => {
    if (!editando.ot?.trim())     { showToast('El N° OT es obligatorio', 'error'); return }
    if (!editando.nombre?.trim()) { showToast('El nombre del proyecto es obligatorio', 'error'); return }
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
    const res = await fetch(`/api/proyectos/${p.id}`, { method: 'DELETE' })
    if (!res.ok) { showToast('Error al eliminar el proyecto', 'error'); return }
    setItems(prev => prev.filter(x => x.id !== p.id))
    showToast('Proyecto eliminado', 'success')
  }, [showToast])

  // Cambio de estado desde el Tablero — optimista, revierte si la API falla.
  const cambiarEstado = useCallback(async (p: Proyecto, nuevo: EstadoProy) => {
    if (p.estado === nuevo) return
    const snapshot = items
    setItems(list => list.map(x => (x.id === p.id ? { ...x, estado: nuevo } : x)))
    try {
      const res = await fetch(`/api/proyectos/${p.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevo }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'No se pudo cambiar el estado')
      showToast(`${p.ot} → ${ESTADO_PROY[nuevo].label}`, 'success')
    } catch (e: any) {
      setItems(snapshot)
      showToast(e.message, 'error')
    }
  }, [items, showToast])

  return (
    <>
      <div className="panel">
        <div className="panel-header">
          <ClipboardList size={14} style={{ color: 'var(--n-500)', flexShrink: 0 }} />
          <h2>Obras</h2>
          {editable && (
            <button className="btn btn-primary btn-sm" onClick={() => { setEditando(BLANK); setModalOpen(true) }}>+ Nueva OT</button>
          )}
        </div>

        <div className="filters">
          {/* Conmutador de vistas (patrón monday/ClickUp) */}
          <div className="inline-flex items-center rounded-lg p-0.5 gap-0.5" style={{ background: '#F1F3F5' }} role="tablist" aria-label="Vista de obras">
            {VISTAS.map(v => {
              const activo = vista === v.id
              return (
                <button
                  key={v.id}
                  role="tab"
                  aria-selected={activo}
                  onClick={() => cambiarVista(v.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[13px] font-semibold transition',
                    activo ? 'bg-white text-slate-800 shadow-sm' : 'text-brand-n500 hover:text-slate-700',
                  )}
                >
                  <v.Icon size={15} /><span className="hidden sm:inline">{v.label}</span>
                </button>
              )
            })}
          </div>

          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#BBBBBB' }} />
            <input className="input w-52 pl-8" placeholder="OT, nombre, cliente…" value={q} onChange={e => setQ(e.target.value)} />
          </div>

          {vista !== 'tablero' && (
            <select className="select w-auto" value={filtroEst} onChange={e => setFiltroEst(e.target.value)}>
              <option value="">Todos los estados</option>
              {ESTADOS_PROY.map(e => <option key={e} value={e}>{ESTADO_PROY[e].label}</option>)}
            </select>
          )}
        </div>

        {/* TABLA */}
        {vista === 'tabla' && (
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
                    <td className="td text-xs text-brand-n500">{fechaCorta(p.fecha_inicio)}</td>
                    <td className="td text-xs text-brand-n500">{fechaCorta(p.fecha_entrega)}</td>
                    <td className="td-r font-medium text-slate-700">{clp(calcCosto(p.costo_total))}</td>
                    <td className="td"><div className="flex gap-0.5">
                      <a href={`/proyectos/${p.id}`} className="btn-icon" title="Ver obra" aria-label="Ver obra">
                        <Building2 size={13} />
                      </a>
                      <button className="btn-icon" title="Ver movimientos" aria-label="Ver movimientos" onClick={() => verDetalle(p)}>
                        <ScrollText size={13} />
                      </button>
                      <a href={`/proyectos/${p.id}/factibilidad`} className="btn-icon" title="Factibilidad" aria-label="Factibilidad">
                        <ClipboardCheck size={13} />
                      </a>
                      {editable && (
                        <>
                          <button className="btn-icon" title="Editar" aria-label="Editar" onClick={() => { setEditando({ ...p }); setModalOpen(true) }}>
                            <Pencil size={13} />
                          </button>
                          <button className="btn-icon" title="Eliminar" aria-label="Eliminar" onClick={() => eliminar(p)}>
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div></td>
                  </tr>
                ))}
                {!filtered.length && <tr><td colSpan={8} className="text-center py-10 text-brand-n500">Sin proyectos</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* TABLERO (kanban por estado) — usa bySearch: el filtro de estado no aplica aquí */}
        {vista === 'tablero' && (
          <TableroProyectos items={bySearch} editable={editable} onCambiarEstado={cambiarEstado} />
        )}

        {/* CALENDARIO (por fecha de entrega) */}
        {vista === 'calendario' && (
          <CalendarioProyectos items={filtered} />
        )}
      </div>

      {/* Crear / editar OT */}
      <Modal open={modalOpen} title={editando.id ? `Editar — ${editando.ot}` : 'Nueva Orden de Trabajo'}
        onClose={() => setModalOpen(false)} onSave={guardar} saving={saving}>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="proyecto-ot">N° OT *</label><input id="proyecto-ot" className="input" value={editando.ot??''} onChange={e=>setEditando(p=>({...p,ot:e.target.value}))} placeholder="OT-2026-005" /></div>
          <div><label className="label" htmlFor="proyecto-estado">Estado</label>
            <select id="proyecto-estado" className="select" value={editando.estado??'en_proceso'} onChange={e=>setEditando(p=>({...p,estado:e.target.value as any}))}>
              {ESTADOS_PROY.map(e=><option key={e} value={e}>{ESTADO_PROY[e].label}</option>)}
            </select>
          </div>
          <div className="col-span-2"><label className="label" htmlFor="proyecto-nombre">Nombre / Tablero *</label><input id="proyecto-nombre" className="input" value={editando.nombre??''} onChange={e=>setEditando(p=>({...p,nombre:e.target.value}))} /></div>
          <div className="col-span-2"><label className="label" htmlFor="proyecto-cliente">Cliente</label><input id="proyecto-cliente" className="input" value={editando.cliente??''} onChange={e=>setEditando(p=>({...p,cliente:e.target.value}))} /></div>
          <div><label className="label" htmlFor="proyecto-fecha-inicio">Fecha inicio</label><input id="proyecto-fecha-inicio" type="date" className="input" value={editando.fecha_inicio??''} onChange={e=>setEditando(p=>({...p,fecha_inicio:e.target.value}))} /></div>
          <div><label className="label" htmlFor="proyecto-fecha-entrega">Fecha entrega</label><input id="proyecto-fecha-entrega" type="date" className="input" value={editando.fecha_entrega??''} onChange={e=>setEditando(p=>({...p,fecha_entrega:e.target.value}))} /></div>
          <div className="col-span-2"><label className="label" htmlFor="proyecto-notas">Notas</label><textarea id="proyecto-notas" className="textarea" value={editando.notas??''} onChange={e=>setEditando(p=>({...p,notas:e.target.value}))} /></div>
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
                        <td className="td text-xs text-brand-n500">{fechaCorta(m.fecha)}</td>
                        <td className="td"><span className="code">{(m.materiales as any)?.codigo}</span></td>
                        <td className="td">{(m.materiales as any)?.descripcion}</td>
                        <td className="td-r">{num(m.cantidad)} <span className="text-brand-n500 text-xs">{(m.materiales as any)?.unidad}</span></td>
                        <td className="td-r text-brand-n500">{clp(m.precio_unit)}</td>
                        <td className="td-r font-medium">{clp(m.cantidad*(m.precio_unit??0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-center py-6 text-brand-n500">Sin materiales consumidos</p>}
          </>
        )}
      </Modal>
    </>
  )
}
