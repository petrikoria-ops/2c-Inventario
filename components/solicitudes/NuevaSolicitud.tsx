'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/contexts/ToastContext'
import { num, clp } from '@/lib/utils'
import type { Material } from '@/types'

interface SolicitudItem {
  material_id:       number
  codigo:            string
  descripcion:       string
  unidad:            string
  stock_actual:      number
  stock_minimo:      number
  cantidad_pedida:   number
  proveedor_sugerido: string
  precio_unitario:   number
}

export default function NuevaSolicitud() {
  const [items, setItems]             = useState<SolicitudItem[]>([])
  const [observaciones, setObs]       = useState('')
  const [query, setQuery]             = useState('')
  const [suggestions, setSuggestions] = useState<Material[]>([])
  const [showDrop, setShowDrop]       = useState(false)
  const [loadingSearch, setLS]        = useState(false)
  const [loadingFill, setLF]          = useState(false)
  const [saving, setSaving]           = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  const { showToast } = useToast()
  const router = useRouter()

  // Búsqueda con debounce 300 ms
  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); setShowDrop(false); return }
    const t = setTimeout(async () => {
      setLS(true)
      try {
        const res  = await fetch(`/api/materiales?q=${encodeURIComponent(query)}&limit=10`)
        const data = await res.json()
        setSuggestions(data.data ?? [])
        setShowDrop(true)
      } finally { setLS(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDrop(false)
      }
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const addItem = useCallback((mat: Material) => {
    if (items.some(i => i.material_id === mat.id)) {
      showToast(`${mat.codigo} ya está en la lista`, 'error')
      return
    }
    const falta = Math.max(mat.stock_minimo - mat.stock_actual, 1)
    setItems(prev => [...prev, {
      material_id:       mat.id,
      codigo:            mat.codigo,
      descripcion:       mat.descripcion,
      unidad:            mat.unidad,
      stock_actual:      mat.stock_actual,
      stock_minimo:      mat.stock_minimo,
      cantidad_pedida:   falta,
      proveedor_sugerido: mat.proveedores?.nombre ?? '',
      precio_unitario:   mat.precio_unitario ?? 0,
    }])
    setQuery('')
    setSuggestions([])
    setShowDrop(false)
    inputRef.current?.focus()
  }, [items, showToast])

  const autoFill = useCallback(async () => {
    setLF(true)
    try {
      const res  = await fetch('/api/materiales?bajo_minimo=1&limit=200')
      const data = await res.json()
      const mats: Material[] = data.data ?? []
      const nuevos = mats
        .filter(m => !items.some(i => i.material_id === m.id))
        .map(m => ({
          material_id:       m.id,
          codigo:            m.codigo,
          descripcion:       m.descripcion,
          unidad:            m.unidad,
          stock_actual:      m.stock_actual,
          stock_minimo:      m.stock_minimo,
          cantidad_pedida:   Math.max(m.stock_minimo - m.stock_actual, 1),
          proveedor_sugerido: m.proveedores?.nombre ?? '',
          precio_unitario:   m.precio_unitario ?? 0,
        }))
      if (nuevos.length === 0) {
        showToast('No hay materiales bajo el mínimo (o ya están todos en la lista)', 'error')
      } else {
        setItems(prev => [...prev, ...nuevos])
        showToast(`${nuevos.length} material(es) agregado(s) automáticamente`, 'success')
      }
    } catch { showToast('Error al cargar materiales', 'error') }
    finally { setLF(false) }
  }, [items, showToast])

  const updateItem = (idx: number, field: keyof SolicitudItem, value: string | number) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it))
  }

  const removeItem = (idx: number) =>
    setItems(prev => prev.filter((_, i) => i !== idx))

  const handleSave = async () => {
    if (items.length === 0) { showToast('Agrega al menos un material', 'error'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/solicitudes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, observaciones }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al guardar')
      showToast(`Solicitud ${data.numero} creada`, 'success')
      router.push(`/solicitudes/${data.id}/imprimir`)
    } catch (e: any) {
      showToast(e.message, 'error')
      setSaving(false)
    }
  }

  const totalEstimado = items.reduce(
    (acc, i) => acc + (i.precio_unitario * i.cantidad_pedida), 0
  )

  return (
    <div className="p-5 max-w-5xl">
      {/* Encabezado */}
      <div className="flex items-center gap-3 mb-5">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Nueva solicitud de compra</h1>
          <p className="text-sm text-slate-500">
            Busca materiales o usa "Autollenar" para agregar todos los ítems bajo stock mínimo
          </p>
        </div>
        <a href="/solicitudes" className="btn btn-ghost btn-sm ml-auto">← Cancelar</a>
      </div>

      {/* Buscador + Autollenar */}
      <div className="panel mb-4">
        <div className="panel-header">
          <h2>Agregar materiales</h2>
          <button
            onClick={autoFill}
            disabled={loadingFill}
            className="btn btn-outline btn-sm"
          >
            {loadingFill ? '⟳ Cargando…' : '⚡ Autollenar bajo mínimo'}
          </button>
        </div>
        <div className="p-4">
          <div ref={searchRef} className="relative">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                {loadingSearch ? '⟳' : '🔍'}
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

            {/* Dropdown de resultados */}
            {showDrop && suggestions.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-72 overflow-y-auto">
                {suggestions.map(mat => (
                  <button
                    key={mat.id}
                    onMouseDown={e => { e.preventDefault(); addItem(mat) }}
                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-center gap-3 border-b border-slate-100 last:border-0 transition-colors"
                  >
                    <span className="code text-xs flex-shrink-0 w-24 truncate">{mat.codigo}</span>
                    <span className="text-sm text-slate-800 flex-1 min-w-0 truncate">{mat.descripcion}</span>
                    <span className="text-xs text-slate-400 flex-shrink-0">{mat.unidad}</span>
                    <span className={`text-xs font-medium flex-shrink-0 ${mat.stock_actual <= mat.stock_minimo ? 'text-red-600' : 'text-green-600'}`}>
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
            <h2>
              Ítems a solicitar
              <span className="ml-2 badge badge-blue">{items.length}</span>
            </h2>
            {totalEstimado > 0 && (
              <span className="text-sm text-slate-600">
                Total estimado: <strong className="text-slate-800">{clp(totalEstimado)}</strong>
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="th">Código</th>
                  <th className="th">Descripción</th>
                  <th className="th td-r">Stock act.</th>
                  <th className="th td-r">Mín.</th>
                  <th className="th td-r" style={{ minWidth: 110 }}>Cant. pedida</th>
                  <th className="th">Un.</th>
                  <th className="th" style={{ minWidth: 160 }}>Proveedor sugerido</th>
                  <th className="th td-r">P. unit.</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={it.material_id} className="tr-hover">
                    <td className="td"><span className="code">{it.codigo}</span></td>
                    <td className="td">{it.descripcion}</td>
                    <td className={`td-r font-medium ${it.stock_actual <= it.stock_minimo ? 'text-red-600' : 'text-slate-600'}`}>
                      {num(it.stock_actual, 0)}
                    </td>
                    <td className="td-r text-slate-400">{num(it.stock_minimo, 0)}</td>
                    <td className="td-r">
                      <input
                        type="number"
                        min="0.01"
                        step="1"
                        value={it.cantidad_pedida}
                        onChange={e => updateItem(idx, 'cantidad_pedida', parseFloat(e.target.value) || 1)}
                        className="input text-right text-sm w-24"
                      />
                    </td>
                    <td className="td text-slate-400">{it.unidad}</td>
                    <td className="td">
                      <input
                        type="text"
                        value={it.proveedor_sugerido}
                        onChange={e => updateItem(idx, 'proveedor_sugerido', e.target.value)}
                        placeholder="Proveedor…"
                        className="input text-sm w-full"
                      />
                    </td>
                    <td className="td-r text-slate-400">
                      {it.precio_unitario ? clp(it.precio_unitario) : '—'}
                    </td>
                    <td className="td text-center">
                      <button
                        onClick={() => removeItem(idx)}
                        className="w-6 h-6 flex items-center justify-center rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors text-lg leading-none"
                        title="Quitar"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="panel mb-4 py-12 text-center text-slate-400">
          <p className="text-4xl mb-2">📋</p>
          <p className="font-medium mb-1 text-slate-500">Sin ítems todavía</p>
          <p className="text-sm">Usa el buscador de arriba o el botón "Autollenar"</p>
        </div>
      )}

      {/* Observaciones */}
      <div className="panel mb-5">
        <div className="panel-header"><h2>Observaciones</h2></div>
        <div className="p-4">
          <textarea
            value={observaciones}
            onChange={e => setObs(e.target.value)}
            rows={3}
            placeholder="Urgencia, instrucciones de entrega, referencia de cotización, contacto de proveedor…"
            className="textarea w-full"
          />
        </div>
      </div>

      {/* Botones */}
      <div className="flex gap-3 items-center">
        <button
          onClick={handleSave}
          disabled={saving || items.length === 0}
          className="btn btn-primary"
        >
          {saving ? '⟳ Guardando…' : `Guardar y ver documento (${items.length} ítem${items.length !== 1 ? 's' : ''})`}
        </button>
        <a href="/solicitudes" className="btn btn-outline">Cancelar</a>
      </div>
    </div>
  )
}
