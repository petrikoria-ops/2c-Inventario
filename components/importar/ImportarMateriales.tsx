'use client'
import { useState, useCallback, useRef, DragEvent, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plug, Wrench, Upload, CheckCircle, AlertTriangle,
  Database, FileText, X, Check, Tag, Cpu, Loader2,
} from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { VALID_CATEGORIES } from '@/lib/importar/categorias-map'

// ─── Tipos ────────────────────────────────────────────────────
type ImportType  = 'materiales' | 'herramientas'
type Step        = 'type-select' | 'upload' | 'mapping' | 'analyzing' | 'review' | 'importing' | 'done'
type ConflictRes = 'update' | 'skip' | 'new-sku'
type FileDupRes  = 'keep-first' | 'keep-last' | 'skip-all'

interface AppField { label: string; required: boolean; type: 'text' | 'number' | 'date' | 'enum' }

interface CatMatch {
  rowIdx:      number
  rowNum:      number
  codigo:      string
  descripcion: string
  suggested:   string | null
  confidence:  'alta' | 'none'
  keyword:     string | null
}

interface AnalysisResult {
  errors:          any[]
  corrections:     any[]
  fileDups:        any[]
  dbConflicts:     any[]
  validCount:      number
  totalRows:       number
  categoryMatches: CatMatch[]
}

interface ImportResult {
  inserted: number
  updated:  number
  skipped:  number
  errors:   { codigo: string; error: string }[]
}

// ─── Campos por tipo ──────────────────────────────────────────
const FIELDS: Record<ImportType, Record<string, AppField>> = {
  materiales: {
    codigo:           { label: 'Código *',       required: true,  type: 'text'   },
    descripcion:      { label: 'Descripción *',  required: true,  type: 'text'   },
    categoria_nombre: { label: 'Categoría',      required: false, type: 'text'   },
    proveedor_nombre: { label: 'Proveedor',      required: false, type: 'text'   },
    ubicacion:        { label: 'Ubicación',      required: false, type: 'text'   },
    stock_actual:     { label: 'Stock actual',   required: false, type: 'number' },
    stock_minimo:     { label: 'Stock mínimo',   required: false, type: 'number' },
    unidad:           { label: 'Unidad',         required: false, type: 'text'   },
    precio_unitario:  { label: 'Precio (CLP)',   required: false, type: 'number' },
  },
  herramientas: {
    codigo:            { label: 'Código *',          required: true,  type: 'text' },
    descripcion:       { label: 'Descripción *',     required: true,  type: 'text' },
    marca_modelo:      { label: 'Marca / Modelo',    required: false, type: 'text' },
    estado:            { label: 'Estado',            required: false, type: 'enum' },
    responsable:       { label: 'Responsable',       required: false, type: 'text' },
    ubicacion:         { label: 'Ubicación',         required: false, type: 'text' },
    fecha_ultima_mant: { label: 'Prox. mantención',  required: false, type: 'date' },
  },
}

// ─── Auto-mapeo headers Excel → campos app ───────────────────
const ALIASES: Record<ImportType, Record<string, string>> = {
  materiales: {
    codigo: 'codigo', code: 'codigo', sku: 'codigo', cod: 'codigo', ref: 'codigo',
    descripcion: 'descripcion', description: 'descripcion', nombre: 'descripcion',
    desc: 'descripcion', material: 'descripcion', producto: 'descripcion',
    categoria: 'categoria_nombre', category: 'categoria_nombre', cat: 'categoria_nombre', tipo: 'categoria_nombre',
    proveedor: 'proveedor_nombre', provider: 'proveedor_nombre', supplier: 'proveedor_nombre',
    ubicacion: 'ubicacion', location: 'ubicacion', estante: 'ubicacion',
    stock: 'stock_actual', stock_actual: 'stock_actual', cantidad: 'stock_actual', qty: 'stock_actual',
    stock_minimo: 'stock_minimo', minimo: 'stock_minimo', min: 'stock_minimo',
    unidad: 'unidad', unit: 'unidad', um: 'unidad',
    precio: 'precio_unitario', price: 'precio_unitario', costo: 'precio_unitario',
    precio_unitario: 'precio_unitario', precio_clp: 'precio_unitario',
  },
  herramientas: {
    codigo: 'codigo', code: 'codigo', sku: 'codigo', cod: 'codigo',
    descripcion: 'descripcion', description: 'descripcion', nombre: 'descripcion',
    'marca/modelo': 'marca_modelo', marca_modelo: 'marca_modelo', marca: 'marca_modelo', modelo: 'marca_modelo',
    estado: 'estado', state: 'estado', status: 'estado',
    responsable: 'responsable', responsible: 'responsable', encargado: 'responsable',
    ubicacion: 'ubicacion', location: 'ubicacion',
    proxima_mantencion: 'fecha_ultima_mant', mantencion: 'fecha_ultima_mant',
    prox_mant: 'fecha_ultima_mant', fecha_mantencion: 'fecha_ultima_mant', fecha_ultima_mant: 'fecha_ultima_mant',
  },
}

function normHeader(h: string): string {
  return h.toLowerCase().trim().replace(/\s+/g, '_').normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function autoMap(headers: string[], type: ImportType): Record<string, string> {
  const map: Record<string, string> = {}
  const aliases = ALIASES[type]
  for (const appField of Object.keys(FIELDS[type])) {
    const hit = headers.find(h => aliases[normHeader(h)] === appField)
    if (hit) map[appField] = hit
  }
  return map
}

// ─── WizardBar ────────────────────────────────────────────────
const WIZARD_STEPS = [
  { id: 'type-select', label: 'Tipo'     },
  { id: 'upload',      label: 'Archivo'  },
  { id: 'mapping',     label: 'Columnas' },
  { id: 'review',      label: 'Revisión' },
  { id: 'done',        label: 'Resultado'},
]

function WizardBar({ step }: { step: Step }) {
  const vis = ['type-select','upload','mapping','review','done']
  const cur = vis.indexOf(step === 'analyzing' ? 'review' : step === 'importing' ? 'done' : step)
  return (
    <div className="flex items-center gap-0 mb-6 flex-wrap gap-y-2">
      {WIZARD_STEPS.map(({ id, label }, i) => (
        <div key={id} className="flex items-center">
          <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full
            ${i < cur  ? 'bg-blue-100 text-blue-700' : ''}
            ${i === cur ? 'bg-blue-700 text-white'   : ''}
            ${i > cur  ? 'bg-slate-100 text-slate-400': ''}`}>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold
              ${i < cur  ? 'bg-blue-700 text-white'  : ''}
              ${i === cur ? 'bg-white text-blue-700'  : ''}
              ${i > cur  ? 'bg-slate-300 text-white'  : ''}`}>
              {i < cur ? <Check size={8} /> : i + 1}
            </span>
            <span className="hidden sm:inline">{label}</span>
          </div>
          {i < WIZARD_STEPS.length - 1 && <div className="w-5 h-px bg-slate-200 mx-0.5" />}
        </div>
      ))}
    </div>
  )
}

// ─── Paso 1: Tipo ─────────────────────────────────────────────
function StepTypeSelect({ onSelect }: { onSelect: (t: ImportType) => void }) {
  return (
    <div className="max-w-lg">
      <h2 className="text-base font-semibold text-slate-700 mb-4">¿Qué tipo de registros vas a importar?</h2>
      <div className="grid grid-cols-2 gap-4">
        {([
          { id: 'materiales'   as ImportType, Icon: Plug,   title: 'Materiales',   desc: 'Conductores, borneras, protecciones y otros insumos' },
          { id: 'herramientas' as ImportType, Icon: Wrench, title: 'Herramientas', desc: 'Equipos y herramientas del taller' },
        ]).map(opt => (
          <button key={opt.id} onClick={() => onSelect(opt.id)}
            className="p-5 bg-white rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:shadow-md transition-all text-left group">
            <div className="mb-2 text-blue-600 group-hover:text-blue-700"><opt.Icon size={28} /></div>
            <div className="font-semibold text-slate-800 group-hover:text-blue-700">{opt.title}</div>
            <div className="text-xs text-slate-500 mt-1">{opt.desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Paso 2: Archivo ──────────────────────────────────────────
function StepUpload({ type, onFile }: { type: ImportType; onFile: (f: File) => void }) {
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const handle  = (file: File | undefined) => { if (file) onFile(file) }

  return (
    <div className="max-w-xl">
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e: DragEvent) => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files[0]) }}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
          ${dragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50/30'}`}
      >
        <div className="mb-3 text-slate-400"><Upload size={40} /></div>
        <p className="font-semibold text-slate-700 mb-1">Arrastra tu archivo aquí o haz clic</p>
        <p className="text-sm text-slate-400">Formatos: .xlsx · .xls · .csv</p>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
          onChange={(e: ChangeEvent<HTMLInputElement>) => handle(e.target.files?.[0])} />
      </div>
      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-700">
        <strong>Campos para {type === 'materiales' ? 'materiales' : 'herramientas'}:</strong>{' '}
        {type === 'materiales'
          ? 'codigo*, descripcion*, categoria, proveedor, stock, stock_minimo, unidad, precio_clp, ubicacion'
          : 'codigo*, descripcion*, marca_modelo, estado, responsable, proxima_mantencion (fecha), ubicacion'}
        <p className="mt-1 text-blue-500 text-xs">* obligatorios. Las columnas se mapean automáticamente por nombre.</p>
      </div>
    </div>
  )
}

// ─── Paso 3: Mapeo ────────────────────────────────────────────
function StepMapping({
  type, headers, mapping, setMapping, rowCount, fileName, onNext,
}: {
  type: ImportType; headers: string[]; mapping: Record<string, string>
  setMapping: (m: Record<string, string>) => void
  rowCount: number; fileName: string; onNext: () => void
}) {
  const fields      = FIELDS[type]
  const canContinue = !!mapping['codigo'] && !!mapping['descripcion']

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
        <CheckCircle size={22} style={{ color: '#059669', flexShrink: 0 }} />
        <div>
          <p className="font-medium text-green-800">{fileName}</p>
          <p className="text-sm text-green-600">{rowCount} filas · {headers.length} columnas detectadas</p>
        </div>
      </div>
      <div className="panel mb-4">
        <div className="panel-header"><h2>Mapeo de columnas</h2></div>
        <div className="p-4 space-y-2">
          {Object.entries(fields).map(([appField, def]) => (
            <div key={appField} className="flex items-center gap-3">
              <div className="w-40 text-sm font-medium text-slate-700 flex-shrink-0">
                {def.label}
                {def.type === 'enum' && <span className="ml-1 text-xs text-slate-400">(operativa…)</span>}
              </div>
              <select value={mapping[appField] ?? ''}
                onChange={e => setMapping({ ...mapping, [appField]: e.target.value })}
                className={`select flex-1 text-sm ${def.required && !mapping[appField] ? 'border-red-300 bg-red-50' : ''}`}>
                <option value="">— Sin mapear —</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
              {mapping[appField] && (
                <span className="text-xs text-green-600 flex-shrink-0 w-16 flex items-center gap-0.5">
                  <Check size={10} /> mapeado
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
      {!canContinue && <p className="text-sm text-red-600 mb-4">Los campos <strong>Código</strong> y <strong>Descripción</strong> son obligatorios.</p>}
      <button onClick={onNext} disabled={!canContinue} className="btn btn-primary">
        Analizar archivo →
      </button>
    </div>
  )
}

// ─── Paso 4: Analizando ───────────────────────────────────────
function StepAnalyzing() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin" />
      <p className="font-medium text-slate-600">Validando datos y comprobando conflictos…</p>
      <p className="text-sm text-slate-400">Consultando la base de datos</p>
    </div>
  )
}

// ─── Panel de categorías sugeridas ───────────────────────────
interface CategoryReviewProps {
  matches:     CatMatch[]
  decisions:   Record<number, string>
  setDecision: (rowIdx: number, cat: string) => void
  acceptAll:   () => void
}

function CategoryReviewPanel({ matches, decisions, setDecision, acceptAll }: CategoryReviewProps) {
  const { showToast } = useToast()
  const [aiLoading, setAiLoading] = useState(false)

  if (matches.length === 0) return null

  const altaCount     = matches.filter(m => m.confidence === 'alta').length
  const noneCount     = matches.filter(m => m.confidence === 'none').length
  const assignedCount = matches.filter(m => !!decisions[m.rowIdx]).length
  const AI_ENABLED    = process.env.NEXT_PUBLIC_AI_CLASSIFY_ENABLED === 'true'

  const handleAI = async () => {
    const unmatched = matches.filter(m => m.confidence === 'none' && !decisions[m.rowIdx])
    if (!unmatched.length) { showToast('No hay filas sin match para clasificar', 'info'); return }
    setAiLoading(true)
    try {
      const res = await fetch('/api/importar/classify', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ items: unmatched.map(m => ({ rowIdx: m.rowIdx, descripcion: m.descripcion })) }),
      })
      if (res.status === 403) { showToast('Clasificación IA no activada en esta instalación', 'error'); return }
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Error en clasificación IA')
      }
      const data: { rowIdx: number; suggested: string | null; failed?: boolean }[] = await res.json()
      let classified = 0
      let failed     = 0
      data.forEach(r => {
        if (r.failed)      { failed++;    return }
        if (r.suggested)   { setDecision(r.rowIdx, r.suggested); classified++ }
      })
      const parts: string[] = []
      if (classified > 0) parts.push(`clasificó ${classified} de ${unmatched.length}`)
      if (failed > 0)     parts.push(`${failed} sin procesar (lím. API) — revísalas manualmente`)
      if (parts.length === 0) parts.push('no pudo clasificar ningún material')
      showToast(
        `IA: ${parts.join(' · ')}`,
        classified > 0 ? 'success' : 'error',
      )
    } catch (e: any) {
      showToast('Error al clasificar con IA: ' + e.message, 'error')
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <details open className="panel" style={{ display: 'block' }}>
      <summary className="panel-header cursor-pointer list-none">
        <h2 className="flex items-center gap-1" style={{ color: '#2563EB' }}>
          <Tag size={13} /> Categorías sugeridas
          <span className="ml-1 font-normal text-slate-500">({matches.length} sin asignar en archivo)</span>
        </h2>
        <div className="flex gap-2 ml-auto flex-wrap">
          {altaCount > 0 && (
            <button onClick={acceptAll} className="btn btn-ghost btn-sm text-green-700">
              <Check size={12} /> Aceptar {altaCount} sugerencia{altaCount !== 1 ? 's' : ''} automática{altaCount !== 1 ? 's' : ''}
            </button>
          )}
          {AI_ENABLED && noneCount > 0 && (
            <button onClick={handleAI} disabled={aiLoading} className="btn btn-ghost btn-sm text-violet-700">
              {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Cpu size={12} />}
              {aiLoading ? 'Clasificando…' : `Clasificar ${noneCount} sin match con IA`}
            </button>
          )}
        </div>
      </summary>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="th w-14">Fila</th>
              <th className="th w-28">Código</th>
              <th className="th">Descripción</th>
              <th className="th w-40">Confianza / keyword</th>
              <th className="th w-56">Categoría</th>
            </tr>
          </thead>
          <tbody>
            {matches.map(m => {
              const currentVal = decisions[m.rowIdx] ?? ''
              const hasValue   = !!currentVal
              return (
                <tr key={m.rowIdx}
                  className={`tr-hover ${m.confidence === 'alta' ? 'bg-green-50/20' : 'bg-amber-50/10'}`}>
                  <td className="td text-slate-400">{m.rowNum}</td>
                  <td className="td"><span className="code">{m.codigo}</span></td>
                  <td className="td text-slate-700 max-w-xs truncate" title={m.descripcion}>{m.descripcion}</td>
                  <td className="td">
                    {m.confidence === 'alta'
                      ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">
                          Alta · <span className="italic">{m.keyword}</span>
                        </span>
                      )
                      : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                          Sin match
                        </span>
                      )
                    }
                  </td>
                  <td className="td">
                    <select
                      className={`select text-xs w-full ${!hasValue ? 'border-amber-300 bg-amber-50' : 'border-green-300 bg-green-50/40'}`}
                      value={currentVal}
                      onChange={e => setDecision(m.rowIdx, e.target.value)}
                    >
                      <option value="">— Sin categoría —</option>
                      {VALID_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="px-4 pb-3 text-xs text-slate-400 flex items-center gap-2">
        <span>{assignedCount} de {matches.length} con categoría asignada</span>
        {noneCount > 0 && !AI_ENABLED && (
          <span className="text-amber-600">
            · {noneCount} sin match por reglas — seleccionar manualmente o activar IA en .env.local
          </span>
        )}
      </div>
    </details>
  )
}

// ─── Paso 5: Revisión ─────────────────────────────────────────
interface ReviewProps {
  analysis:        AnalysisResult
  importType:      ImportType
  approvedCorrIds: Record<string, boolean>
  setApproved:     (id: string, v: boolean) => void
  approveAll:      () => void
  rejectAll:       () => void
  conflictRes:     Record<number, ConflictRes>
  setConflictRes:  (idx: number, v: ConflictRes) => void
  fileDupRes:      Record<string, FileDupRes>
  setFileDupRes:   (codigo: string, v: FileDupRes) => void
  catDecisions:    Record<number, string>
  setCatDecision:  (rowIdx: number, cat: string) => void
  acceptAllCats:   () => void
  onConfirm:       () => void
  onBack:          () => void
}

function StepReview(p: ReviewProps) {
  const { analysis } = p
  const unresolvedConflicts = analysis.dbConflicts.filter(c => !p.conflictRes[c.rowIdx] && !c.sameTable)

  const insertCount = analysis.validCount + analysis.dbConflicts.filter(c => (p.conflictRes[c.rowIdx] ?? (c.sameTable ? 'update' : 'skip')) === 'new-sku').length
  const updateCount = analysis.dbConflicts.filter(c => (p.conflictRes[c.rowIdx] ?? (c.sameTable ? 'update' : 'skip')) === 'update').length
  const skipCount   = analysis.errors.length + analysis.dbConflicts.filter(c => (p.conflictRes[c.rowIdx] ?? (c.sameTable ? 'update' : 'skip')) === 'skip').length
  const approvedCorrs = Object.values(p.approvedCorrIds).filter(Boolean).length

  return (
    <div className="max-w-4xl space-y-4">
      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total filas',  value: analysis.totalRows, color: 'slate' },
          { label: 'A insertar',   value: insertCount,        color: 'green' },
          { label: 'A actualizar', value: updateCount,        color: 'blue'  },
          { label: 'A omitir',     value: skipCount,          color: 'red'   },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-lg border p-3 text-center
            ${color === 'green' ? 'bg-green-50 border-green-200' : ''}
            ${color === 'blue'  ? 'bg-blue-50 border-blue-200'   : ''}
            ${color === 'red'   ? 'bg-red-50 border-red-200'     : ''}
            ${color === 'slate' ? 'bg-slate-50 border-slate-200' : ''}`}>
            <p className={`text-2xl font-bold
              ${color === 'green' ? 'text-green-700' : ''}
              ${color === 'blue'  ? 'text-blue-700'  : ''}
              ${color === 'red'   ? 'text-red-700'   : ''}
              ${color === 'slate' ? 'text-slate-700' : ''}`}>{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {/* ─ Errores ─ */}
      {analysis.errors.length > 0 && (
        <details open className="panel" style={{ display: 'block' }}>
          <summary className="panel-header cursor-pointer list-none">
            <h2 className="text-red-700 flex items-center gap-1">
              <X size={14} /> Errores ({analysis.errors.length}) — estas filas serán omitidas
            </h2>
          </summary>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr>
                <th className="th w-16">Fila</th>
                <th className="th w-28">Código</th>
                <th className="th w-28">Campo</th>
                <th className="th">Problema</th>
                <th className="th">Sugerencia</th>
              </tr></thead>
              <tbody>
                {analysis.errors.map((e: any, i: number) => (
                  <tr key={i} className="bg-red-50/40 tr-hover">
                    <td className="td text-slate-400">{e.rowNum}</td>
                    <td className="td"><span className="code text-red-700">{e.codigo}</span></td>
                    <td className="td text-slate-600">{e.campo}</td>
                    <td className="td font-medium text-red-800">{e.problema}</td>
                    <td className="td text-slate-500">{e.sugerencia}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {/* ─ Correcciones propuestas ─ */}
      {analysis.corrections.length > 0 && (
        <details open className="panel" style={{ display: 'block' }}>
          <summary className="panel-header cursor-pointer list-none">
            <h2 className="text-amber-700 flex items-center gap-1">
              <Wrench size={13} /> Correcciones propuestas ({analysis.corrections.length})
            </h2>
            <div className="flex gap-2 ml-auto">
              <button onClick={p.approveAll} className="btn btn-ghost btn-sm text-green-700"><Check size={12} /> Aprobar todas</button>
              <button onClick={p.rejectAll}  className="btn btn-ghost btn-sm text-red-600"><X size={12} /> Rechazar todas</button>
            </div>
          </summary>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr>
                <th className="th w-16">Fila</th>
                <th className="th w-28">Código</th>
                <th className="th w-28">Campo</th>
                <th className="th">Actual → Propuesto</th>
                <th className="th">Motivo</th>
                <th className="th w-28 text-center">Acción</th>
              </tr></thead>
              <tbody>
                {analysis.corrections.map((c: any) => {
                  const approved = p.approvedCorrIds[c.id] !== false
                  return (
                    <tr key={c.id} className={`tr-hover ${approved ? 'bg-green-50/30' : 'bg-slate-50'}`}>
                      <td className="td text-slate-400">{c.rowNum}</td>
                      <td className="td"><span className="code">{c.codigo}</span></td>
                      <td className="td text-slate-600">{c.campo}</td>
                      <td className="td">
                        <span className="line-through text-red-400 mr-1">{c.de}</span>
                        <span className="text-green-700 font-medium">→ {c.a}</span>
                      </td>
                      <td className="td text-slate-500">{c.descripcion}</td>
                      <td className="td text-center">
                        <button
                          onClick={() => p.setApproved(c.id, !approved)}
                          className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors
                            ${approved
                              ? 'bg-green-100 border-green-400 text-green-800 hover:bg-red-50 hover:border-red-300 hover:text-red-700'
                              : 'bg-slate-100 border-slate-300 text-slate-500 hover:bg-green-50 hover:border-green-400 hover:text-green-700'}`}
                        >
                          {approved
                            ? <span className="flex items-center gap-0.5"><Check size={10} /> Aprobada</span>
                            : <span className="flex items-center gap-0.5"><X size={10} /> Rechazada</span>}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {approvedCorrs > 0 && (
            <div className="px-4 pb-3 text-xs text-green-600">
              {approvedCorrs} de {analysis.corrections.length} correcciones serán aplicadas automáticamente.
            </div>
          )}
        </details>
      )}

      {/* ─ Categorías sugeridas (solo materiales) ─ */}
      {p.importType === 'materiales' && (
        <CategoryReviewPanel
          matches={analysis.categoryMatches ?? []}
          decisions={p.catDecisions}
          setDecision={p.setCatDecision}
          acceptAll={p.acceptAllCats}
        />
      )}

      {/* ─ Duplicados en archivo ─ */}
      {analysis.fileDups.length > 0 && (
        <details open className="panel" style={{ display: 'block' }}>
          <summary className="panel-header cursor-pointer list-none">
            <h2 className="text-orange-700 flex items-center gap-1">
              <AlertTriangle size={13} /> Códigos duplicados en el archivo ({analysis.fileDups.length})
            </h2>
          </summary>
          <div className="p-4 space-y-3">
            {analysis.fileDups.map((dup: any) => (
              <div key={dup.codigo} className="flex items-center gap-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <span className="code font-bold text-orange-800">{dup.codigo}</span>
                <span className="text-sm text-slate-500">aparece en filas: {dup.rowNums.join(', ')}</span>
                <div className="flex gap-2 ml-auto text-xs">
                  {([
                    { v: 'keep-first', label: 'Conservar primera' },
                    { v: 'keep-last',  label: 'Conservar última'  },
                    { v: 'skip-all',   label: 'Omitir todas'      },
                  ] as { v: FileDupRes; label: string }[]).map(opt => (
                    <label key={opt.v} className="flex items-center gap-1 cursor-pointer">
                      <input type="radio" name={`dup-${dup.codigo}`} value={opt.v}
                        checked={(p.fileDupRes[dup.codigo] ?? 'keep-first') === opt.v}
                        onChange={() => p.setFileDupRes(dup.codigo, opt.v)}
                        className="accent-blue-700" />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* ─ Conflictos SKU ─ */}
      {analysis.dbConflicts.length > 0 && (
        <details open className="panel" style={{ display: 'block' }}>
          <summary className="panel-header cursor-pointer list-none">
            <h2 className="text-yellow-700 flex items-center gap-1">
              <AlertTriangle size={13} /> Conflictos de SKU en base de datos ({analysis.dbConflicts.length})
            </h2>
          </summary>
          <div className="divide-y divide-slate-100">
            {analysis.dbConflicts.map((c: any) => {
              const res: ConflictRes = p.conflictRes[c.rowIdx] ?? (c.sameTable ? 'update' : 'skip')
              const existFields = Object.keys(c.existing).filter(k => k !== 'codigo')
              return (
                <div key={c.rowIdx} className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="code font-bold text-slate-800">{c.codigo}</span>
                    {c.sameTable
                      ? <span className="badge badge-blue text-[10px]">existe en {c.tableSource}</span>
                      : <span className="badge badge-red text-[10px]">existe en otra tabla: {c.tableSource}</span>}
                    <span className="text-xs text-slate-400">· fila {c.rowNum}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs">
                      <p className="font-bold text-yellow-800 mb-1 flex items-center gap-1"><Database size={11} /> En base de datos</p>
                      {existFields.slice(0, 5).map(k => (
                        <div key={k} className="flex gap-1 py-0.5 border-b border-yellow-100 last:border-0">
                          <span className="text-slate-400 w-24 flex-shrink-0">{k}:</span>
                          <span className="text-yellow-800 truncate">{String(c.existing[k] ?? '—')}</span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs">
                      <p className="font-bold text-blue-800 mb-1 flex items-center gap-1"><FileText size={11} /> En tu archivo</p>
                      {existFields.slice(0, 5).map(k => {
                        const incomingVal = c.incoming[k] ?? c.incoming[k.replace('_actual','').replace('_nombre','')]
                        return (
                          <div key={k} className="flex gap-1 py-0.5 border-b border-blue-100 last:border-0">
                            <span className="text-slate-400 w-24 flex-shrink-0">{k}:</span>
                            <span className={`truncate ${String(incomingVal ?? '') !== String(c.existing[k] ?? '') ? 'text-blue-700 font-medium' : 'text-slate-500'}`}>
                              {String(incomingVal ?? '—')}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div className="flex gap-4 text-sm flex-wrap">
                    {c.sameTable && (
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" name={`res-${c.rowIdx}`} value="update"
                          checked={res === 'update'} onChange={() => p.setConflictRes(c.rowIdx, 'update')}
                          className="accent-blue-700" />
                        <span className="text-blue-700 font-medium">Actualizar existente</span>
                      </label>
                    )}
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name={`res-${c.rowIdx}`} value="skip"
                        checked={res === 'skip'} onChange={() => p.setConflictRes(c.rowIdx, 'skip')}
                        className="accent-slate-500" />
                      <span className="text-slate-600">Omitir esta fila</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name={`res-${c.rowIdx}`} value="new-sku"
                        checked={res === 'new-sku'} onChange={() => p.setConflictRes(c.rowIdx, 'new-sku')}
                        className="accent-green-700" />
                      <span className="text-green-700 font-medium">
                        Asignar SKU nuevo: <code className="bg-green-100 px-1 rounded">{c.suggestedSku}</code>
                      </span>
                    </label>
                  </div>
                </div>
              )
            })}
          </div>
        </details>
      )}

      {/* ─ Botones ─ */}
      <div className="flex gap-3 items-center pt-2">
        <button onClick={p.onConfirm} disabled={insertCount + updateCount === 0} className="btn btn-primary">
          Confirmar importación ({insertCount + updateCount} registro{insertCount + updateCount !== 1 ? 's' : ''})
        </button>
        <button onClick={p.onBack} className="btn btn-outline">← Ajustar mapeo</button>
        {skipCount > 0 && (
          <span className="text-sm text-slate-400">{skipCount} fila{skipCount !== 1 ? 's' : ''} serán omitidas</span>
        )}
      </div>
    </div>
  )
}

// ─── Paso 6: Importando ───────────────────────────────────────
function StepImporting() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin" />
      <p className="font-medium text-slate-600">Escribiendo en Supabase…</p>
    </div>
  )
}

// ─── Paso 7: Resultado ────────────────────────────────────────
function StepDone({ result, onReset }: { result: ImportResult; onReset: () => void }) {
  const router = useRouter()
  const total  = result.inserted + result.updated
  return (
    <div className="max-w-lg">
      <div className={`rounded-xl p-6 mb-5 text-center border ${total > 0 ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex justify-center mb-3">
          {total > 0
            ? <CheckCircle size={48} style={{ color: '#059669' }} />
            : <AlertTriangle size={48} style={{ color: '#D97706' }} />}
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Importación completada</h2>
        <div className="flex justify-center gap-6 text-sm">
          <div><span className="text-2xl font-bold text-green-700">{result.inserted}</span><br /><span className="text-slate-500">insertados</span></div>
          <div><span className="text-2xl font-bold text-blue-700">{result.updated}</span><br /><span className="text-slate-500">actualizados</span></div>
          <div><span className="text-2xl font-bold text-slate-400">{result.skipped}</span><br /><span className="text-slate-500">omitidos</span></div>
        </div>
      </div>
      {result.errors.length > 0 && (
        <div className="panel mb-5">
          <div className="panel-header"><h2 className="text-red-700">{result.errors.length} error(es) al escribir</h2></div>
          <div className="divide-y divide-slate-100">
            {result.errors.map((e, i) => (
              <div key={i} className="px-4 py-2 flex gap-3 text-sm">
                <span className="code text-red-700 flex-shrink-0">{e.codigo}</span>
                <span className="text-slate-600">{e.error}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-3">
        <button onClick={() => router.push('/materiales')} className="btn btn-primary">Ver materiales →</button>
        <button onClick={onReset} className="btn btn-outline">Importar otro archivo</button>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────
export default function ImportarMateriales() {
  const [type, setType]         = useState<ImportType | null>(null)
  const [step, setStep]         = useState<Step>('type-select')
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders]   = useState<string[]>([])
  const [rawRows, setRawRows]   = useState<Record<string, any>[]>([])
  const [mapping, setMapping]   = useState<Record<string, string>>({})
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)

  // Decisiones del usuario — correcciones y conflictos
  const [approvedCorrIds, setApprovedCorrIds] = useState<Record<string, boolean>>({})
  const [conflictRes, setConflictResState]    = useState<Record<number, ConflictRes>>({})
  const [fileDupRes, setFileDupResState]      = useState<Record<string, FileDupRes>>({})

  // Decisiones de categorías (rowIdx → categoria elegida)
  const [catDecisions, setCatDecisionsState]  = useState<Record<number, string>>({})

  const [result, setResult] = useState<ImportResult | null>(null)
  const { showToast }       = useToast()

  const handleSelectType = (t: ImportType) => { setType(t); setStep('upload') }

  // Parsear archivo con SheetJS
  const handleFile = useCallback(async (file: File) => {
    try {
      const XLSX = await import('xlsx')
      const data = await file.arrayBuffer()
      const wb   = XLSX.read(data, { type: 'array' })
      const ws   = wb.Sheets[wb.SheetNames[0]]
      const raw  = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: null })
      if (raw.length < 2) { showToast('El archivo no tiene filas de datos.', 'error'); return }

      const hdrs = (raw[0] as any[]).map(h => h != null ? String(h).trim() : '').filter(Boolean)
      const rows = raw.slice(1)
        .map(row => {
          const obj: Record<string, any> = {}
          hdrs.forEach((h, i) => { obj[h] = (row as any[])[i] ?? null })
          return obj
        })
        .filter(row => Object.values(row).some(v => v != null && v !== ''))

      if (!rows.length) { showToast('No se encontraron filas con datos.', 'error'); return }
      setFileName(file.name)
      setHeaders(hdrs)
      setRawRows(rows)
      setMapping(autoMap(hdrs, type!))
      setStep('mapping')
    } catch (e: any) {
      showToast('Error al leer el archivo: ' + (e.message ?? ''), 'error')
    }
  }, [type, showToast])

  // Mapeo → enviar al analyze endpoint
  const handleAnalyze = useCallback(async () => {
    setStep('analyzing')
    const mappedRows = rawRows.map((raw, idx) => {
      const r: Record<string, any> = { _origIdx: idx }
      for (const [appField, colName] of Object.entries(mapping)) {
        if (!colName) continue
        r[appField] = raw[colName] != null ? raw[colName] : null
      }
      return r
    })

    try {
      const res = await fetch('/api/importar/analyze', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type, rows: mappedRows }),
      })
      const data: AnalysisResult = await res.json()
      if (!res.ok) throw new Error((data as any).error ?? 'Error en análisis')

      // Init correcciones (todas aprobadas por defecto)
      const initApproved: Record<string, boolean> = {}
      data.corrections.forEach((c: any) => { initApproved[c.id] = true })
      setApprovedCorrIds(initApproved)

      // Init conflictos
      const initConflicts: Record<number, ConflictRes> = {}
      data.dbConflicts.forEach((c: any) => { initConflicts[c.rowIdx] = c.sameTable ? 'update' : 'skip' })
      setConflictResState(initConflicts)
      setFileDupResState({})

      // Init categorías — pre-rellenar sugerencias 'alta' automáticamente
      const initCats: Record<number, string> = {}
      ;(data.categoryMatches ?? []).forEach((m: CatMatch) => {
        initCats[m.rowIdx] = m.confidence === 'alta' && m.suggested ? m.suggested : ''
      })
      setCatDecisionsState(initCats)

      setAnalysis(data)
      setStep('review')
    } catch (e: any) {
      showToast(e.message, 'error')
      setStep('mapping')
    }
  }, [rawRows, mapping, type, showToast])

  // Construir acciones y ejecutar importación
  const handleConfirm = useCallback(async () => {
    if (!analysis) return
    setStep('importing')

    const errorIdxs: Record<number, true> = {}
    analysis.errors.forEach((e: any) => { errorIdxs[e.rowIdx] = true })

    const fileDupSkip: Record<number, true> = {}
    analysis.fileDups.forEach((dup: any) => {
      const res: FileDupRes = fileDupRes[dup.codigo] ?? 'keep-first'
      if (res === 'keep-first')  dup.rowIdxs.slice(1).forEach((i: number) => { fileDupSkip[i] = true })
      else if (res === 'keep-last') dup.rowIdxs.slice(0, -1).forEach((i: number) => { fileDupSkip[i] = true })
      else                          dup.rowIdxs.forEach((i: number) => { fileDupSkip[i] = true })
    })

    const conflictIdxMap: Record<number, any> = {}
    analysis.dbConflicts.forEach((c: any) => { conflictIdxMap[c.rowIdx] = c })

    // Reconstruir filas con correcciones aprobadas + decisiones de categoría
    const mappedRows = rawRows.map((raw, idx) => {
      const r: Record<string, any> = {}
      for (const [appField, colName] of Object.entries(mapping)) {
        if (!colName) continue
        r[appField] = raw[colName] != null ? raw[colName] : null
      }
      // Aplicar correcciones aprobadas
      analysis.corrections
        .filter((c: any) => c.rowIdx === idx && approvedCorrIds[c.id] !== false)
        .forEach((c: any) => { r[c.campo] = c.a })
      // Inyectar decisión de categoría (solo para filas que pasaron por el clasificador)
      if (type === 'materiales' && idx in catDecisions) {
        r.categoria_nombre = catDecisions[idx] || null
      }
      return r
    })

    const actions: { rowIdx: number; action: 'insert' | 'update' | 'skip'; data: Record<string, any> }[] = []
    let skipped = 0

    for (let i = 0; i < mappedRows.length; i++) {
      if (errorIdxs[i] || fileDupSkip[i]) { skipped++; continue }
      const data     = mappedRows[i]
      const conflict = conflictIdxMap[i]

      if (conflict) {
        const res: ConflictRes = conflictRes[i] ?? (conflict.sameTable ? 'update' : 'skip')
        if (res === 'skip')    { skipped++; continue }
        if (res === 'new-sku') { actions.push({ rowIdx: i, action: 'insert', data: { ...data, codigo: conflict.suggestedSku } }); continue }
        if (res === 'update')  { actions.push({ rowIdx: i, action: 'update', data }); continue }
      }
      actions.push({ rowIdx: i, action: 'insert', data })
    }

    try {
      const res = await fetch('/api/importar/execute', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type, actions, skipped }),
      })
      const data: ImportResult = await res.json()
      if (!res.ok) throw new Error((data as any).error ?? 'Error al importar')
      setResult(data)
      setStep('done')
    } catch (e: any) {
      showToast(e.message, 'error')
      setStep('review')
    }
  }, [analysis, rawRows, mapping, approvedCorrIds, conflictRes, fileDupRes, catDecisions, type, showToast])

  const reset = useCallback(() => {
    setType(null); setStep('type-select'); setFileName(''); setHeaders([])
    setRawRows([]); setMapping({}); setAnalysis(null)
    setApprovedCorrIds({}); setConflictResState({}); setFileDupResState({})
    setCatDecisionsState({}); setResult(null)
  }, [])

  const canGoBack = !['type-select', 'analyzing', 'importing', 'done'].includes(step)

  return (
    <div className="p-5 max-w-5xl">
      <div className="flex items-center gap-3 mb-5">
        <div>
          <h1 className="text-lg font-bold text-slate-800">
            Importar {type === 'materiales' ? 'materiales' : type === 'herramientas' ? 'herramientas' : 'inventario'}
          </h1>
          <p className="text-sm text-slate-500">Excel o CSV · validación completa antes de escribir</p>
        </div>
        {canGoBack && <button onClick={reset} className="btn btn-ghost btn-sm ml-auto">× Cancelar</button>}
      </div>

      <WizardBar step={step} />

      {step === 'type-select' && <StepTypeSelect onSelect={handleSelectType} />}
      {step === 'upload'      && type && <StepUpload type={type} onFile={handleFile} />}
      {step === 'mapping'     && type && (
        <StepMapping
          type={type} headers={headers} mapping={mapping} setMapping={setMapping}
          rowCount={rawRows.length} fileName={fileName} onNext={handleAnalyze}
        />
      )}
      {step === 'analyzing' && <StepAnalyzing />}
      {step === 'review'    && analysis && (
        <StepReview
          analysis={analysis}
          importType={type!}
          approvedCorrIds={approvedCorrIds}
          setApproved={(id, v) => setApprovedCorrIds(p => ({ ...p, [id]: v }))}
          approveAll={() => {
            const all: Record<string, boolean> = {}
            analysis.corrections.forEach((c: any) => { all[c.id] = true })
            setApprovedCorrIds(all)
          }}
          rejectAll={() => {
            const all: Record<string, boolean> = {}
            analysis.corrections.forEach((c: any) => { all[c.id] = false })
            setApprovedCorrIds(all)
          }}
          conflictRes={conflictRes}
          setConflictRes={(idx, v) => setConflictResState(p => ({ ...p, [idx]: v }))}
          fileDupRes={fileDupRes}
          setFileDupRes={(codigo, v) => setFileDupResState(p => ({ ...p, [codigo]: v }))}
          catDecisions={catDecisions}
          setCatDecision={(rowIdx, cat) => setCatDecisionsState(p => ({ ...p, [rowIdx]: cat }))}
          acceptAllCats={() => {
            const updates: Record<number, string> = {}
            ;(analysis.categoryMatches ?? []).forEach((m: CatMatch) => {
              if (m.confidence === 'alta' && m.suggested) updates[m.rowIdx] = m.suggested
            })
            setCatDecisionsState(p => ({ ...p, ...updates }))
          }}
          onConfirm={handleConfirm}
          onBack={() => setStep('mapping')}
        />
      )}
      {step === 'importing' && <StepImporting />}
      {step === 'done'      && result && <StepDone result={result} onReset={reset} />}
    </div>
  )
}
