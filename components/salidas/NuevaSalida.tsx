'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Search, Package, AlertTriangle } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { num, clp } from '@/lib/utils'
import type { Material, Proyecto } from '@/types'

interface SalidaItem {
  material_id:        number
  codigo:             string
  descripcion:        string
  unidad:             string
  stock_actual:       number
  cantidad_entregada: number
  precio_unit:        number
}

export default function NuevaSalida({ proyectos }: { proyectos: Pick<Proyecto, 'id' | 'ot' | 'nombre'>[] }) {
  const [items, setItems]           = useState<SalidaItem[]>([])
  const [proyectoId, setProyectoId] = useState('')
  const [usuario, setUsuario]       = useState('')
  const [motivo, setMotivo]         = useState('')
  const [observaciones, setObs]     = useState('')
  const [query, setQuery]           = useState('')
  const [suggestions, setSugg]      = useState<Material[]>([])
  const [showDrop, setShowDrop]     = useState(false)
  const [loadingSearch, setLS]      = useState(false)
  const [saving, setSaving]         = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  const { showToast } = useToast()
  const router = useRouter()

  // Búsqueda debounced
  useEffect(() => {
    if (query.length < 2) { setSugg([]); setShowDrop(false); return }
    const t = setTimeout(async () => {
      setLS(true)
      try {
        const res  = await fetch(`/api/materiales?q=${encodeURIComponent(query)}&limit=10`)
        const data = await res.json()
        setSugg(data.data ?? [])
        setShowDrop(true)
      } finally { setLS(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDrop(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const addItem = useCallback((mat: Material) => {
    if (items.some(i => i.material_id === mat.id)) {
      showToast(`${mat.codigo} ya está en la lista`, 'error'); return
    }
    setItems(prev => [...prev, {
      material_id:        mat.id,
      codigo:             mat.codigo,
      descripcion:        mat.descripcion,
      unidad:             mat.unidad,
      stock_actual:       mat.stock_actual,
      cantidad_entregada: 1,
      precio_unit:        mat.precio_unitario ?? 0,
    }])
    setQuery(''); setSugg([]); setShowDrop(false)
    inputRef.current?.focus()
  }, [items, showToast])

  const updateCantidad = (idx: number, val: number) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, cantidad_entregada: val } : it))

  const removeItem = (idx: number) =>
    setItems(prev => prev.filter((_, i) => i !== idx))

  const hasStockError = items.some(it => it.cantidad_entregada > it.stock_actual)

  const handleSave = async () => {
    if (items.length === 0) { showToast('Agrega al menos un material', 'error'); return }
    if (hasStockError)      { showToast('Hay ítems que exceden el stock disponible', 'error'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/salidas', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          proyecto_id: proyectoId ? parseInt(proyectoId) : null,
          usuario, motivo, observaciones,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al guardar')
      showToast(`Vale ${data.numero} creado — stock actualizado`, 'success')
      router.push(`/salidas/${data.id}/imprimir`)
    } catch (e: any) {
      showToast(e.message, 'error')
      setSaving(false)
    }
  }

  const totalEstimado = items.reduce((acc, i) => acc + i.precio_unit * i.cantidad_entregada, 0)

  return (
    <div className="p-5 max-w-5xl">
      {/* Encabezado */}
      <div className="flex items-center gap-3 mb-5">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Nuevo vale de despacho</h1>
          <p className="text-sm text-slate-500">Registra la salida y descuenta el stock automáticamente</p>
        </div>
        <a href="/salidas" className="btn btn-ghost btn-sm ml-auto">← Cancelar</a>
      </div>

      {/* Datos del despacho */}
      <div className="panel mb-4">
        <div className="panel-header"><h2>Datos del despacho</h2></div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="label">Proyecto / OT</label>
            <select className="select w-full" value={proyectoId} onChange={e => setProyectoId(e.target.value)}>
              <option value="">Sin proyecto</option>
              {proyectos.map(p => (
                <option key={p.id} value={p.id}>{p.ot} — {p.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Solicitado por</label>
            <input className="input w-full" value={usuario} onChange={e => setUsuario(e.target.value)} placeholder="Nombre…" />
          </div>
          <div>
            <label className="label">Motivo</label>
            <input className="input w-full" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej: Armado tablero…" />
          </div>
        </div>
      </div>

      {/* Buscador — usa panel-search (sin overflow-hidden) para que el dropdown absoluto no se corte */}
      <div className="panel-search mb-4">
        <div className="panel-header"><h2>Agregar materiales</h2></div>
        <div className="p-4">
          <div ref={searchRef} className="relative">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                {loadingSearch ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              </span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowDrop(true)}
                placeholder="Buscar por código o descripción (mín. 2 caracteres)…"
                className="input w-full pl-9"
              />
            </div>
            {showDrop && suggestions.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-72 overflow-y-auto">
                {suggestions.map(mat => (
                  <button key={mat.id} onMouseDown={e => { e.preventDefault(); addItem(mat) }}
                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-center gap-3 border-b border-slate-100 last:border-0 transition-colors">
                    <span className="code text-xs flex-shrink-0 w-24 truncate">{mat.codigo}</span>
                    <span className="text-sm text-slate-800 flex-1 min-w-0 truncate">{mat.descripcion}</span>
                    <span className="text-xs text-slate-400 flex-shrink-0">{mat.unidad}</span>
                    <span className={`text-xs font-medium flex-shrink-0 ${
                      mat.stock_actual <= 0 ? 'text-red-600' :
                      mat.stock_actual <= mat.stock_minimo ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      Stock: {num(mat.stock_actual, 0)}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {showDrop && suggestions.length === 0 && query.length >= 2 && !loadingSearch && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl p-4 text-sm text-slate-400 text-center">
                Sin resultados para «{query}»
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabla de ítems */}
      {items.length > 0 ? (
        <div className="panel mb-4">
          <div className="panel-header">
            <h2>Materiales a despachar <span className="ml-2 badge badge-blue">{items.length}</span></h2>
            {totalEstimado > 0 && (
              <span className="text-sm text-slate-600">
                Total: <strong className="text-slate-800">{clp(totalEstimado)}</strong>
              </span>
            )}
          </div>
          {hasStockError && (
            <div className="mx-4 mb-0 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle size={14} /> Ítems en rojo exceden el stock disponible — corrígelos antes de confirmar.
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr>
                <th className="th">Código</th>
                <th className="th">Descripción</th>
                <th className="th text-right">Stock disp.</th>
                <th className="th text-right" style={{ minWidth: 130 }}>Cantidad a despachar</th>
                <th className="th">Un.</th>
                <th className="th"></th>
              </tr></thead>
              <tbody>
                {items.map((it, idx) => {
                  const over = it.cantidad_entregada > it.stock_actual
                  return (
                    <tr key={it.material_id} className={`tr-hover ${over ? 'bg-red-50' : ''}`}>
                      <td className="td"><span className="code">{it.codigo}</span></td>
                      <td className="td">{it.descripcion}</td>
                      <td className={`td text-right font-medium ${it.stock_actual <= 0 ? 'text-red-600' : 'text-slate-600'}`}>
                        {num(it.stock_actual, 0)}
                      </td>
                      <td className="td text-right">
                        <input
                          type="number" min="0.01" step="1"
                          value={it.cantidad_entregada}
                          onChange={e => updateCantidad(idx, parseFloat(e.target.value) || 1)}
                          className={`input text-right text-sm w-28 ${over ? 'border-red-400' : ''}`}
                        />
                        {over && <p className="text-red-500 text-xs mt-0.5 text-right">Excede stock</p>}
                      </td>
                      <td className="td text-slate-400">{it.unidad}</td>
                      <td className="td text-center">
                        <button onClick={() => removeItem(idx)}
                          className="w-6 h-6 flex items-center justify-center rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors text-lg leading-none">
                          ×
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="panel mb-4 py-12 text-center text-slate-400">
          <Package size={36} className="mx-auto mb-2" style={{ color: '#D8D8D8' }} />
          <p className="font-medium mb-1 text-slate-500">Sin materiales todavía</p>
          <p className="text-sm">Usa el buscador para agregar materiales a despachar</p>
        </div>
      )}

      {/* Observaciones */}
      <div className="panel mb-5">
        <div className="panel-header"><h2>Observaciones</h2></div>
        <div className="p-4">
          <textarea value={observaciones} onChange={e => setObs(e.target.value)} rows={3}
            placeholder="Instrucciones adicionales, destino, referencias…" className="textarea w-full" />
        </div>
      </div>

      {/* Botones */}
      <div className="flex gap-3 items-center flex-wrap">
        <button onClick={handleSave} disabled={saving || items.length === 0 || hasStockError}
          className="btn btn-primary">
          {saving ? <><Loader2 size={14} className="animate-spin" /> Procesando…</> : `Confirmar despacho (${items.length} ítem${items.length !== 1 ? 's' : ''})`}
        </button>
        <a href="/salidas" className="btn btn-outline">Cancelar</a>
        {hasStockError && (
          <span className="text-sm text-red-600 font-medium flex items-center gap-1"><AlertTriangle size={13} /> Corrige el stock antes de confirmar</span>
        )}
      </div>
    </div>
  )
}
