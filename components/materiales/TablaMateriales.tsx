'use client'
import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plug, Download, Search, ArrowUpDown, ScrollText, Pencil, Trash2, X,
  ChevronUp, ChevronDown, SlidersHorizontal,
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { BadgeStock, BadgeTipo } from '@/components/ui/Badge'
import { clp, num, fechaHora } from '@/lib/utils'
import { useToast } from '@/contexts/ToastContext'
import type { Categoria, Material, Proveedor, Proyecto, Movimiento } from '@/types'

interface Props {
  initialData: Material[]
  categorias:  Categoria[]
  proveedores: Pick<Proveedor, 'id' | 'nombre'>[]
  proyectos:   Pick<Proyecto, 'id' | 'ot' | 'nombre'>[]
}

type SortField = 'codigo' | 'descripcion' | 'categoria' | 'stock' | 'precio'
type SortDir   = 'asc' | 'desc'

const UNIDADES = ['UN', 'MT', 'ML', 'KG', 'JGO', 'RLL', 'PAR']

export default function TablaMateriales({ initialData, categorias, proveedores, proyectos }: Props) {
  const router      = useRouter()
  const { showToast } = useToast()

  const [materiales, setMateriales] = useState<Material[]>(initialData)

  // ── Selección múltiple ─────────────────────────────────────────
  const [selectedIds,    setSelectedIds]    = useState<Set<number>>(new Set())
  const [modalBulkEdit,  setModalBulkEdit]  = useState(false)
  const [bulkFields,     setBulkFields]     = useState<{
    categoria_id?: string; proveedor_id?: string; ubicacion?: string
    stock_minimo?: string; precio_unitario?: string
  }>({})
  const [bulkSaving,     setBulkSaving]     = useState(false)

  // ── Filtros ────────────────────────────────────────────────────
  const [q,           setQ]           = useState('')
  const [catFiltro,   setCatFiltro]   = useState('')
  const [provFiltro,  setProvFiltro]  = useState('')
  const [ubicFiltro,  setUbicFiltro]  = useState('')
  const [stockEstado, setStockEstado] = useState('')
  const [stockDesde,  setStockDesde]  = useState('')
  const [stockHasta,  setStockHasta]  = useState('')
  const [precioDesde, setPrecioDesde] = useState('')
  const [precioHasta, setPrecioHasta] = useState('')

  // ── Ordenamiento ───────────────────────────────────────────────
  const [sortField, setSortField] = useState<SortField>('codigo')
  const [sortDir,   setSortDir]   = useState<SortDir>('asc')

  // ── Modales ────────────────────────────────────────────────────
  const [modalForm, setModalForm] = useState(false)
  const [editando,  setEditando]  = useState<Partial<Material> | null>(null)
  const [saving,    setSaving]    = useState(false)

  const [modalMov,  setModalMov]  = useState(false)
  const [movMat,    setMovMat]    = useState<Material | null>(null)
  const [movForm,   setMovForm]   = useState({ tipo: 'salida', cantidad: '1', proyecto_id: '', usuario: 'admin', motivo: '' })

  const [modalHist, setModalHist] = useState(false)
  const [histMat,   setHistMat]   = useState<Material | null>(null)
  const [histMovs,  setHistMovs]  = useState<Movimiento[]>([])

  // ── Ubicaciones únicas ─────────────────────────────────────────
  const ubicaciones = useMemo(() => {
    const s = new Set<string>()
    materiales.forEach(m => { if (m.ubicacion?.trim()) s.add(m.ubicacion.trim()) })
    return Array.from(s).sort()
  }, [materiales])

  // ── Filtrado + ordenamiento ────────────────────────────────────
  const filtered = useMemo(() => {
    const stockD = parseFloat(stockDesde)
    const stockH = parseFloat(stockHasta)
    const precD  = parseFloat(precioDesde)
    const precH  = parseFloat(precioHasta)
    const qLow   = q.toLowerCase()
    const ubLow  = ubicFiltro.toLowerCase()

    let result = materiales.filter(m => {
      if (q && !m.codigo.toLowerCase().includes(qLow) && !m.descripcion.toLowerCase().includes(qLow)) return false
      if (catFiltro  && String(m.categoria_id) !== catFiltro)  return false
      if (provFiltro && String(m.proveedor_id) !== provFiltro) return false
      if (ubicFiltro && !(m.ubicacion?.toLowerCase().includes(ubLow))) return false

      if (stockEstado === 'ok'   && m.stock_actual < m.stock_minimo)  return false
      if (stockEstado === 'bajo' && m.stock_actual >= m.stock_minimo) return false
      if (stockEstado === 'cero' && m.stock_actual !== 0)             return false

      if (!isNaN(stockD) && m.stock_actual < stockD) return false
      if (!isNaN(stockH) && m.stock_actual > stockH) return false

      const precio = m.precio_unitario ?? 0
      if (!isNaN(precD) && precio < precD) return false
      if (!isNaN(precH) && precio > precH) return false

      return true
    })

    result.sort((a, b) => {
      let av: any, bv: any
      switch (sortField) {
        case 'descripcion': av = a.descripcion;                        bv = b.descripcion;                        break
        case 'categoria':   av = (a.categorias as any)?.nombre ?? ''; bv = (b.categorias as any)?.nombre ?? ''; break
        case 'stock':       av = a.stock_actual;                       bv = b.stock_actual;                       break
        case 'precio':      av = a.precio_unitario ?? 0;              bv = b.precio_unitario ?? 0;               break
        default:            av = a.codigo;                             bv = b.codigo
      }
      const cmp = typeof av === 'string' ? av.localeCompare(bv, 'es') : av - bv
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [materiales, q, catFiltro, provFiltro, ubicFiltro, stockEstado,
      stockDesde, stockHasta, precioDesde, precioHasta, sortField, sortDir])

  const hasFilters = !!(q || catFiltro || provFiltro || ubicFiltro || stockEstado || stockDesde || stockHasta || precioDesde || precioHasta)

  const clearFilters = () => {
    setQ(''); setCatFiltro(''); setProvFiltro(''); setUbicFiltro('')
    setStockEstado(''); setStockDesde(''); setStockHasta('')
    setPrecioDesde(''); setPrecioHasta('')
  }

  // ── Ordenar por columna ────────────────────────────────────────
  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const sortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown size={10} className="text-slate-300 ml-0.5" />
    return sortDir === 'asc'
      ? <ChevronUp   size={10} className="ml-0.5" style={{ color: '#F0C000' }} />
      : <ChevronDown size={10} className="ml-0.5" style={{ color: '#F0C000' }} />
  }

  // ── Selección ─────────────────────────────────────────────────
  const allFilteredSelected = filtered.length > 0 && filtered.every(m => selectedIds.has(m.id))
  const someSelected        = filtered.some(m => selectedIds.has(m.id))

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        filtered.forEach(m => next.delete(m.id))
        return next
      })
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev)
        filtered.forEach(m => next.add(m.id))
        return next
      })
    }
  }

  const toggleOne = (id: number) =>
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const clearSelection = () => setSelectedIds(new Set())

  // ── Bulk delete ────────────────────────────────────────────────
  const bulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds)
    if (!ids.length) return
    if (!confirm(`¿Eliminar ${ids.length} material${ids.length !== 1 ? 'es' : ''}? Esta acción no se puede deshacer.`)) return
    const res = await fetch('/api/materiales/bulk', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
    if (!res.ok) { showToast('Error al eliminar', 'error'); return }
    setMateriales(prev => prev.filter(m => !ids.includes(m.id)))
    clearSelection()
    showToast(`${ids.length} material${ids.length !== 1 ? 'es' : ''} eliminado${ids.length !== 1 ? 's' : ''}`, 'success')
  }, [selectedIds, showToast])

  // ── Bulk edit ─────────────────────────────────────────────────
  const bulkEdit = useCallback(async () => {
    const ids = Array.from(selectedIds)
    if (!ids.length) return
    const fields: Record<string, unknown> = {}
    if (bulkFields.categoria_id   !== undefined && bulkFields.categoria_id   !== '') fields.categoria_id   = bulkFields.categoria_id   === '__clear' ? null : Number(bulkFields.categoria_id)
    if (bulkFields.proveedor_id   !== undefined && bulkFields.proveedor_id   !== '') fields.proveedor_id   = bulkFields.proveedor_id   === '__clear' ? null : Number(bulkFields.proveedor_id)
    if (bulkFields.ubicacion      !== undefined && bulkFields.ubicacion.trim()!=='') fields.ubicacion      = bulkFields.ubicacion.trim()
    if (bulkFields.stock_minimo   !== undefined && bulkFields.stock_minimo   !== '') fields.stock_minimo   = parseFloat(bulkFields.stock_minimo)
    if (bulkFields.precio_unitario!== undefined && bulkFields.precio_unitario!== '') fields.precio_unitario= parseFloat(bulkFields.precio_unitario)

    if (!Object.keys(fields).length) { showToast('No hay campos para actualizar', 'error'); return }

    setBulkSaving(true)
    try {
      const res = await fetch('/api/materiales/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, fields }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      showToast(`${ids.length} material${ids.length !== 1 ? 'es' : ''} actualizado${ids.length !== 1 ? 's' : ''}`, 'success')
      setModalBulkEdit(false)
      clearSelection()
      router.refresh()
      const { data } = await (await fetch('/api/materiales?limit=500')).json()
      if (data) setMateriales(data)
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setBulkSaving(false)
    }
  }, [selectedIds, bulkFields, router, showToast])

  // ── CRUD ───────────────────────────────────────────────────────
  const guardarMaterial = useCallback(async () => {
    if (!editando) return
    if (!editando.codigo?.trim())      { showToast('El código es obligatorio', 'error'); return }
    if (!editando.descripcion?.trim()) { showToast('La descripción es obligatoria', 'error'); return }
    if ((editando.stock_minimo ?? 0) < 0)    { showToast('El stock mínimo no puede ser negativo', 'error'); return }
    if ((editando.precio_unitario ?? 0) < 0) { showToast('El precio no puede ser negativo', 'error'); return }
    setSaving(true)
    try {
      const method  = editando.id ? 'PUT' : 'POST'
      const url     = editando.id ? `/api/materiales/${editando.id}` : '/api/materiales'
      const payload = { ...editando, activo: true }
      delete (payload as any).stock_actual
      delete (payload as any).categorias
      delete (payload as any).proveedores

      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error((await res.json()).error)

      showToast(editando.id ? 'Material actualizado' : 'Material creado', 'success')
      setModalForm(false)
      router.refresh()
      const { data } = await (await fetch('/api/materiales?limit=500')).json()
      setMateriales(data)
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }, [editando, router, showToast])

  const eliminar = useCallback(async (m: Material) => {
    if (!confirm(`¿Eliminar "${m.descripcion}"?`)) return
    const res = await fetch(`/api/materiales/${m.id}`, { method: 'DELETE' })
    if (!res.ok) return showToast('Error al eliminar', 'error')
    setMateriales(prev => prev.filter(x => x.id !== m.id))
    showToast('Material eliminado')
  }, [showToast])

  // ── Movimiento ─────────────────────────────────────────────────
  const registrarMov = useCallback(async () => {
    if (!movMat) return
    const cant = parseFloat(movForm.cantidad)
    if (isNaN(cant) || cant < 0)                 { showToast('Cantidad no válida', 'error'); return }
    if (movForm.tipo !== 'ajuste' && cant === 0)  { showToast('La cantidad debe ser mayor a 0', 'error'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ material_id: movMat.id, ...movForm, cantidad: parseFloat(movForm.cantidad) }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setMateriales(prev => prev.map(m => m.id === movMat.id ? { ...m, stock_actual: json.stock_nuevo } : m))
      showToast('Movimiento registrado', 'success')
      setModalMov(false)
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }, [movMat, movForm, showToast])

  // ── Historial ──────────────────────────────────────────────────
  const verHistorial = useCallback(async (mat: Material) => {
    setHistMat(mat)
    const res  = await fetch(`/api/movimientos?material_id=${mat.id}&limit=100`)
    const json = await res.json()
    setHistMovs(json.data ?? [])
    setModalHist(true)
  }, [])

  const numSelected = selectedIds.size

  // ══════════════════════════════════════════════════════════════
  return (
    <>
      <div className="panel">
        {/* Header */}
        <div className="panel-header">
          <Plug size={14} style={{ color: '#909090', flexShrink: 0 }} />
          <h2>Materiales</h2>
          <div className="flex gap-2 ml-auto">
            <a href="/api/export/materiales" className="btn btn-outline btn-sm"><Download size={13} /> CSV</a>
            <button className="btn btn-primary btn-sm"
              onClick={() => { setEditando({ unidad: 'UN', stock_actual: 0, stock_minimo: 0, precio_unitario: 0 }); setModalForm(true) }}>
              + Nuevo
            </button>
          </div>
        </div>

        {/* ── Barra de selección múltiple ──────────────────────── */}
        {numSelected > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 border-b"
            style={{ background: '#FFF8E0', borderColor: '#F0C000' }}>
            <span className="text-sm font-semibold" style={{ color: '#2E333A' }}>
              {numSelected} seleccionado{numSelected !== 1 ? 's' : ''}
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

        {/* ── Filtros ─────────────────────────────────────────── */}
        <div className="px-4 pt-3 pb-2 border-b border-slate-100 space-y-2">

          {/* Fila 1: búsqueda + categoría + proveedor + estado */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#BBBBBB' }} />
              <input className="input w-52 pl-8" placeholder="Código, descripción…"
                value={q} onChange={e => setQ(e.target.value)} />
            </div>

            <select className="select w-auto max-w-[180px]" value={catFiltro} onChange={e => setCatFiltro(e.target.value)}>
              <option value="">Todas las categorías</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>

            <select className="select w-auto max-w-[160px]" value={provFiltro} onChange={e => setProvFiltro(e.target.value)}>
              <option value="">Todos los proveedores</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>

            <select className="select w-auto" value={stockEstado} onChange={e => setStockEstado(e.target.value)}>
              <option value="">Estado stock</option>
              <option value="ok">Stock OK</option>
              <option value="bajo">Bajo mínimo</option>
              <option value="cero">Sin stock (= 0)</option>
            </select>

            {hasFilters && (
              <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
                <X size={12} /> Limpiar filtros
              </button>
            )}

            <span className="text-xs text-slate-400 ml-auto self-center whitespace-nowrap">
              Mostrando <strong>{filtered.length}</strong> de {materiales.length}
            </span>
          </div>

          {/* Fila 2: ubicación + rangos */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-1">
              <SlidersHorizontal size={12} style={{ color: '#BBBBBB', flexShrink: 0 }} />
              <input className="input w-36 text-xs" placeholder="Ubicación…"
                value={ubicFiltro} onChange={e => setUbicFiltro(e.target.value)}
                list="ubicaciones-list" />
              <datalist id="ubicaciones-list">
                {ubicaciones.map(u => <option key={u} value={u} />)}
              </datalist>
            </div>

            <div className="flex items-center gap-1 text-xs text-slate-500 whitespace-nowrap">
              <span>Stock</span>
              <input className="input w-20 text-xs text-right" type="number" min="0" placeholder="desde"
                value={stockDesde} onChange={e => setStockDesde(e.target.value)} />
              <span>—</span>
              <input className="input w-20 text-xs text-right" type="number" min="0" placeholder="hasta"
                value={stockHasta} onChange={e => setStockHasta(e.target.value)} />
            </div>

            <div className="flex items-center gap-1 text-xs text-slate-500 whitespace-nowrap">
              <span>Precio (CLP)</span>
              <input className="input w-24 text-xs text-right" type="number" min="0" placeholder="desde"
                value={precioDesde} onChange={e => setPrecioDesde(e.target.value)} />
              <span>—</span>
              <input className="input w-24 text-xs text-right" type="number" min="0" placeholder="hasta"
                value={precioHasta} onChange={e => setPrecioHasta(e.target.value)} />
            </div>
          </div>
        </div>

        {/* ── Tabla ───────────────────────────────────────────── */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {/* Checkbox select-all */}
                <th className="th" style={{ width: 36, padding: '0 10px' }}>
                  <input type="checkbox"
                    checked={allFilteredSelected}
                    ref={el => { if (el) el.indeterminate = someSelected && !allFilteredSelected }}
                    onChange={toggleAll}
                    className="cursor-pointer"
                    title={allFilteredSelected ? 'Deseleccionar todos' : 'Seleccionar todos visibles'}
                  />
                </th>
                <th className="th cursor-pointer select-none" onClick={() => handleSort('codigo')}>
                  <span className="inline-flex items-center">Código{sortIcon('codigo')}</span>
                </th>
                <th className="th cursor-pointer select-none" onClick={() => handleSort('descripcion')}>
                  <span className="inline-flex items-center">Descripción{sortIcon('descripcion')}</span>
                </th>
                <th className="th cursor-pointer select-none" onClick={() => handleSort('categoria')}>
                  <span className="inline-flex items-center">Categoría{sortIcon('categoria')}</span>
                </th>
                <th className="th">Ubicación</th>
                <th className="th text-right cursor-pointer select-none" onClick={() => handleSort('stock')}>
                  <span className="inline-flex items-center justify-end">Stock{sortIcon('stock')}</span>
                </th>
                <th className="th text-right">Mínimo</th>
                <th className="th">Estado</th>
                <th className="th text-right cursor-pointer select-none" onClick={() => handleSort('precio')}>
                  <span className="inline-flex items-center justify-end">Precio CLP{sortIcon('precio')}</span>
                </th>
                <th className="th">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => {
                const cat      = m.categorias as any
                const isSelected = selectedIds.has(m.id)
                return (
                  <tr key={m.id}
                    className={`tr-hover ${isSelected ? 'bg-amber-50/60' : m.stock_actual <= m.stock_minimo ? 'bg-red-50/60' : ''}`}>
                    <td className="td" style={{ padding: '0 10px' }}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleOne(m.id)} className="cursor-pointer" />
                    </td>
                    <td className="td"><span className="code">{m.codigo}</span></td>
                    <td className="td">
                      <span className="font-medium text-slate-800">{m.descripcion}</span>
                      {(m.proveedores as any)?.nombre && (
                        <div className="text-xs text-slate-400">{(m.proveedores as any).nombre}</div>
                      )}
                    </td>
                    <td className="td">
                      {cat
                        ? <span className="badge text-[11px]" style={{ background: cat.color + '22', color: cat.color }}>{cat.nombre}</span>
                        : '—'}
                    </td>
                    <td className="td text-xs text-slate-500">{m.ubicacion ?? '—'}</td>
                    <td className="td-r font-semibold text-slate-800">
                      {num(m.stock_actual)} <span className="text-slate-400 text-xs font-normal">{m.unidad}</span>
                    </td>
                    <td className="td-r text-slate-500">{num(m.stock_minimo)}</td>
                    <td className="td"><BadgeStock actual={m.stock_actual} minimo={m.stock_minimo} /></td>
                    <td className="td-r text-slate-700">{clp(m.precio_unitario)}</td>
                    <td className="td">
                      <div className="flex gap-0.5">
                        <button className="btn-icon" title="Registrar movimiento"
                          onClick={() => { setMovMat(m); setMovForm({ tipo: 'salida', cantidad: '1', proyecto_id: '', usuario: 'admin', motivo: '' }); setModalMov(true) }}>
                          <ArrowUpDown size={13} />
                        </button>
                        <button className="btn-icon" title="Ver historial" onClick={() => verHistorial(m)}>
                          <ScrollText size={13} />
                        </button>
                        <button className="btn-icon" title="Editar" onClick={() => { setEditando({ ...m }); setModalForm(true) }}>
                          <Pencil size={13} />
                        </button>
                        <button className="btn-icon" title="Eliminar" onClick={() => eliminar(m)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!filtered.length && (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-400">
                    {hasFilters
                      ? 'Sin resultados con estos filtros. Prueba cambiando la búsqueda o limpiando los filtros.'
                      : 'Sin materiales registrados'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal CRUD ─────────────────────────────────────────── */}
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
                <input className="input" type="number" min="0" value={editando.stock_actual ?? 0}
                  onChange={e => setEditando(p => ({ ...p!, stock_actual: parseFloat(e.target.value) || 0 }))} />
              </div>
            )}
            <div>
              <label className="label">Stock mínimo</label>
              <input className="input" type="number" min="0" value={editando.stock_minimo ?? 0}
                onChange={e => setEditando(p => ({ ...p!, stock_minimo: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="label">Precio unitario (CLP)</label>
              <input className="input" type="number" min="0" value={editando.precio_unitario ?? 0}
                onChange={e => setEditando(p => ({ ...p!, precio_unitario: parseFloat(e.target.value) || 0 }))} />
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
            {editando.id && <p className="col-span-2 text-xs text-slate-400">Para cambiar el stock use "Registrar movimiento".</p>}
          </div>
        )}
      </Modal>

      {/* ── Modal edición en bulk ─────────────────────────────── */}
      <Modal open={modalBulkEdit}
        title={`Editar ${numSelected} material${numSelected !== 1 ? 'es' : ''} seleccionado${numSelected !== 1 ? 's' : ''}`}
        onClose={() => setModalBulkEdit(false)} onSave={bulkEdit} saveLabel="Aplicar cambios" saving={bulkSaving}>
        <p className="text-xs text-slate-500 mb-4">
          Solo se actualizarán los campos que completes. Los campos en blanco se dejan sin cambios.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Categoría</label>
            <select className="select" value={bulkFields.categoria_id ?? ''}
              onChange={e => setBulkFields(p => ({ ...p, categoria_id: e.target.value }))}>
              <option value="">— no cambiar —</option>
              <option value="__clear">Sin categoría</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Proveedor</label>
            <select className="select" value={bulkFields.proveedor_id ?? ''}
              onChange={e => setBulkFields(p => ({ ...p, proveedor_id: e.target.value }))}>
              <option value="">— no cambiar —</option>
              <option value="__clear">Sin proveedor</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">Ubicación física</label>
            <input className="input" placeholder="— no cambiar —" value={bulkFields.ubicacion ?? ''}
              onChange={e => setBulkFields(p => ({ ...p, ubicacion: e.target.value }))} />
          </div>
          <div>
            <label className="label">Stock mínimo</label>
            <input className="input" type="number" min="0" placeholder="— no cambiar —"
              value={bulkFields.stock_minimo ?? ''}
              onChange={e => setBulkFields(p => ({ ...p, stock_minimo: e.target.value }))} />
          </div>
          <div>
            <label className="label">Precio unitario (CLP)</label>
            <input className="input" type="number" min="0" placeholder="— no cambiar —"
              value={bulkFields.precio_unitario ?? ''}
              onChange={e => setBulkFields(p => ({ ...p, precio_unitario: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* ── Modal movimiento rápido ─────────────────────────────── */}
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
                <input className="input" type="number" min="0" step="1" value={movForm.cantidad}
                  onChange={e => setMovForm(p => ({ ...p, cantidad: e.target.value }))} />
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

      {/* ── Modal historial ─────────────────────────────────────── */}
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
          {!histMovs.length && <p className="text-center py-6 text-slate-400">Sin movimientos registrados</p>}
        </div>
      </Modal>
    </>
  )
}
