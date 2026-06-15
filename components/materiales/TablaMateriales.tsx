'use client'
import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import { BadgeStock } from '@/components/ui/Badge'
import { BadgeTipo } from '@/components/ui/Badge'
import { clp, num, fechaHora } from '@/lib/utils'
import { useToast } from '@/contexts/ToastContext'
import type { Categoria, Material, Proveedor, Proyecto, Movimiento } from '@/types'

interface Props {
  initialData: Material[]
  categorias: Categoria[]
  proveedores: Pick<Proveedor, 'id' | 'nombre'>[]
  proyectos: Pick<Proyecto, 'id' | 'ot' | 'nombre'>[]
}

const UNIDADES = ['UN', 'MT', 'ML', 'KG', 'JGO', 'RLL', 'PAR']

export default function TablaMateriales({ initialData, categorias, proveedores, proyectos }: Props) {
  const router = useRouter()
  const { showToast } = useToast()

  // Estado local — se actualiza tras cada mutación
  const [materiales, setMateriales] = useState<Material[]>(initialData)
  const [q, setQ]                   = useState('')
  const [catFiltro, setCatFiltro]   = useState('')
  const [soloAlerta, setSoloAlerta] = useState(false)
  const [saving, setSaving]         = useState(false)

  // Modal CRUD
  const [modalForm, setModalForm] = useState(false)
  const [editando, setEditando]   = useState<Partial<Material> | null>(null)

  // Modal movimiento rápido
  const [modalMov, setModalMov]   = useState(false)
  const [movMat, setMovMat]       = useState<Material | null>(null)
  const [movForm, setMovForm]      = useState({ tipo: 'salida', cantidad: '1', proyecto_id: '', usuario: 'admin', motivo: '' })

  // Modal historial
  const [modalHist, setModalHist] = useState(false)
  const [histMat, setHistMat]     = useState<Material | null>(null)
  const [histMovs, setHistMovs]   = useState<Movimiento[]>([])

  // Filtrado local
  const filtered = useMemo(() => {
    return materiales.filter(m => {
      const matchQ   = !q || m.codigo.toLowerCase().includes(q.toLowerCase()) ||
                             m.descripcion.toLowerCase().includes(q.toLowerCase())
      const matchCat = !catFiltro || String(m.categoria_id) === catFiltro
      const matchMin = !soloAlerta || m.stock_actual <= m.stock_minimo
      return matchQ && matchCat && matchMin
    })
  }, [materiales, q, catFiltro, soloAlerta])

  // ─── Guardar material (crear o editar) ─────────────────────
  const guardarMaterial = useCallback(async () => {
    if (!editando) return
    setSaving(true)
    try {
      const method = editando.id ? 'PUT' : 'POST'
      const url    = editando.id ? `/api/materiales/${editando.id}` : '/api/materiales'
      const payload = { ...editando, activo: true }
      delete (payload as any).stock_actual // stock solo via movimientos
      delete (payload as any).categorias
      delete (payload as any).proveedores

      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error((await res.json()).error)

      showToast(editando.id ? 'Material actualizado' : 'Material creado', 'success')
      setModalForm(false)
      router.refresh()
      // Actualizar lista local
      const { data } = await (await fetch('/api/materiales?limit=500')).json()
      setMateriales(data)
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }, [editando, router, showToast])

  // ─── Eliminar ───────────────────────────────────────────────
  const eliminar = useCallback(async (m: Material) => {
    if (!confirm(`¿Eliminar "${m.descripcion}"?`)) return
    const res = await fetch(`/api/materiales/${m.id}`, { method: 'DELETE' })
    if (!res.ok) return showToast('Error al eliminar', 'error')
    setMateriales(prev => prev.filter(x => x.id !== m.id))
    showToast('Material eliminado')
  }, [showToast])

  // ─── Registrar movimiento ───────────────────────────────────
  const registrarMov = useCallback(async () => {
    if (!movMat) return
    setSaving(true)
    try {
      const res = await fetch('/api/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ material_id: movMat.id, ...movForm, cantidad: parseFloat(movForm.cantidad) }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      // Actualizar stock local
      setMateriales(prev => prev.map(m =>
        m.id === movMat.id ? { ...m, stock_actual: json.stock_nuevo } : m
      ))
      showToast('Movimiento registrado', 'success')
      setModalMov(false)
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }, [movMat, movForm, showToast])

  // ─── Ver historial ──────────────────────────────────────────
  const verHistorial = useCallback(async (mat: Material) => {
    setHistMat(mat)
    const res = await fetch(`/api/movimientos?material_id=${mat.id}&limit=100`)
    const json = await res.json()
    setHistMovs(json.data ?? [])
    setModalHist(true)
  }, [])

  return (
    <>
      <div className="panel">
        <div className="panel-header">
          <h2>🔌 Materiales</h2>
          <div className="flex gap-2">
            <a href="/api/export/materiales" className="btn btn-outline btn-sm">⬇ CSV</a>
            <button className="btn btn-primary btn-sm"
              onClick={() => { setEditando({ unidad: 'UN', stock_actual: 0, stock_minimo: 0, precio_unitario: 0 }); setModalForm(true) }}>
              + Nuevo
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="filters">
          <input className="input w-52" placeholder="🔍 Código, descripción…" value={q} onChange={e => setQ(e.target.value)} />
          <select className="select w-auto" value={catFiltro} onChange={e => setCatFiltro(e.target.value)}>
            <option value="">Todas las categorías</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
            <input type="checkbox" checked={soloAlerta} onChange={e => setSoloAlerta(e.target.checked)} className="accent-blue-700" />
            Solo bajo mínimo
          </label>
          {(q || catFiltro || soloAlerta) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setQ(''); setCatFiltro(''); setSoloAlerta(false) }}>
              ✕ Limpiar
            </button>
          )}
          <span className="text-xs text-slate-400 ml-auto self-center">{filtered.length} resultado(s)</span>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Código</th>
                <th className="th">Descripción</th>
                <th className="th">Categoría</th>
                <th className="th">Ubicación</th>
                <th className="th text-right">Stock</th>
                <th className="th text-right">Mínimo</th>
                <th className="th">Estado</th>
                <th className="th text-right">Precio CLP</th>
                <th className="th">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => {
                const cat = m.categorias as any
                return (
                  <tr key={m.id} className={`tr-hover ${m.stock_actual <= m.stock_minimo ? 'bg-red-50/60' : ''}`}>
                    <td className="td"><span className="code">{m.codigo}</span></td>
                    <td className="td">
                      <span className="font-medium text-slate-800">{m.descripcion}</span>
                      {(m.proveedores as any)?.nombre && (
                        <div className="text-xs text-slate-400">{(m.proveedores as any).nombre}</div>
                      )}
                    </td>
                    <td className="td">
                      {cat ? (
                        <span className="badge text-[11px]" style={{ background: cat.color + '22', color: cat.color }}>
                          {cat.nombre}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="td text-xs text-slate-500">{m.ubicacion ?? '—'}</td>
                    <td className="td-r font-semibold text-slate-800">{num(m.stock_actual)} <span className="text-slate-400 text-xs font-normal">{m.unidad}</span></td>
                    <td className="td-r text-slate-500">{num(m.stock_minimo)}</td>
                    <td className="td"><BadgeStock actual={m.stock_actual} minimo={m.stock_minimo} /></td>
                    <td className="td-r text-slate-700">{clp(m.precio_unitario)}</td>
                    <td className="td">
                      <div className="flex gap-0.5">
                        <button className="btn-icon" title="Registrar movimiento" onClick={() => { setMovMat(m); setMovForm({ tipo: 'salida', cantidad: '1', proyecto_id: '', usuario: 'admin', motivo: '' }); setModalMov(true) }}>↕️</button>
                        <button className="btn-icon" title="Ver historial" onClick={() => verHistorial(m)}>📜</button>
                        <button className="btn-icon" title="Editar" onClick={() => { setEditando({ ...m }); setModalForm(true) }}>✏️</button>
                        <button className="btn-icon" title="Eliminar" onClick={() => eliminar(m)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!filtered.length && (
                <tr><td colSpan={9} className="text-center py-10 text-slate-400">📭 Sin resultados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal CRUD ─────────────────────────────────────── */}
      <Modal open={modalForm} title={editando?.id ? `Editar — ${editando.codigo}` : 'Nuevo material'}
        onClose={() => setModalForm(false)} onSave={guardarMaterial} saving={saving}>
        {editando && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Código *</label>
              <input className="input" value={editando.codigo ?? ''} onChange={e => setEditando(p => ({ ...p!, codigo: e.target.value }))} placeholder="CON-001" />
            </div>
            <div>
              <label className="label">Unidad *</label>
              <select className="select" value={editando.unidad ?? 'UN'} onChange={e => setEditando(p => ({ ...p!, unidad: e.target.value }))}>
                {UNIDADES.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Descripción *</label>
              <input className="input" value={editando.descripcion ?? ''} onChange={e => setEditando(p => ({ ...p!, descripcion: e.target.value }))} placeholder="Descripción completa del material" />
            </div>
            <div>
              <label className="label">Categoría</label>
              <select className="select" value={editando.categoria_id ?? ''} onChange={e => setEditando(p => ({ ...p!, categoria_id: e.target.value ? Number(e.target.value) : null }))}>
                <option value="">Sin categoría</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Proveedor</label>
              <select className="select" value={editando.proveedor_id ?? ''} onChange={e => setEditando(p => ({ ...p!, proveedor_id: e.target.value ? Number(e.target.value) : null }))}>
                <option value="">Sin proveedor</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            {!editando.id && (
              <div>
                <label className="label">Stock inicial</label>
                <input className="input" type="number" min="0" value={editando.stock_actual ?? 0} onChange={e => setEditando(p => ({ ...p!, stock_actual: parseFloat(e.target.value) || 0 }))} />
              </div>
            )}
            <div>
              <label className="label">Stock mínimo</label>
              <input className="input" type="number" min="0" value={editando.stock_minimo ?? 0} onChange={e => setEditando(p => ({ ...p!, stock_minimo: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="label">Precio unitario (CLP)</label>
              <input className="input" type="number" min="0" value={editando.precio_unitario ?? 0} onChange={e => setEditando(p => ({ ...p!, precio_unitario: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="label">Ubicación física</label>
              <input className="input" value={editando.ubicacion ?? ''} onChange={e => setEditando(p => ({ ...p!, ubicacion: e.target.value }))} placeholder="Est.A / Cajón 1" />
            </div>
            <div>
              <label className="label">Código de barras / QR</label>
              <input className="input" value={editando.codigo_barras ?? ''} onChange={e => setEditando(p => ({ ...p!, codigo_barras: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Notas</label>
              <textarea className="textarea" value={editando.notas ?? ''} onChange={e => setEditando(p => ({ ...p!, notas: e.target.value }))} />
            </div>
            {editando.id && <p className="col-span-2 text-xs text-slate-400">⚠ Para cambiar el stock use "Registrar movimiento".</p>}
          </div>
        )}
      </Modal>

      {/* ── Modal movimiento rápido ─────────────────────────── */}
      <Modal open={modalMov} title="Registrar movimiento" onClose={() => setModalMov(false)}
        onSave={registrarMov} saveLabel="Registrar" saving={saving}>
        {movMat && (
          <>
            <div className="alert alert-blue mb-3">
              <span>Material: <strong>{movMat.descripcion}</strong> — Stock actual: <strong>{num(movMat.stock_actual)} {movMat.unidad}</strong></span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Tipo *</label>
                <select className="select" value={movForm.tipo} onChange={e => setMovForm(p => ({ ...p, tipo: e.target.value }))}>
                  <option value="salida">↓ Salida (consumo)</option>
                  <option value="entrada">↑ Entrada (compra)</option>
                  <option value="devolucion">↩ Devolución</option>
                  <option value="ajuste">⇄ Ajuste (nuevo stock total)</option>
                </select>
              </div>
              <div>
                <label className="label">{movForm.tipo === 'ajuste' ? 'Nuevo stock total *' : 'Cantidad *'}</label>
                <input className="input" type="number" min="0" step="1" value={movForm.cantidad} onChange={e => setMovForm(p => ({ ...p, cantidad: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="label">Proyecto / OT</label>
                <select className="select" value={movForm.proyecto_id} onChange={e => setMovForm(p => ({ ...p, proyecto_id: e.target.value }))}>
                  <option value="">Sin proyecto</option>
                  {proyectos.map(p => <option key={p.id} value={p.id}>{p.ot} — {p.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Usuario</label>
                <input className="input" value={movForm.usuario} onChange={e => setMovForm(p => ({ ...p, usuario: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="label">Motivo</label>
                <input className="input" value={movForm.motivo} onChange={e => setMovForm(p => ({ ...p, motivo: e.target.value }))} placeholder="Ej: Consumo tablero OT-2026-001" />
              </div>
            </div>
          </>
        )}
      </Modal>

      {/* ── Modal historial ─────────────────────────────────── */}
      <Modal open={modalHist} title={`Historial — ${histMat?.descripcion}`}
        onClose={() => setModalHist(false)} hideFooter>
        <div className="space-y-1">
          {histMovs.map(m => (
            <div key={m.id} className="flex gap-3 py-2 border-b border-slate-100 last:border-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-0.5
                ${m.tipo==='entrada'?'bg-green-100':m.tipo==='salida'?'bg-red-100':m.tipo==='ajuste'?'bg-blue-100':'bg-yellow-100'}`}>
                {m.tipo==='entrada'?'↑':m.tipo==='salida'?'↓':m.tipo==='ajuste'?'⇄':'↩'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <BadgeTipo tipo={m.tipo} />
                  <span className="font-medium text-slate-800">{num(m.cantidad)}</span>
                  <span className="text-slate-400 text-xs">{m.motivo ?? 'Sin motivo'}</span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {fechaHora(m.fecha)} · {m.usuario ?? '—'} · Stock: {num(m.stock_antes)} → {num(m.stock_despues)}
                </div>
              </div>
            </div>
          ))}
          {!histMovs.length && <p className="text-center py-6 text-slate-400">📭 Sin movimientos registrados</p>}
        </div>
      </Modal>
    </>
  )
}
