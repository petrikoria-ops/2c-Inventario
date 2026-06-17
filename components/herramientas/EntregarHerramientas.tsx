'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Search, Wrench, AlertTriangle } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import type { Herramienta, Trabajador } from '@/types'

interface EntregaItem {
  id:          number
  codigo:      string
  descripcion: string
  responsable: string | null
  notas:       string
}

export default function EntregarHerramientas({ trabajadores: initialTrabajadores }: { trabajadores: Trabajador[] }) {
  const [items,        setItems]       = useState<EntregaItem[]>([])
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>(initialTrabajadores)
  const [trabajadorId, setTrabId]      = useState('')
  const [usuario,      setUsuario]     = useState('')
  const [observaciones, setObs]        = useState('')
  const [query,        setQuery]       = useState('')
  const [suggestions,  setSugg]        = useState<Herramienta[]>([])
  const [showDrop,     setShowDrop]    = useState(false)
  const [loadingSearch, setLS]         = useState(false)
  const [saving,       setSaving]      = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  const { showToast } = useToast()
  const router = useRouter()

  // Fetch trabajadores frescos en cada montaje (evita datos obsoletos de SSR)
  useEffect(() => {
    fetch('/api/trabajadores')
      .then(r => r.json())
      .then(json => { if (Array.isArray(json.data)) setTrabajadores(json.data) })
      .catch(() => {/* mantener initialTrabajadores si falla */})
  }, [])

  // Búsqueda debounced
  useEffect(() => {
    if (query.length < 2) { setSugg([]); setShowDrop(false); return }
    const t = setTimeout(async () => {
      setLS(true)
      try {
        const res  = await fetch(`/api/herramientas?q=${encodeURIComponent(query)}&limit=10`)
        const data = await res.json()
        setSugg(Array.isArray(data) ? data.filter((h: Herramienta) => h.activo && h.estado === 'operativa') : [])
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

  const addItem = useCallback((h: Herramienta) => {
    if (items.some(i => i.id === h.id)) {
      showToast(`${h.codigo} ya está en la lista`, 'error'); return
    }
    setItems(prev => [...prev, {
      id: h.id, codigo: h.codigo, descripcion: h.descripcion,
      responsable: h.responsable, notas: '',
    }])
    setQuery(''); setSugg([]); setShowDrop(false)
    inputRef.current?.focus()
  }, [items, showToast])

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx))
  const updateNotas = (idx: number, val: string) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, notas: val } : it))

  const trabajadorSeleccionado = trabajadores.find(t => String(t.id) === trabajadorId)

  const handleSave = async () => {
    if (!trabajadorId && !usuario.trim()) {
      showToast('Selecciona un trabajador o escribe un nombre', 'error'); return
    }
    if (items.length === 0) { showToast('Agrega al menos una herramienta', 'error'); return }
    setSaving(true)
    try {
      const nombreFinal = trabajadorSeleccionado?.nombre ?? usuario.trim()
      const res = await fetch('/api/herramientas/entregar', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          herramientas:     items,
          trabajador_id:    trabajadorId ? Number(trabajadorId) : null,
          trabajador_nombre: nombreFinal,
          usuario:          usuario.trim() || nombreFinal,
          observaciones,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al guardar')
      showToast(`Comprobante ${data.numero} generado`, 'success')
      router.push(`/herramientas/entregas/${data.id}/imprimir`)
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-5 max-w-4xl">
      {/* Encabezado */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <Wrench size={20} style={{ color: '#2E333A' }} />
        <div>
          <h1 className="text-lg font-bold text-slate-800">Entrega de herramientas</h1>
          <p className="text-sm text-slate-500">Genera comprobante y actualiza el responsable de cada herramienta</p>
        </div>
        <a href="/trabajadores" className="btn btn-ghost btn-sm ml-auto">← Trabajadores</a>
      </div>

      {/* Responsable */}
      <div className="panel mb-4">
        <div className="panel-header"><h2>Trabajador responsable</h2></div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="label">Seleccionar trabajador</label>
            <select className="select w-full" value={trabajadorId}
              onChange={e => setTrabId(e.target.value)}>
              <option value="">— Escribir nombre manualmente —</option>
              {trabajadores.map(t => (
                <option key={t.id} value={t.id}>
                  {t.nombre}{t.cargo ? ` · ${t.cargo}` : ''}
                </option>
              ))}
            </select>
          </div>
          {!trabajadorId && (
            <div>
              <label className="label">Nombre <span className="text-red-500">*</span></label>
              <input className="input w-full" value={usuario}
                onChange={e => setUsuario(e.target.value)}
                placeholder="Nombre completo del receptor…" />
            </div>
          )}
        </div>
      </div>

      {/* Buscador herramientas */}
      <div className="panel-search mb-4">
        <div className="panel-header"><h2>Agregar herramientas</h2></div>
        <div className="p-4">
          <div ref={searchRef} className="relative">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                {loadingSearch ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              </span>
              <input ref={inputRef} type="text" value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowDrop(true)}
                placeholder="Buscar herramienta (código o descripción, mín. 2 car.)…"
                className="input w-full pl-9" />
            </div>
            {showDrop && suggestions.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                {suggestions.map(h => (
                  <button key={h.id} onMouseDown={e => { e.preventDefault(); addItem(h) }}
                    className="w-full text-left px-4 py-2.5 hover:bg-amber-50 flex items-center gap-3 border-b border-slate-100 last:border-0 transition-colors">
                    <span className="code text-xs flex-shrink-0 w-24 truncate">{h.codigo}</span>
                    <span className="text-sm text-slate-800 flex-1 min-w-0 truncate">{h.descripcion}</span>
                    {h.responsable && (
                      <span className="text-xs text-slate-400 flex-shrink-0">Con: {h.responsable}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
            {showDrop && suggestions.length === 0 && query.length >= 2 && !loadingSearch && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl p-4 text-sm text-slate-400 text-center">
                Sin resultados operativos para «{query}»
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lista */}
      {items.length > 0 ? (
        <div className="panel mb-4">
          <div className="panel-header">
            <h2>Herramientas a entregar <span className="ml-2 badge badge-blue">{items.length}</span></h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr>
                <th className="th">Código</th>
                <th className="th">Descripción</th>
                <th className="th">Responsable actual</th>
                <th className="th">Notas / observación</th>
                <th className="th"></th>
              </tr></thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={it.id} className="tr-hover">
                    <td className="td"><span className="code">{it.codigo}</span></td>
                    <td className="td font-medium">{it.descripcion}</td>
                    <td className="td text-xs text-slate-400">{it.responsable ?? '—'}</td>
                    <td className="td">
                      <input type="text" value={it.notas} onChange={e => updateNotas(idx, e.target.value)}
                        placeholder="Opcional…" className="input text-sm w-full" />
                    </td>
                    <td className="td text-center">
                      <button onClick={() => removeItem(idx)}
                        className="w-6 h-6 flex items-center justify-center rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors text-lg leading-none">
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
          <Wrench size={36} className="mx-auto mb-2" style={{ color: '#D8D8D8' }} />
          <p className="font-medium mb-1 text-slate-500">Sin herramientas todavía</p>
          <p className="text-sm">Usa el buscador para agregar herramientas operativas</p>
        </div>
      )}

      {/* Observaciones */}
      <div className="panel mb-5">
        <div className="panel-header"><h2>Observaciones</h2></div>
        <div className="p-4">
          <textarea value={observaciones} onChange={e => setObs(e.target.value)} rows={3}
            className="textarea w-full" placeholder="Instrucciones, condiciones de devolución…" />
        </div>
      </div>

      {/* Botones */}
      <div className="flex gap-3 items-center flex-wrap">
        <button onClick={handleSave}
          disabled={saving || items.length === 0 || (!trabajadorId && !usuario.trim())}
          className="btn btn-primary">
          {saving
            ? <><Loader2 size={14} className="animate-spin" /> Procesando…</>
            : `Confirmar entrega (${items.length} herramienta${items.length !== 1 ? 's' : ''})`}
        </button>
        <a href="/herramientas" className="btn btn-outline">Cancelar</a>
        {!trabajadorId && !usuario.trim() && items.length > 0 && (
          <span className="text-sm text-amber-600 flex items-center gap-1">
            <AlertTriangle size={13} /> Indica el trabajador responsable
          </span>
        )}
      </div>
    </div>
  )
}
