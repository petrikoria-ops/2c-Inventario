'use client'
import { useState, useMemo, useCallback } from 'react'
import { ArrowUpDown, Download } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { BadgeTipo } from '@/components/ui/Badge'
import { num, fechaHora } from '@/lib/utils'
import { useToast } from '@/contexts/ToastContext'
import { useProgressiveList } from '@/hooks/useProgressiveList'
import type { Movimiento, Material, Proyecto } from '@/types'

interface Props {
  initialData: Movimiento[]
  materiales: Pick<Material, 'id' | 'codigo' | 'descripcion' | 'stock_actual' | 'unidad'>[]
  proyectos: Pick<Proyecto, 'id' | 'ot' | 'nombre'>[]
  editable?: boolean
}

export default function TablaMovimientos({ initialData, materiales, proyectos, editable = true }: Props) {
  const { showToast } = useToast()
  const [movimientos, setMovimientos] = useState<Movimiento[]>(initialData)
  const [filtroTipo, setFiltroTipo]   = useState('')
  const [desde, setDesde]             = useState('')
  const [hasta, setHasta]             = useState('')
  const [modalOpen, setModalOpen]     = useState(false)
  const [saving, setSaving]           = useState(false)
  const [busqMat, setBusqMat]         = useState('')
  const [form, setForm]               = useState({
    material_id: '', tipo: 'salida', cantidad: '1',
    proyecto_id: '', usuario: 'admin', motivo: '',
  })

  const filtered = useMemo(() => {
    return movimientos.filter(m => {
      if (filtroTipo && m.tipo !== filtroTipo) return false
      if (desde && m.fecha < desde) return false
      if (hasta && m.fecha > hasta + 'T23:59:59') return false
      return true
    })
  }, [movimientos, filtroTipo, desde, hasta])

  const { visible, hasMore, sentinelRef, loadMore, total } = useProgressiveList(filtered, 60)

  const matsFiltradas = useMemo(() =>
    busqMat.length >= 2
      ? materiales.filter(m =>
          m.codigo.toLowerCase().includes(busqMat.toLowerCase()) ||
          m.descripcion.toLowerCase().includes(busqMat.toLowerCase())
        ).slice(0, 8)
      : []
  , [busqMat, materiales])

  const matSeleccionada = materiales.find(m => String(m.id) === form.material_id)

  const registrar = useCallback(async () => {
    if (!form.material_id) return showToast('Selecciona un material', 'error')
    const cant = parseFloat(form.cantidad)
    if (isNaN(cant) || cant < 0) return showToast('Cantidad no válida', 'error')
    if (form.tipo !== 'ajuste' && cant === 0) return showToast('La cantidad debe ser mayor a 0', 'error')
    setSaving(true)
    try {
      const res = await fetch('/api/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, material_id: parseInt(form.material_id), cantidad: parseFloat(form.cantidad), proyecto_id: form.proyecto_id || null }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      const updated = await (await fetch('/api/movimientos?limit=200')).json()
      setMovimientos(updated.data)
      showToast('Movimiento registrado', 'success')
      setModalOpen(false)
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally { setSaving(false) }
  }, [form, showToast])

  return (
    <>
      <div className="panel">
        <div className="panel-header">
          <ArrowUpDown size={14} style={{ color: '#909090', flexShrink: 0 }} />
          <h2>Movimientos de inventario</h2>
          <div className="flex gap-2">
            <a href="/api/export/movimientos" className="btn btn-ghost btn-sm">
              <Download size={13} /> CSV
            </a>
            {editable && (
              <button className="btn btn-primary btn-sm" onClick={() => {
                setForm({ material_id:'', tipo:'salida', cantidad:'1', proyecto_id:'', usuario:'admin', motivo:'' })
                setBusqMat('')
                setModalOpen(true)
              }}>+ Registrar</button>
            )}
          </div>
        </div>

        {!editable && (
          <div className="px-4 py-2.5 text-xs border-b" style={{ background: '#F3F4F6', borderColor: '#E8EAED', color: '#6B7280' }}>
            Tu perfil tiene acceso de solo lectura a Movimientos — no puedes registrar movimientos nuevos.
          </div>
        )}
        <div className="filters">
          <select className="select w-auto" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
            <option value="">Todos los tipos</option>
            {['entrada','salida','ajuste','devolucion'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            Desde <input type="date" className="input" value={desde} onChange={e => setDesde(e.target.value)} />
            Hasta <input type="date" className="input" value={hasta} onChange={e => setHasta(e.target.value)} />
          </div>
          <span className="text-xs text-slate-400 ml-auto self-center">{filtered.length} resultado(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Fecha</th><th className="th">Tipo</th>
                <th className="th">Código</th><th className="th">Descripción</th>
                <th className="th text-right">Cantidad</th>
                <th className="th text-right">Stock ant.</th>
                <th className="th text-right">Stock nuevo</th>
                <th className="th">Proyecto</th>
                <th className="th">Usuario</th>
                <th className="th">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(m => (
                <tr key={m.id} className="tr-hover">
                  <td className="td whitespace-nowrap text-xs text-slate-500">{fechaHora(m.fecha)}</td>
                  <td className="td"><BadgeTipo tipo={m.tipo} /></td>
                  <td className="td"><span className="code">{(m.materiales as any)?.codigo}</span></td>
                  <td className="td text-slate-700">{(m.materiales as any)?.descripcion}</td>
                  <td className="td-r font-medium">{num(m.cantidad)} <span className="text-slate-400 text-xs">{(m.materiales as any)?.unidad}</span></td>
                  <td className="td-r text-slate-500">{num(m.stock_antes)}</td>
                  <td className="td-r text-slate-700 font-medium">{num(m.stock_despues)}</td>
                  <td className="td"><span className="code text-slate-400 text-[11px]">{(m.proyectos as any)?.ot ?? '—'}</span></td>
                  <td className="td text-xs text-slate-500">{m.usuario}</td>
                  <td className="td text-xs text-slate-500 max-w-[180px] truncate">{m.motivo ?? '—'}</td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={10} className="text-center py-10 text-slate-400">Sin movimientos registrados</td></tr>}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="flex items-center justify-center gap-3 px-4 py-3 border-t" style={{ borderColor: '#EEF0F2' }}>
            <span className="text-xs text-slate-400">Mostrando {visible.length} de {num(total, 0)}</span>
            {hasMore && <button className="btn btn-outline btn-sm" onClick={loadMore}>Cargar más</button>}
            <div ref={sentinelRef} aria-hidden className="w-px h-px" />
          </div>
        )}
      </div>

      <Modal open={modalOpen} title="Registrar movimiento" onClose={() => setModalOpen(false)} onSave={registrar} saveLabel="Registrar" saving={saving}>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label" htmlFor="movimiento-buscar-material">Buscar material *</label>
            <input id="movimiento-buscar-material" className="input" placeholder="Escribe código o nombre (mín. 2 caracteres)…" value={busqMat} onChange={e => { setBusqMat(e.target.value); setForm(p => ({ ...p, material_id: '' })) }} />
            {matsFiltradas.length > 0 && (
              <div className="border border-slate-200 rounded-md mt-1 max-h-36 overflow-y-auto shadow-sm">
                {matsFiltradas.map(m => (
                  <div key={m.id} className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 border-b border-slate-100 last:border-0 flex justify-between"
                    onClick={() => { setForm(p => ({ ...p, material_id: String(m.id) })); setBusqMat(`${m.codigo} — ${m.descripcion}`) }}>
                    <span><span className="code">{m.codigo}</span> {m.descripcion}</span>
                    <span className="text-slate-400 text-xs">Stock: {num(m.stock_actual)} {m.unidad}</span>
                  </div>
                ))}
              </div>
            )}
            {matSeleccionada && <p className="text-xs text-blue-700 mt-1">Stock actual: {num(matSeleccionada.stock_actual)} {matSeleccionada.unidad}</p>}
          </div>
          <div>
            <label className="label" htmlFor="movimiento-tipo">Tipo *</label>
            <select id="movimiento-tipo" className="select" value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}>
              <option value="salida">Salida</option><option value="entrada">Entrada</option>
              <option value="devolucion">Devolución</option><option value="ajuste">Ajuste</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="movimiento-cantidad">{form.tipo === 'ajuste' ? 'Nuevo stock *' : 'Cantidad *'}</label>
            <input id="movimiento-cantidad" className="input" type="number" min="0" step="1" value={form.cantidad} onChange={e => setForm(p => ({ ...p, cantidad: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <label className="label" htmlFor="movimiento-proyecto">Proyecto / OT</label>
            <select id="movimiento-proyecto" className="select" value={form.proyecto_id} onChange={e => setForm(p => ({ ...p, proyecto_id: e.target.value }))}>
              <option value="">Sin proyecto</option>
              {proyectos.map(p => <option key={p.id} value={p.id}>{p.ot} — {p.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="movimiento-usuario">Usuario</label>
            <input id="movimiento-usuario" className="input" value={form.usuario} onChange={e => setForm(p => ({ ...p, usuario: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <label className="label" htmlFor="movimiento-motivo">Motivo</label>
            <input id="movimiento-motivo" className="input" value={form.motivo} onChange={e => setForm(p => ({ ...p, motivo: e.target.value }))} placeholder="Ej: Consumo tablero OT-2026-001" />
          </div>
        </div>
      </Modal>
    </>
  )
}
