'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Search, Download, ClipboardList, CheckCircle, AlertTriangle, Circle, Square, ShoppingCart } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { num } from '@/lib/utils'
import type { Material, Proyecto, ProyectoMaterial } from '@/types'

type EstadoItem = 'ok' | 'parcial' | 'sin_stock' | 'no_registrado'

interface EvalItem extends ProyectoMaterial {
  stock_actual: number
  faltante:     number
  estado:       EstadoItem
}

interface EvalResult {
  items:      EvalItem[]
  status:     'completo' | 'incompleto' | 'sin_bom'
  faltanCount: number
  totalItems: number
}

interface ImportRow {
  codigo:             string
  descripcion:        string
  unidad:             string
  cantidad_requerida: number
}

const ESTADO_LABELS: Record<EstadoItem, { label: string; cls: string }> = {
  ok:             { label: 'OK',           cls: 'badge-green' },
  parcial:        { label: 'Parcial',      cls: 'badge-yellow' },
  sin_stock:      { label: 'Sin stock',    cls: 'badge-red' },
  no_registrado:  { label: 'No registrado', cls: 'badge-gray' },
}

export default function FactibilidadProyecto({
  proyecto,
  initialBom,
}: {
  proyecto:   Pick<Proyecto, 'id' | 'ot' | 'nombre' | 'cliente'>
  initialBom: ProyectoMaterial[]
}) {
  const [bom, setBom]               = useState<ProyectoMaterial[]>(initialBom)
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null)
  const [evaluating, setEvaluating] = useState(false)
  const [generating, setGenerating] = useState(false)

  // Búsqueda de materiales
  const [query, setQuery]           = useState('')
  const [suggestions, setSugg]      = useState<Material[]>([])
  const [showDrop, setShowDrop]     = useState(false)
  const [loadingSearch, setLS]      = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  // Formulario manual
  const [showManual, setShowManual] = useState(false)
  const [manual, setManual]         = useState({ codigo: '', descripcion: '', unidad: 'UN', cantidad_requerida: 1 })
  const [savingManual, setSavingManual] = useState(false)

  // Importar Excel
  const [importPreview, setImportPreview] = useState<ImportRow[] | null>(null)
  const [importing, setImporting]         = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDrop(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  // Recarga BOM desde servidor
  const reloadBom = useCallback(async () => {
    const res = await fetch(`/api/proyectos/${proyecto.id}/materiales`)
    if (res.ok) setBom(await res.json())
  }, [proyecto.id])

  // Agregar desde búsqueda
  const addFromSearch = useCallback(async (mat: Material) => {
    if (bom.some(b => b.codigo === mat.codigo)) {
      showToast(`${mat.codigo} ya está en el BOM`, 'error'); return
    }
    const res = await fetch(`/api/proyectos/${proyecto.id}/materiales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        material_id:        mat.id,
        codigo:             mat.codigo,
        descripcion:        mat.descripcion,
        unidad:             mat.unidad,
        cantidad_requerida: 1,
      }),
    })
    if (!res.ok) { showToast('Error al agregar', 'error'); return }
    await reloadBom()
    setEvalResult(null)
    setQuery(''); setSugg([]); setShowDrop(false)
    inputRef.current?.focus()
  }, [bom, proyecto.id, reloadBom, showToast])

  // Agregar manualmente
  const addManual = async () => {
    if (!manual.codigo || !manual.descripcion) {
      showToast('Código y descripción son obligatorios', 'error'); return
    }
    if (bom.some(b => b.codigo === manual.codigo.toUpperCase())) {
      showToast(`${manual.codigo} ya está en el BOM`, 'error'); return
    }
    setSavingManual(true)
    const res = await fetch(`/api/proyectos/${proyecto.id}/materiales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(manual),
    })
    setSavingManual(false)
    if (!res.ok) { showToast('Error al agregar', 'error'); return }
    await reloadBom()
    setEvalResult(null)
    setManual({ codigo: '', descripcion: '', unidad: 'UN', cantidad_requerida: 1 })
    setShowManual(false)
    showToast('Material agregado al BOM', 'success')
  }

  // Actualizar cantidad en BOM
  const updateCantidad = useCallback(async (item: ProyectoMaterial, val: number) => {
    setBom(prev => prev.map(b => b.id === item.id ? { ...b, cantidad_requerida: val } : b))
    setEvalResult(null)
    await fetch(`/api/proyectos/${proyecto.id}/materiales/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cantidad_requerida: val }),
    })
  }, [proyecto.id])

  // Eliminar ítem del BOM
  const removeItem = useCallback(async (item: ProyectoMaterial) => {
    const res = await fetch(`/api/proyectos/${proyecto.id}/materiales/${item.id}`, { method: 'DELETE' })
    if (!res.ok) { showToast('Error al eliminar', 'error'); return }
    setBom(prev => prev.filter(b => b.id !== item.id))
    setEvalResult(null)
  }, [proyecto.id, showToast])

  // Evaluar factibilidad
  const evaluar = async () => {
    if (bom.length === 0) { showToast('El BOM está vacío', 'error'); return }
    setEvaluating(true)
    try {
      const res = await fetch(`/api/proyectos/${proyecto.id}/factibilidad`)
      if (!res.ok) throw new Error('Error al evaluar')
      setEvalResult(await res.json())
    } catch { showToast('Error al evaluar', 'error') }
    finally { setEvaluating(false) }
  }

  // Generar solicitud de compra
  const generarSolicitud = async () => {
    if (!evalResult) return
    const faltantes = evalResult.items
      .filter(i => i.faltante > 0)
      .map(i => ({
        codigo:      i.codigo,
        descripcion: i.descripcion,
        unidad:      i.unidad,
        faltante:    i.faltante,
        material_id: i.material_id,
      }))
    if (!faltantes.length) { showToast('No hay faltantes', 'error'); return }
    setGenerating(true)
    try {
      const res = await fetch(`/api/proyectos/${proyecto.id}/solicitud`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faltantes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast(`Solicitud ${data.numero} creada`, 'success')
      router.push(`/solicitudes/${data.id}/imprimir`)
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally { setGenerating(false) }
  }

  // Importar desde Excel
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const xlsx = await import('xlsx')
      const buf  = await file.arrayBuffer()
      const wb   = xlsx.read(buf, { type: 'array' })
      const ws   = wb.Sheets[wb.SheetNames[0]]
      const raw: any[] = xlsx.utils.sheet_to_json(ws, { defval: '' })

      const parsed: ImportRow[] = raw.map(r => {
        const keys = Object.keys(r).map(k => k.toLowerCase().trim())
        const get  = (...names: string[]) => {
          for (const n of names) {
            const k = keys.find(k => k.includes(n))
            if (k) return String(r[Object.keys(r)[keys.indexOf(k)]] ?? '').trim()
          }
          return ''
        }
        return {
          codigo:             get('codigo', 'code', 'sku').toUpperCase().replace(/\s+/g, '-'),
          descripcion:        get('descripcion', 'description', 'desc', 'nombre'),
          unidad:             get('unidad', 'unit', 'um') || 'UN',
          cantidad_requerida: Math.max(parseFloat(get('cantidad', 'qty', 'quantity', 'cant').replace(',', '.')) || 1, 0),
        }
      }).filter(r => r.codigo && r.descripcion)

      if (!parsed.length) { showToast('No se encontraron filas válidas (necesita columnas: codigo, descripcion, unidad, cantidad)', 'error'); return }
      setImportPreview(parsed)
    } catch { showToast('Error al leer el archivo', 'error') }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const confirmImport = async () => {
    if (!importPreview) return
    setImporting(true)
    try {
      const res = await fetch(`/api/proyectos/${proyecto.id}/materiales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importPreview),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      await reloadBom()
      setEvalResult(null)
      setImportPreview(null)
      showToast(`${importPreview.length} ítem(s) importados`, 'success')
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally { setImporting(false) }
  }

  const faltantes = evalResult?.items.filter(i => i.faltante > 0) ?? []

  return (
    <div className="p-5 w-full">
      {/* Encabezado */}
      <div className="flex items-start gap-3 mb-5">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <a href="/proyectos" className="text-sm text-blue-600 hover:underline">← Proyectos</a>
          </div>
          <h1 className="text-lg font-bold text-slate-800">
            Factibilidad — {proyecto.ot}
          </h1>
          <p className="text-sm text-slate-500">{proyecto.nombre}{proyecto.cliente ? ` · ${proyecto.cliente}` : ''}</p>
        </div>
      </div>

      {/* BOM — usa panel-search (sin overflow-hidden) para que el dropdown del buscador no se corte */}
      <div className="panel-search mb-4">
        <div className="panel-header">
          <h2>
            Lista de materiales (BOM)
            {bom.length > 0 && <span className="ml-2 badge badge-blue">{bom.length}</span>}
          </h2>
          <div className="flex gap-2">
            <button onClick={() => setShowManual(v => !v)} className="btn btn-outline btn-sm">
              {showManual ? '× Cancelar' : '+ Agregar manual'}
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="btn btn-outline btn-sm">
              <Download size={13} /> Importar Excel
            </button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={handleFileChange} />
          </div>
        </div>

        {/* Buscador */}
        <div className="px-4 pt-3 pb-2">
          <div ref={searchRef} className="relative">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                {loadingSearch ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              </span>
              <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowDrop(true)}
                placeholder="Buscar material del inventario para agregar al BOM…"
                className="input w-full pl-9" />
            </div>
            {showDrop && suggestions.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                {suggestions.map(mat => (
                  <button key={mat.id} onMouseDown={e => { e.preventDefault(); addFromSearch(mat) }}
                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-center gap-3 border-b border-slate-100 last:border-0 transition-colors">
                    <span className="code text-xs flex-shrink-0 w-24 truncate">{mat.codigo}</span>
                    <span className="text-sm text-slate-800 flex-1 min-w-0 truncate">{mat.descripcion}</span>
                    <span className="text-xs text-slate-400 flex-shrink-0">{mat.unidad}</span>
                    <span className="text-xs text-green-600 flex-shrink-0">Stock: {num(mat.stock_actual, 0)}</span>
                  </button>
                ))}
              </div>
            )}
            {showDrop && suggestions.length === 0 && query.length >= 2 && !loadingSearch && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl p-4 text-sm text-slate-400 text-center">
                Sin resultados — usa «+ Agregar manual» para ítems no registrados
              </div>
            )}
          </div>
        </div>

        {/* Formulario manual */}
        {showManual && (
          <div className="mx-4 mb-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Agregar ítem manual</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <label className="label">Código *</label>
                <input className="input w-full text-sm" value={manual.codigo}
                  onChange={e => setManual(p => ({ ...p, codigo: e.target.value.toUpperCase() }))}
                  placeholder="CON-001" />
              </div>
              <div className="md:col-span-2">
                <label className="label">Descripción *</label>
                <input className="input w-full text-sm" value={manual.descripcion}
                  onChange={e => setManual(p => ({ ...p, descripcion: e.target.value }))}
                  placeholder="Cable THHN 2.5mm…" />
              </div>
              <div>
                <label className="label">Unidad</label>
                <input className="input w-full text-sm" value={manual.unidad}
                  onChange={e => setManual(p => ({ ...p, unidad: e.target.value }))}
                  placeholder="m / UN / kg…" />
              </div>
              <div>
                <label className="label">Cantidad req.</label>
                <input type="number" min="0.01" step="1" className="input w-full text-sm"
                  value={manual.cantidad_requerida}
                  onChange={e => setManual(p => ({ ...p, cantidad_requerida: parseFloat(e.target.value) || 1 }))} />
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={addManual} disabled={savingManual} className="btn btn-primary btn-sm">
                {savingManual ? <Loader2 size={14} className="animate-spin" /> : 'Agregar'}
              </button>
              <button onClick={() => setShowManual(false)} className="btn btn-ghost btn-sm">Cancelar</button>
            </div>
          </div>
        )}

        {/* Preview importación */}
        {importPreview && (
          <div className="mx-4 mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-semibold text-blue-800 mb-2">
              Vista previa — {importPreview.length} ítem(s) a importar
            </p>
            <div className="overflow-x-auto max-h-48 mb-3">
              <table className="w-full text-xs">
                <thead><tr>
                  <th className="th">Código</th><th className="th">Descripción</th>
                  <th className="th">Un.</th><th className="th text-right">Cantidad</th>
                </tr></thead>
                <tbody>
                  {importPreview.slice(0, 10).map((r, i) => (
                    <tr key={i} className="tr-hover">
                      <td className="td"><span className="code">{r.codigo}</span></td>
                      <td className="td">{r.descripcion}</td>
                      <td className="td">{r.unidad}</td>
                      <td className="td text-right">{num(r.cantidad_requerida, 2)}</td>
                    </tr>
                  ))}
                  {importPreview.length > 10 && (
                    <tr><td colSpan={4} className="td text-center text-slate-400">… y {importPreview.length - 10} más</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <button onClick={confirmImport} disabled={importing} className="btn btn-primary btn-sm">
                {importing ? <><Loader2 size={14} className="animate-spin" /> Importando…</> : `Confirmar importación (${importPreview.length})`}
              </button>
              <button onClick={() => setImportPreview(null)} className="btn btn-ghost btn-sm">Cancelar</button>
            </div>
          </div>
        )}

        {/* Tabla BOM */}
        {bom.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr>
                <th className="th">Código</th>
                <th className="th">Descripción</th>
                <th className="th">Un.</th>
                <th className="th text-right" style={{ minWidth: 120 }}>Cant. requerida</th>
                <th className="th"></th>
              </tr></thead>
              <tbody>
                {bom.map(item => (
                  <tr key={item.id} className="tr-hover">
                    <td className="td"><span className="code">{item.codigo}</span></td>
                    <td className="td">{item.descripcion}</td>
                    <td className="td text-slate-400">{item.unidad}</td>
                    <td className="td text-right">
                      <input type="number" min="0.01" step="1"
                        value={item.cantidad_requerida}
                        onChange={e => updateCantidad(item, parseFloat(e.target.value) || 1)}
                        className="input text-right text-sm w-24" />
                    </td>
                    <td className="td text-center">
                      <button onClick={() => removeItem(item)}
                        className="w-6 h-6 flex items-center justify-center rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors text-lg leading-none">
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-10 text-center text-slate-400 px-4">
            <ClipboardList size={36} className="mx-auto mb-2" style={{ color: '#D8D8D8' }} />
            <p className="font-medium text-slate-500 mb-1">BOM vacío</p>
            <p className="text-sm">Busca materiales del inventario, agrégalos manualmente, o importa desde Excel</p>
          </div>
        )}

        {/* Botón evaluar */}
        {bom.length > 0 && (
          <div className="p-4 border-t border-slate-100">
            <button onClick={evaluar} disabled={evaluating} className="btn btn-primary">
              {evaluating ? <><Loader2 size={14} className="animate-spin" /> Evaluando…</> : <><Search size={14} /> Evaluar factibilidad</>}
            </button>
            {evalResult && (
              <span className="ml-3 text-sm text-slate-500">
                Última evaluación: {new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Resultados */}
      {evalResult && evalResult.status !== 'sin_bom' && (
        <div className="panel">
          <div className="panel-header">
            <h2>Resultado de la evaluación</h2>
            <div className="flex items-center gap-3">
              {evalResult.status === 'completo' ? (
                <span className="badge badge-green text-sm px-3 py-1 flex items-center gap-1"><CheckCircle size={13} /> Stock completo</span>
              ) : (
                <span className="badge badge-red text-sm px-3 py-1 flex items-center gap-1">
                  <AlertTriangle size={13} /> Faltan {evalResult.faltanCount} ítem{evalResult.faltanCount !== 1 ? 's' : ''}
                </span>
              )}
              {faltantes.length > 0 && (
                <button onClick={generarSolicitud} disabled={generating} className="btn btn-primary btn-sm">
                  {generating ? <><Loader2 size={14} className="animate-spin" /> Generando…</> : <><ShoppingCart size={14} /> Generar solicitud de compra</>}
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr>
                <th className="th">Código</th>
                <th className="th">Descripción</th>
                <th className="th">Un.</th>
                <th className="th text-right">Requerido</th>
                <th className="th text-right">Disponible</th>
                <th className="th text-right">Faltante</th>
                <th className="th">Estado</th>
              </tr></thead>
              <tbody>
                {evalResult.items.map(item => (
                  <tr key={item.id} className={`tr-hover ${item.faltante > 0 ? 'bg-red-50/50' : ''}`}>
                    <td className="td"><span className="code">{item.codigo}</span></td>
                    <td className="td">{item.descripcion}</td>
                    <td className="td text-slate-400">{item.unidad}</td>
                    <td className="td text-right font-medium">{num(item.cantidad_requerida, 2)}</td>
                    <td className={`td text-right font-medium ${
                      item.stock_actual === 0 ? 'text-red-600' :
                      item.stock_actual < item.cantidad_requerida ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {item.estado === 'no_registrado' ? <span className="text-slate-400">—</span> : num(item.stock_actual, 2)}
                    </td>
                    <td className="td text-right font-medium text-red-600">
                      {item.faltante > 0 ? num(item.faltante, 2) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="td">
                      <span className={`badge ${ESTADO_LABELS[item.estado].cls}`}>
                        {ESTADO_LABELS[item.estado].label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {faltantes.length > 0 && (
            <div className="p-4 border-t border-slate-100 bg-amber-50/50">
              <p className="text-sm text-amber-800">
                Haz clic en <strong>«Generar solicitud de compra»</strong> para crear automáticamente
                una SC con los {faltantes.length} ítem{faltantes.length !== 1 ? 's' : ''} faltantes.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
