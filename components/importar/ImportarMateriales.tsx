'use client'
import { useState, useRef, useCallback, DragEvent, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/contexts/ToastContext'
import { num, clp } from '@/lib/utils'

// ─── Definición de campos de la app ──────────────────────────
interface AppField { label: string; required: boolean; type: 'text' | 'number' }

const APP_FIELDS: Record<string, AppField> = {
  codigo:           { label: 'Código',        required: true,  type: 'text'   },
  descripcion:      { label: 'Descripción',   required: true,  type: 'text'   },
  categoria_nombre: { label: 'Categoría',     required: false, type: 'text'   },
  unidad:           { label: 'Unidad',        required: false, type: 'text'   },
  stock_actual:     { label: 'Stock actual',  required: false, type: 'number' },
  stock_minimo:     { label: 'Stock mínimo',  required: false, type: 'number' },
  precio_unitario:  { label: 'Precio (CLP)',  required: false, type: 'number' },
  ubicacion:        { label: 'Ubicación',     required: false, type: 'text'   },
  notas:            { label: 'Notas',         required: false, type: 'text'   },
}

// Alias para auto-mapeo de headers del archivo
const ALIASES: Record<string, string> = {
  codigo: 'codigo', code: 'codigo', cod: 'codigo', sku: 'codigo', ref: 'codigo',
  descripcion: 'descripcion', description: 'descripcion', desc: 'descripcion',
  nombre: 'descripcion', name: 'descripcion', material: 'descripcion', producto: 'descripcion',
  categoria: 'categoria_nombre', category: 'categoria_nombre', cat: 'categoria_nombre', tipo: 'categoria_nombre',
  unidad: 'unidad', unit: 'unidad', um: 'unidad', uom: 'unidad',
  stock: 'stock_actual', stock_actual: 'stock_actual', cantidad: 'stock_actual',
  qty: 'stock_actual', quantity: 'stock_actual', existencia: 'stock_actual',
  stock_minimo: 'stock_minimo', minimo: 'stock_minimo', min: 'stock_minimo',
  stock_min: 'stock_minimo', minimum: 'stock_minimo', min_stock: 'stock_minimo',
  precio: 'precio_unitario', precio_unitario: 'precio_unitario', price: 'precio_unitario',
  costo: 'precio_unitario', cost: 'precio_unitario', valor: 'precio_unitario',
  ubicacion: 'ubicacion', location: 'ubicacion', estante: 'ubicacion',
  bodega: 'ubicacion', lugar: 'ubicacion', rack: 'ubicacion',
  notas: 'notas', notes: 'notas', observaciones: 'notas', obs: 'notas', comentario: 'notas',
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().trim()
    .replace(/[\s-]+/g, '_')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function autoMap(headers: string[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (const appField of Object.keys(APP_FIELDS)) {
    const match = headers.find(h => ALIASES[normalizeHeader(h)] === appField)
    if (match) result[appField] = match
  }
  return result
}

// ─── Tipos ───────────────────────────────────────────────────
type Step = 'upload' | 'mapping' | 'preview' | 'importing' | 'done'

interface PreviewRow {
  _idx:             number
  _status:          'new' | 'update' | 'error'
  _errors:          string[]
  codigo:           string
  descripcion:      string
  categoria_nombre: string
  unidad:           string
  stock_actual:     number | null
  stock_minimo:     number | null
  precio_unitario:  number | null
  ubicacion:        string
  notas:            string
}

interface ImportResult {
  added:   number
  updated: number
  errors:  { codigo: string; error: string }[]
}

// ─── Indicador de pasos ───────────────────────────────────────
const STEPS: { id: Step; label: string }[] = [
  { id: 'upload',    label: 'Subir archivo' },
  { id: 'mapping',   label: 'Mapear columnas' },
  { id: 'preview',   label: 'Vista previa' },
  { id: 'importing', label: 'Importar' },
  { id: 'done',      label: 'Resultado' },
]

function Pasos({ step }: { step: Step }) {
  const idx = STEPS.findIndex(s => s.id === step)
  return (
    <div className="flex items-center gap-0 mb-6">
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center">
          <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full transition-colors
            ${i < idx  ? 'bg-blue-100 text-blue-700' : ''}
            ${i === idx ? 'bg-blue-700 text-white'    : ''}
            ${i > idx  ? 'bg-slate-100 text-slate-400' : ''}`}>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold
              ${i < idx  ? 'bg-blue-700 text-white'  : ''}
              ${i === idx ? 'bg-white text-blue-700'  : ''}
              ${i > idx  ? 'bg-slate-300 text-white'  : ''}`}>
              {i < idx ? '✓' : i + 1}
            </span>
            <span className="hidden sm:inline">{s.label}</span>
          </div>
          {i < STEPS.length - 1 && <div className="w-6 h-px bg-slate-200 mx-0.5" />}
        </div>
      ))}
    </div>
  )
}

// ─── Paso 1: Zona de carga ────────────────────────────────────
function UploadZone({ onFile }: { onFile: (f: File) => void }) {
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFile(file)
  }

  return (
    <div className="max-w-xl">
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
          ${dragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50/30'}`}
      >
        <div className="text-4xl mb-3">📂</div>
        <p className="font-semibold text-slate-700 mb-1">Arrastra tu archivo aquí o haz clic para elegirlo</p>
        <p className="text-sm text-slate-400">Formatos aceptados: .xlsx, .xls, .csv</p>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={handleChange}
        />
      </div>

      <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-600">
        <p className="font-medium text-slate-700 mb-2">Columnas reconocidas automáticamente:</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <span><span className="code">codigo</span> / sku / ref</span>
          <span><span className="code">descripcion</span> / nombre</span>
          <span><span className="code">categoria</span> / tipo</span>
          <span><span className="code">unidad</span> / um</span>
          <span><span className="code">stock</span> / cantidad</span>
          <span><span className="code">stock_minimo</span> / minimo</span>
          <span><span className="code">precio</span> / costo / valor</span>
          <span><span className="code">ubicacion</span> / estante</span>
        </div>
      </div>
    </div>
  )
}

// ─── Paso 2: Mapeo de columnas ────────────────────────────────
function MappingUI({
  headers, mapping, setMapping, onNext, rowCount, fileName,
}: {
  headers: string[]
  mapping: Record<string, string>
  setMapping: (m: Record<string, string>) => void
  onNext: () => void
  rowCount: number
  fileName: string
}) {
  const canContinue =
    !!mapping['codigo'] && !!mapping['descripcion']

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
        <span className="text-2xl">✅</span>
        <div>
          <p className="font-medium text-green-800">{fileName}</p>
          <p className="text-sm text-green-600">{rowCount} filas de datos encontradas</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Mapeo de columnas</h2>
          <span className="text-xs text-slate-500">
            Asigna qué columna de tu archivo corresponde a cada campo
          </span>
        </div>
        <div className="p-4 space-y-2">
          {Object.entries(APP_FIELDS).map(([appField, def]) => (
            <div key={appField} className="flex items-center gap-3">
              <div className="w-36 text-sm font-medium text-slate-700 flex-shrink-0">
                {def.label}
                {def.required && <span className="text-red-500 ml-0.5">*</span>}
              </div>
              <select
                value={mapping[appField] ?? ''}
                onChange={e => setMapping({ ...mapping, [appField]: e.target.value })}
                className={`select flex-1 text-sm ${def.required && !mapping[appField] ? 'border-red-300 bg-red-50' : ''}`}
              >
                <option value="">— Sin mapear —</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
              {mapping[appField] && (
                <span className="text-xs text-green-600 flex-shrink-0">✓ detectado</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {!canContinue && (
        <p className="mt-3 text-sm text-red-600">
          Los campos <strong>Código</strong> y <strong>Descripción</strong> son obligatorios.
        </p>
      )}

      <div className="flex gap-3 mt-4">
        <button
          onClick={onNext}
          disabled={!canContinue}
          className="btn btn-primary"
        >
          Ver vista previa →
        </button>
      </div>
    </div>
  )
}

// ─── Paso 3: Vista previa ─────────────────────────────────────
function PreviewUI({
  preview, updateStock, setUpdateStock, onImport, onBack,
}: {
  preview: PreviewRow[]
  updateStock: boolean
  setUpdateStock: (v: boolean) => void
  onImport: () => void
  onBack: () => void
}) {
  const newCount    = preview.filter(r => r._status === 'new').length
  const updateCount = preview.filter(r => r._status === 'update').length
  const errorCount  = preview.filter(r => r._status === 'error').length

  return (
    <div>
      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3 mb-4 max-w-lg">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{newCount}</p>
          <p className="text-xs text-green-600">Materiales nuevos</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-blue-700">{updateCount}</p>
          <p className="text-xs text-blue-600">A actualizar</p>
        </div>
        <div className={`rounded-lg p-3 text-center border ${errorCount > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
          <p className={`text-2xl font-bold ${errorCount > 0 ? 'text-red-700' : 'text-slate-400'}`}>{errorCount}</p>
          <p className="text-xs text-slate-500">Con errores</p>
        </div>
      </div>

      {/* Opción stock */}
      {updateCount > 0 && (
        <label className="flex items-center gap-2 mb-4 text-sm text-slate-700 cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={updateStock}
            onChange={e => setUpdateStock(e.target.checked)}
            className="accent-blue-700 w-4 h-4"
          />
          <span>
            Actualizar <strong>stock actual</strong> en materiales existentes
            <span className="text-slate-400 ml-1">(por defecto se mantiene el stock del sistema)</span>
          </span>
        </label>
      )}

      {/* Tabla de preview */}
      <div className="panel mb-4">
        <div className="panel-header">
          <h2>Vista previa — {preview.length} filas</h2>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white z-10">
              <tr>
                <th className="th">#</th>
                <th className="th">Estado</th>
                <th className="th">Código</th>
                <th className="th">Descripción</th>
                <th className="th">Categoría</th>
                <th className="th">Unidad</th>
                <th className="th td-r">Stock</th>
                <th className="th td-r">Stock mín.</th>
                <th className="th td-r">Precio</th>
                <th className="th">Ubicación</th>
              </tr>
            </thead>
            <tbody>
              {preview.map(r => (
                <tr key={r._idx}
                  className={`border-l-2 transition-colors
                    ${r._status === 'new'    ? 'border-l-green-400 bg-green-50/40 hover:bg-green-50' : ''}
                    ${r._status === 'update' ? 'border-l-blue-400 bg-blue-50/40 hover:bg-blue-50'   : ''}
                    ${r._status === 'error'  ? 'border-l-red-400 bg-red-50/40 hover:bg-red-50'      : ''}`}
                >
                  <td className="td text-slate-400">{r._idx}</td>
                  <td className="td">
                    {r._status === 'new'    && <span className="badge badge-green text-[10px]">NUEVO</span>}
                    {r._status === 'update' && <span className="badge badge-blue text-[10px]">ACTUALIZAR</span>}
                    {r._status === 'error'  && (
                      <span className="badge badge-red text-[10px]" title={r._errors.join(', ')}>ERROR</span>
                    )}
                  </td>
                  <td className="td"><span className="code">{r.codigo || '—'}</span></td>
                  <td className="td max-w-[200px] truncate" title={r.descripcion}>{r.descripcion || '—'}</td>
                  <td className="td text-slate-500">{r.categoria_nombre || '—'}</td>
                  <td className="td text-slate-500">{r.unidad || '—'}</td>
                  <td className="td-r">{r.stock_actual != null ? num(r.stock_actual) : '—'}</td>
                  <td className="td-r text-slate-500">{r.stock_minimo != null ? num(r.stock_minimo) : '—'}</td>
                  <td className="td-r text-slate-500">{r.precio_unitario != null ? clp(r.precio_unitario) : '—'}</td>
                  <td className="td text-slate-500 text-[11px]">{r.ubicacion || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {errorCount > 0 && (
        <div className="alert alert-yellow mb-4">
          <strong>{errorCount} fila(s) con errores</strong> no se importarán.
          Corrígelas en el archivo y vuelve a intentarlo si las necesitas.
        </div>
      )}

      {newCount + updateCount === 0 ? (
        <div className="alert alert-red mb-4">
          No hay filas válidas para importar. Revisa el mapeo de columnas.
        </div>
      ) : (
        <div className="flex gap-3">
          <button onClick={onImport} className="btn btn-primary">
            Confirmar importación ({newCount + updateCount} filas)
          </button>
          <button onClick={onBack} className="btn btn-outline">← Ajustar mapeo</button>
        </div>
      )}
    </div>
  )
}

// ─── Paso 4: Importando ───────────────────────────────────────
function ImportingUI() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin" />
      <p className="text-slate-600 font-medium">Importando materiales en Supabase…</p>
      <p className="text-sm text-slate-400">Esto puede tardar unos segundos</p>
    </div>
  )
}

// ─── Paso 5: Resultado ────────────────────────────────────────
function ResultsUI({ result, onReset }: { result: ImportResult; onReset: () => void }) {
  const router = useRouter()
  const total = result.added + result.updated

  return (
    <div className="max-w-lg">
      <div className={`rounded-xl p-6 mb-5 text-center border ${total > 0 ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
        <div className="text-5xl mb-3">{total > 0 ? '✅' : '⚠️'}</div>
        <h2 className="text-xl font-bold text-slate-800 mb-1">Importación completada</h2>
        {total > 0 && (
          <p className="text-slate-600">
            <span className="font-bold text-green-700">{result.added} materiales agregados</span>
            {result.updated > 0 && (
              <> · <span className="font-bold text-blue-700">{result.updated} actualizados</span></>
            )}
          </p>
        )}
        {total === 0 && (
          <p className="text-slate-500">No se importaron materiales.</p>
        )}
      </div>

      {result.errors.length > 0 && (
        <div className="panel mb-5">
          <div className="panel-header">
            <h2 className="text-red-700">
              {result.errors.length} error(es) durante la importación
            </h2>
          </div>
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
        <button onClick={() => router.push('/materiales')} className="btn btn-primary">
          Ver materiales →
        </button>
        <button onClick={onReset} className="btn btn-outline">
          Importar otro archivo
        </button>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────
export default function ImportarMateriales() {
  const [step, setStep]             = useState<Step>('upload')
  const [fileName, setFileName]     = useState('')
  const [headers, setHeaders]       = useState<string[]>([])
  const [rawRows, setRawRows]       = useState<Record<string, any>[]>([])
  const [mapping, setMapping]       = useState<Record<string, string>>({})
  const [preview, setPreview]       = useState<PreviewRow[]>([])
  const [updateStock, setUpdateStock] = useState(false)
  const [result, setResult]         = useState<ImportResult | null>(null)
  const { showToast } = useToast()
  const router = useRouter()

  // Parsear archivo con SheetJS (carga dinámica para no aumentar bundle inicial)
  const handleFile = useCallback(async (file: File) => {
    try {
      const XLSX = await import('xlsx')
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]

      // header: 1 → primera fila como array de strings
      const rawData = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: null })
      if (rawData.length < 2) {
        showToast('El archivo está vacío o no tiene filas de datos.', 'error')
        return
      }

      const rawHeaders = (rawData[0] as any[]).map(h =>
        h != null ? String(h).trim() : ''
      ).filter(Boolean)

      const dataRows = rawData.slice(1)
        .map(row => {
          const obj: Record<string, any> = {}
          rawHeaders.forEach((h, i) => { obj[h] = (row as any[])[i] ?? null })
          return obj
        })
        .filter(row => Object.values(row).some(v => v != null && v !== ''))

      if (dataRows.length === 0) {
        showToast('No se encontraron filas con datos en el archivo.', 'error')
        return
      }

      setFileName(file.name)
      setHeaders(rawHeaders)
      setRawRows(dataRows)
      setMapping(autoMap(rawHeaders))
      setStep('mapping')
    } catch (err: any) {
      showToast('Error al leer el archivo: ' + (err.message ?? 'Error desconocido'), 'error')
    }
  }, [showToast])

  // Aplicar mapeo a filas crudas y verificar cuáles ya existen en la DB
  const buildPreview = useCallback(async () => {
    const mapped: PreviewRow[] = rawRows.map((raw, idx) => {
      const row: any = {
        _idx: idx + 2, // +2 porque fila 1 = headers
        _status: 'new',
        _errors: [],
        codigo: '', descripcion: '', categoria_nombre: '',
        unidad: '', stock_actual: null, stock_minimo: null,
        precio_unitario: null, ubicacion: '', notas: '',
      }

      for (const [appField, excelCol] of Object.entries(mapping)) {
        if (!excelCol) continue
        const val = raw[excelCol]
        if (val == null || val === '') continue
        if (APP_FIELDS[appField]?.type === 'number') {
          const n = Number(String(val).replace(',', '.'))
          row[appField] = isNaN(n) ? null : n
        } else {
          row[appField] = String(val).trim()
        }
      }

      if (!row.codigo)      row._errors.push('Código requerido')
      if (!row.descripcion) row._errors.push('Descripción requerida')
      if (row._errors.length) row._status = 'error'

      return row as PreviewRow
    })

    // Consultar cuáles códigos ya existen
    const validCodigos = mapped.filter(r => r.codigo).map(r => r.codigo)
    if (validCodigos.length > 0) {
      try {
        const res = await fetch('/api/materiales/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ codigos: validCodigos }),
        })
        const { existing } = await res.json() as { existing: string[] }
        const existingSet = new Set<string>(existing)
        mapped.forEach(r => {
          if (r._status !== 'error' && r.codigo && existingSet.has(r.codigo)) {
            r._status = 'update'
          }
        })
      } catch {
        // Si falla el check, igual mostramos preview sin distinción new/update
      }
    }

    setPreview(mapped)
    setStep('preview')
  }, [rawRows, mapping])

  // Enviar al API de upsert
  const runImport = useCallback(async () => {
    setStep('importing')
    const validRows = preview.filter(r => r._status !== 'error')

    try {
      const res = await fetch('/api/materiales/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: validRows, updateStock }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error en el servidor')
      setResult(data as ImportResult)
      setStep('done')
      router.refresh()
    } catch (e: any) {
      showToast(e.message, 'error')
      setStep('preview')
    }
  }, [preview, updateStock, router, showToast])

  const reset = useCallback(() => {
    setStep('upload')
    setFileName('')
    setHeaders([])
    setRawRows([])
    setMapping({})
    setPreview([])
    setResult(null)
    setUpdateStock(false)
  }, [])

  return (
    <div className="p-5 max-w-5xl">
      <div className="flex items-center gap-3 mb-5">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Importar materiales</h1>
          <p className="text-sm text-slate-500">Carga un Excel o CSV para agregar o actualizar materiales en lote</p>
        </div>
        {step !== 'upload' && step !== 'done' && (
          <button onClick={reset} className="btn btn-ghost btn-sm ml-auto">× Cancelar</button>
        )}
      </div>

      <Pasos step={step} />

      {step === 'upload'    && <UploadZone onFile={handleFile} />}
      {step === 'mapping'   && (
        <MappingUI
          headers={headers}
          mapping={mapping}
          setMapping={setMapping}
          onNext={buildPreview}
          rowCount={rawRows.length}
          fileName={fileName}
        />
      )}
      {step === 'preview'   && (
        <PreviewUI
          preview={preview}
          updateStock={updateStock}
          setUpdateStock={setUpdateStock}
          onImport={runImport}
          onBack={() => setStep('mapping')}
        />
      )}
      {step === 'importing' && <ImportingUI />}
      {step === 'done'      && result && <ResultsUI result={result} onReset={reset} />}
    </div>
  )
}
