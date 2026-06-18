'use client'
import { useState, useCallback, useRef, DragEvent, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { Loader2, Upload, FileSpreadsheet, Search, X, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { clp, num } from '@/lib/utils'
import { parseSolicitudExcel } from '@/lib/solicitudes/parseExcel'
import type { Material } from '@/types'

type Match = 'codigo' | 'descripcion' | 'ia' | 'sin_match'

interface Row {
  codigo:             string
  descripcion:        string
  unidad:             string
  cantidad_pedida:    number
  material_id:        number | null
  stock_actual:       number | null
  precio_unitario:    number | null
  proveedor_sugerido: string | null
  match:              Match
}

const MATCH_BADGE: Record<Match, { label: string; cls: string }> = {
  codigo:      { label: '✓ por código',      cls: 'badge-green'  },
  descripcion: { label: '✓ por descripción', cls: 'badge-blue'   },
  ia:          { label: '✓ por IA',          cls: 'badge-brand'  },
  sin_match:   { label: '⚠ sin coincidencia', cls: 'badge-yellow' },
}

export default function ImportarSolicitudExcel() {
  const router = useRouter()
  const { showToast } = useToast()

  const [step, setStep]   = useState<'upload' | 'review'>('upload')
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [obra, setObra]           = useState('')
  const [supervisor, setSupervisor] = useState('')
  const [visitador, setVisitador]   = useState('')
  const [fechaEntrega, setFechaEntrega] = useState('')
  const [rows, setRows]           = useState<Row[]>([])
  const [saving, setSaving]       = useState(false)

  // ── Vincular material manualmente en filas sin coincidencia ─────
  const [linkingIdx, setLinkingIdx] = useState<number | null>(null)
  const [linkQuery, setLinkQuery]   = useState('')
  const [linkResults, setLinkResults] = useState<Material[]>([])
  const [linkSearching, setLinkSearching] = useState(false)

  const procesarArchivo = useCallback(async (file: File) => {
    if (!/\.xlsx?$/i.test(file.name)) {
      showToast('Solo se aceptan archivos .xlsx o .xls', 'error')
      return
    }
    setLoading(true)
    try {
      const buf  = await file.arrayBuffer()
      const wb   = XLSX.read(buf, { type: 'array', cellDates: true })
      const ws   = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' })
      const parsed = parseSolicitudExcel(data)

      if (parsed.items.length === 0) {
        showToast('No se encontraron ítems — ¿es el formato estándar de solicitud?', 'error')
        return
      }

      const res  = await fetch('/api/solicitudes/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: parsed.items }),
        cache: 'no-store',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al emparejar materiales')

      setObra(parsed.obra)
      setSupervisor(parsed.supervisor)
      setVisitador(parsed.visitador)
      setFechaEntrega(parsed.fechaEntrega)
      setRows(json.items)
      setStep('review')
    } catch (e: any) {
      showToast(e.message ?? 'Error al leer el archivo', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) procesarArchivo(file)
  }

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) procesarArchivo(file)
    e.target.value = ''
  }

  const updateRow = (idx: number, field: keyof Row, value: string | number) =>
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))

  const removeRow = (idx: number) =>
    setRows(prev => prev.filter((_, i) => i !== idx))

  // ── Búsqueda para vincular manualmente ───────────────────────
  const abrirVinculo = (idx: number) => {
    setLinkingIdx(idx)
    setLinkQuery('')
    setLinkResults([])
  }

  const buscarParaVincular = useCallback(async (q: string) => {
    setLinkQuery(q)
    if (q.length < 2) { setLinkResults([]); return }
    setLinkSearching(true)
    try {
      const res  = await fetch(`/api/materiales?q=${encodeURIComponent(q)}&limit=10`, { cache: 'no-store' })
      const data = await res.json()
      setLinkResults(data.data ?? [])
    } finally { setLinkSearching(false) }
  }, [])

  const vincularMaterial = (idx: number, mat: Material) => {
    setRows(prev => prev.map((r, i) => i === idx ? {
      ...r,
      codigo:             mat.codigo,
      unidad:             mat.unidad,
      material_id:        mat.id,
      stock_actual:       mat.stock_actual,
      precio_unitario:    mat.precio_unitario,
      proveedor_sugerido: (mat as any).proveedores?.nombre ?? r.proveedor_sugerido,
      match:              'codigo',
    } : r))
    setLinkingIdx(null)
  }

  const counts = rows.reduce((acc, r) => { acc[r.match]++; return acc }, { codigo: 0, descripcion: 0, ia: 0, sin_match: 0 })

  const guardar = useCallback(async () => {
    if (rows.length === 0) { showToast('No hay ítems para guardar', 'error'); return }
    setSaving(true)
    try {
      const observacionesAuto = [
        obra && `Obra: ${obra}`,
        visitador && `Visitador: ${visitador}`,
      ].filter(Boolean).join(' · ')

      const res = await fetch('/api/solicitudes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: rows,
          observaciones: observacionesAuto || null,
          obra, supervisor, visitador,
          fecha_entrega: fechaEntrega || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al guardar')
      showToast(`Solicitud ${data.numero} creada con ${rows.length} ítems`, 'success')
      router.push(`/solicitudes/${data.id}/imprimir`)
    } catch (e: any) {
      showToast(e.message, 'error')
      setSaving(false)
    }
  }, [rows, obra, supervisor, visitador, fechaEntrega, router, showToast])

  // ══════════════════════════════════════════════════════════════
  if (step === 'upload') {
    return (
      <div className="p-5 w-full max-w-3xl">
        <div className="flex items-center gap-3 mb-5">
          <div>
            <h1 className="text-lg font-bold text-slate-800">Importar solicitud desde Excel</h1>
            <p className="text-sm text-slate-500">
              Sube la planilla estándar que envía el supervisor de terreno (hoja "MATERIALES")
            </p>
          </div>
          <a href="/solicitudes" className="btn btn-ghost btn-sm ml-auto">← Cancelar</a>
        </div>

        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`panel flex flex-col items-center justify-center gap-3 py-16 cursor-pointer transition-colors ${dragOver ? 'border-2' : ''}`}
          style={dragOver ? { borderColor: '#F0C000', background: '#FFF8E0' } : {}}
        >
          {loading ? (
            <>
              <Loader2 size={32} className="animate-spin" style={{ color: '#F0C000' }} />
              <p className="text-sm text-slate-500">Leyendo planilla y emparejando materiales…</p>
            </>
          ) : (
            <>
              <Upload size={32} style={{ color: '#BBBBBB' }} />
              <p className="text-sm font-medium text-slate-600">Arrastra el archivo aquí o haz clic para elegirlo</p>
              <p className="text-xs text-slate-400">.xlsx / .xls</p>
            </>
          )}
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onFileChange} />
        </div>
      </div>
    )
  }

  return (
    <div className="p-5 w-full max-w-4xl">
      <div className="flex items-center gap-3 mb-5">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Revisar solicitud importada</h1>
          <p className="text-sm text-slate-500">Verifica los datos antes de guardar</p>
        </div>
        <button onClick={() => setStep('upload')} className="btn btn-ghost btn-sm ml-auto">← Subir otro archivo</button>
      </div>

      {/* Datos de la solicitud */}
      <div className="panel mb-4">
        <div className="panel-header"><h2>Datos de la solicitud</h2></div>
        <div className="p-4 grid grid-cols-2 gap-3">
          <div>
            <label className="label">Obra</label>
            <input className="input" value={obra} onChange={e => setObra(e.target.value)} />
          </div>
          <div>
            <label className="label">Supervisor de obra</label>
            <input className="input" value={supervisor} onChange={e => setSupervisor(e.target.value)} />
          </div>
          <div>
            <label className="label">Visitador</label>
            <input className="input" value={visitador} onChange={e => setVisitador(e.target.value)} />
          </div>
          <div>
            <label className="label">Fecha de entrega</label>
            <input className="input" type="date" value={fechaEntrega} onChange={e => setFechaEntrega(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Resumen de emparejamiento */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="badge badge-green">{counts.codigo} por código</span>
        <span className="badge badge-blue">{counts.descripcion} por descripción</span>
        {counts.ia > 0 && <span className="badge badge-brand">{counts.ia} por IA</span>}
        {counts.sin_match > 0 && <span className="badge badge-yellow">{counts.sin_match} sin coincidencia</span>}
        <span className="text-xs text-slate-400 self-center">— {rows.length} ítems en total</span>
      </div>

      {/* Tabla de ítems */}
      <div className="panel mb-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="th">Código</th>
                <th className="th">Descripción</th>
                <th className="th td-r" style={{ minWidth: 90 }}>Cantidad</th>
                <th className="th">Un.</th>
                <th className="th">Coincidencia</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx} className="tr-hover">
                  <td className="td"><span className="code">{r.codigo || '—'}</span></td>
                  <td className="td">{r.descripcion}</td>
                  <td className="td-r">
                    <input type="number" min="0.01" step="1" value={r.cantidad_pedida}
                      onChange={e => updateRow(idx, 'cantidad_pedida', parseFloat(e.target.value) || 1)}
                      className="input text-right text-sm w-20" />
                  </td>
                  <td className="td text-slate-400">{r.unidad || '—'}</td>
                  <td className="td relative">
                    <span className={`badge text-[11px] ${MATCH_BADGE[r.match].cls}`}>{MATCH_BADGE[r.match].label}</span>
                    {(r.match === 'sin_match' || r.match === 'ia') && (
                      <button className="btn-ghost btn-sm ml-1 text-xs" onClick={() => abrirVinculo(idx)}>
                        {r.match === 'ia' ? 'Corregir' : 'Vincular'}
                      </button>
                    )}
                    {linkingIdx === idx && (
                      <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl w-72 p-2">
                        <div className="relative mb-1">
                          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input autoFocus value={linkQuery} onChange={e => buscarParaVincular(e.target.value)}
                            placeholder="Buscar material…" className="input text-sm w-full pl-7" />
                          <button onClick={() => setLinkingIdx(null)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                            <X size={12} />
                          </button>
                        </div>
                        {linkSearching && <p className="text-xs text-slate-400 px-1">Buscando…</p>}
                        <div className="max-h-48 overflow-y-auto">
                          {linkResults.map(mat => (
                            <button key={mat.id} onMouseDown={e => { e.preventDefault(); vincularMaterial(idx, mat) }}
                              className="w-full text-left px-2 py-1.5 hover:bg-blue-50 rounded text-xs flex flex-col">
                              <span className="font-medium text-slate-700">{mat.descripcion}</span>
                              <span className="text-slate-400">{mat.codigo} · {mat.unidad}</span>
                            </button>
                          ))}
                          {!linkSearching && linkQuery.length >= 2 && linkResults.length === 0 && (
                            <p className="text-xs text-slate-400 px-1 py-1">Sin resultados</p>
                          )}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="td text-center">
                    <button onClick={() => removeRow(idx)}
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

      {counts.ia > 0 && (
        <div className="alert alert-blue mb-3">
          {counts.ia} ítem{counts.ia !== 1 ? 's' : ''} emparejado{counts.ia !== 1 ? 's' : ''} por IA — son sugerencias, revísalos antes de guardar.
        </div>
      )}
      {counts.sin_match > 0 && (
        <div className="alert alert-yellow mb-4">
          <AlertTriangle size={15} />
          {counts.sin_match} ítem{counts.sin_match !== 1 ? 's' : ''} sin coincidencia en inventario — puedes vincularlos manualmente o guardarlos igual (quedan sin material asociado).
        </div>
      )}

      <div className="flex gap-3 items-center">
        <button onClick={guardar} disabled={saving || rows.length === 0} className="btn btn-primary">
          {saving ? <><Loader2 size={14} className="animate-spin" /> Guardando…</> : <><CheckCircle2 size={14} /> Guardar solicitud ({rows.length} ítems)</>}
        </button>
        <a href="/solicitudes" className="btn btn-outline">Cancelar</a>
      </div>
    </div>
  )
}
