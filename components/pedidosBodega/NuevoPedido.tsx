'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Search, PackageOpen } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { num, estaBajoMinimo } from '@/lib/utils'
import type { Material, Proyecto } from '@/types'

interface PedidoItem {
  material_id:     number
  codigo:          string
  descripcion:     string
  unidad:          string
  stock_actual:    number
  cantidad_pedida: number
}

export default function NuevoPedido({ proyectos: initialProyectos = [] }: { proyectos?: Pick<Proyecto, 'id' | 'ot' | 'nombre'>[] }) {
  const [items, setItems]           = useState<PedidoItem[]>([])
  const [proyectos, setProyectos]   = useState<Pick<Proyecto, 'id' | 'ot' | 'nombre'>[]>(initialProyectos)
  const [proyectoId, setProyectoId] = useState('')
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

  useEffect(() => {
    fetch('/api/proyectos')
      .then(r => r.json())
      .then((data: any[]) => {
        if (Array.isArray(data)) {
          setProyectos(data.filter((p: any) => p.estado === 'en_proceso' || p.estado === 'presupuesto'))
        }
      })
      .catch(() => {/* mantener initialProyectos si falla */})
  }, [])

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
      material_id: mat.id, codigo: mat.codigo, descripcion: mat.descripcion,
      unidad: mat.unidad, stock_actual: mat.stock_actual, cantidad_pedida: 1,
    }])
    setQuery(''); setSugg([]); setShowDrop(false)
    inputRef.current?.focus()
  }, [items, showToast])

  const updateItem = (idx: number, cantidad: number) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, cantidad_pedida: cantidad } : it))

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx))

  const handleSave = async () => {
    if (items.length === 0) { showToast('Agrega al menos un material', 'error'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/pedidos-bodega', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, proyecto_id: proyectoId ? parseInt(proyectoId) : null, observaciones }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al guardar')
      showToast(`Pedido ${data.numero} enviado a bodega`, 'success')
      router.push('/pedidos-bodega')
    } catch (e: any) {
      showToast(e.message, 'error')
      setSaving(false)
    }
  }

  return (
    <div className="p-5 w-full max-w-3xl">
      <div className="flex items-center gap-3 mb-5">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Nuevo pedido a bodega</h1>
          <p className="text-sm text-brand-n500">Material que ya existe en stock — el jefe de bodega lo aprueba y arma el despacho.</p>
        </div>
        <a href="/pedidos-bodega" className="btn btn-ghost btn-sm ml-auto">← Cancelar</a>
      </div>

      <div className="panel mb-4">
        <div className="panel-header"><h2>Obra</h2></div>
        <div className="p-4">
          <select className="select w-full" value={proyectoId} onChange={e => setProyectoId(e.target.value)}>
            <option value="">Sin obra específica</option>
            {proyectos.map(p => <option key={p.id} value={p.id}>{p.ot} — {p.nombre}</option>)}
          </select>
        </div>
      </div>

      <div className="panel-search mb-4">
        <div className="panel-header"><h2>Agregar materiales</h2></div>
        <div className="p-4">
          <div ref={searchRef} className="relative">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-n500 pointer-events-none">
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
                    <span className="text-xs text-brand-n500 flex-shrink-0">{mat.unidad}</span>
                    <span className={`text-xs font-medium flex-shrink-0 ${estaBajoMinimo(mat.stock_actual, mat.stock_minimo) ? 'text-red-600' : 'text-green-600'}`}>
                      Stock: {num(mat.stock_actual, 0)}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {showDrop && suggestions.length === 0 && query.length >= 2 && !loadingSearch && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl p-4 text-sm text-brand-n500 text-center">
                Sin resultados para «{query}»
              </div>
            )}
          </div>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="panel mb-4">
          <div className="panel-header">
            <h2>Ítems a pedir <span className="ml-2 badge badge-blue">{items.length}</span></h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="th">Código</th>
                  <th className="th">Descripción</th>
                  <th className="th td-r">Stock disponible</th>
                  <th className="th td-r" style={{ minWidth: 110 }}>Cantidad</th>
                  <th className="th">Un.</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={it.material_id} className="tr-hover">
                    <td className="td"><span className="code">{it.codigo}</span></td>
                    <td className="td">{it.descripcion}</td>
                    <td className="td-r text-slate-600">{num(it.stock_actual, 0)}</td>
                    <td className="td-r">
                      <input type="number" min="0.01" step="1" value={it.cantidad_pedida}
                        onChange={e => updateItem(idx, parseFloat(e.target.value) || 1)}
                        className="input text-right text-sm w-24" />
                    </td>
                    <td className="td text-brand-n500">{it.unidad}</td>
                    <td className="td text-center">
                      <button onClick={() => removeItem(idx)}
                        className="w-6 h-6 flex items-center justify-center rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors text-lg leading-none"
                        title="Quitar">×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="panel mb-4 py-12 text-center text-brand-n500">
          <PackageOpen size={36} className="mx-auto mb-2" style={{ color: '#D8D8D8' }} />
          <p className="font-medium mb-1 text-brand-n500">Sin ítems todavía</p>
          <p className="text-sm">Usa el buscador de arriba</p>
        </div>
      )}

      <div className="panel mb-5">
        <div className="panel-header"><h2>Observaciones</h2></div>
        <div className="p-4">
          <textarea value={observaciones} onChange={e => setObs(e.target.value)} rows={3}
            placeholder="Para qué es, urgencia, dónde retirarlo…" className="textarea w-full" />
        </div>
      </div>

      <div className="flex gap-3 items-center">
        <button onClick={handleSave} disabled={saving || items.length === 0} className="btn btn-primary">
          {saving ? <><Loader2 size={14} className="animate-spin" /> Enviando…</> : `Enviar a bodega (${items.length} ítem${items.length !== 1 ? 's' : ''})`}
        </button>
        <a href="/pedidos-bodega" className="btn btn-outline">Cancelar</a>
      </div>
    </div>
  )
}
