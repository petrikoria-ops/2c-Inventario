import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { classifyByRules } from '@/lib/importar/categorias-map'

export const dynamic = 'force-dynamic'

// ─── Constantes ───────────────────────────────────────────────
const ESTADOS_HER = ['operativa', 'en_reparacion', 'extraviada', 'dada_de_baja'] as const

const ESTADO_ALIASES: Record<string, string> = {
  ok: 'operativa', buena: 'operativa', bien: 'operativa', funciona: 'operativa', bueno: 'operativa',
  reparacion: 'en_reparacion', reparando: 'en_reparacion', 'en reparacion': 'en_reparacion',
  'en reparación': 'en_reparacion',
  perdida: 'extraviada', perdido: 'extraviada', falta: 'extraviada', perdido2: 'extraviada',
  baja: 'dada_de_baja', 'dada de baja': 'dada_de_baja',
}

const CAT_PREFIXES: Record<string, string> = {
  conductores: 'CON', cables: 'CON', cable: 'CON',
  borneras: 'BOR', bornera: 'BOR',
  protecciones: 'PRO', proteccion: 'PRO', 'protección': 'PRO',
  tuberias: 'TUB', tuberia: 'TUB', 'tubería': 'TUB',
  cajas: 'CAJ', caja: 'CAJ',
  rieles: 'RIE', riel: 'RIE',
  interruptores: 'INT', interruptor: 'INT',
  terminales: 'TER', terminal: 'TER',
  sensores: 'SEN', sensor: 'SEN',
  contactores: 'CTR', contactor: 'CTR',
}

// ─── Utilidades ──────────────────────────────────────────────
function nfd(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function prefixForCat(catNombre: string | null | undefined): string {
  if (!catNombre) return 'MAT'
  const first = nfd(catNombre.toLowerCase()).split(/[\s-]/)[0]
  return CAT_PREFIXES[first] ?? 'MAT'
}

function parseDate(raw: string): string | null {
  if (!raw) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const m = raw.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return null
}

function parseNum(raw: string): number | null {
  const cleaned = raw.replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

function normalizeEstado(raw: string): string | null {
  const key = nfd(raw.toLowerCase().trim())
  if ((ESTADOS_HER as readonly string[]).includes(key)) return key
  return ESTADO_ALIASES[key] ?? null
}

// Genera el siguiente SKU disponible para un prefijo (busca en ambas tablas)
async function nextSku(prefix: string, sb: ReturnType<typeof getSupabaseServer>): Promise<string> {
  const pattern = `${prefix}-%`
  const [rm, rh] = await Promise.all([
    sb.from('materiales').select('codigo').like('codigo', pattern),
    sb.from('herramientas').select('codigo').like('codigo', pattern),
  ])
  const re = new RegExp(`^${prefix}-(\\d+)$`, 'i')
  let max = 0
  const allCodes = [
    ...((rm.data ?? []) as any[]).map((r) => r.codigo as string),
    ...((rh.data ?? []) as any[]).map((r) => r.codigo as string),
  ]
  for (const c of allCodes) {
    const m = c.match(re)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return `${prefix}-${String(max + 1).padStart(3, '0')}`
}

// ─── Endpoint ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { type, rows } = (await req.json()) as {
    type: 'materiales' | 'herramientas'
    rows: Record<string, any>[]
  }

  const sb = getSupabaseServer()
  const errors:      any[] = []
  const corrections: any[] = []
  let corrId = 0

  // ── 1. Validación y propuestas de corrección por fila ─────
  const processed = rows.map((row, idx) => {
    const r: Record<string, any> = { ...row, _idx: idx, _rowNum: idx + 2, _hasError: false }

    // Normalizar codigo: trim + UPPERCASE
    const rawCod = r.codigo != null ? String(r.codigo).trim() : ''
    if (rawCod) {
      const fixed = rawCod.toUpperCase().replace(/\s+/g, '-')
      if (fixed !== rawCod) {
        corrections.push({
          id: `c${++corrId}`, rowIdx: idx, rowNum: idx + 2,
          campo: 'codigo', de: rawCod, a: fixed,
          descripcion: 'Código normalizado: mayúsculas y sin espacios',
        })
      }
      r.codigo = fixed
    }

    // Trimear descripcion
    if (r.descripcion) {
      const trim = String(r.descripcion).trim()
      if (trim !== r.descripcion) {
        corrections.push({
          id: `c${++corrId}`, rowIdx: idx, rowNum: idx + 2,
          campo: 'descripcion', de: r.descripcion, a: trim,
          descripcion: 'Eliminar espacios al inicio/fin de descripción',
        })
        r.descripcion = trim
      }
    }

    // Validar campos obligatorios
    if (!r.codigo) {
      errors.push({ rowIdx: idx, rowNum: idx + 2, codigo: '—', campo: 'codigo', problema: 'Campo obligatorio vacío', sugerencia: 'Agregar código o asignar SKU automático al resolver conflicto' })
      r._hasError = true
    }
    if (!r.descripcion || !String(r.descripcion).trim()) {
      errors.push({ rowIdx: idx, rowNum: idx + 2, codigo: r.codigo || '—', campo: 'descripcion', problema: 'Campo obligatorio vacío', sugerencia: 'Completar descripción antes de importar' })
      r._hasError = true
    }

    // Validaciones específicas por tipo
    if (type === 'materiales') {
      // stock_actual
      const rawSt = r.stock_actual != null ? String(r.stock_actual).trim() : ''
      if (rawSt && rawSt !== '0') {
        const fixed = rawSt.replace(',', '.')
        const n = parseNum(fixed)
        if (n === null) {
          errors.push({ rowIdx: idx, rowNum: idx + 2, codigo: r.codigo || '—', campo: 'stock_actual', problema: `Valor no numérico: "${rawSt}"`, sugerencia: 'Corregir o dejar vacío (usará 0)' })
          r._hasError = true
        } else if (n < 0) {
          errors.push({ rowIdx: idx, rowNum: idx + 2, codigo: r.codigo || '—', campo: 'stock_actual', problema: `Stock negativo: ${n}`, sugerencia: 'Usar 0 o valor positivo' })
          r._hasError = true
        } else if (fixed !== rawSt) {
          corrections.push({ id: `c${++corrId}`, rowIdx: idx, rowNum: idx + 2, campo: 'stock_actual', de: rawSt, a: fixed, descripcion: 'Convertir coma decimal a punto' })
          r.stock_actual = n
        }
      }
      // precio_unitario
      const rawPr = r.precio_unitario != null ? String(r.precio_unitario).trim() : ''
      if (rawPr) {
        const fixed = rawPr.replace(',', '.')
        const n = parseNum(fixed)
        if (n === null) {
          errors.push({ rowIdx: idx, rowNum: idx + 2, codigo: r.codigo || '—', campo: 'precio_unitario', problema: `Valor no numérico: "${rawPr}"`, sugerencia: 'Corregir o dejar vacío' })
          r._hasError = true
        } else if (n < 0) {
          errors.push({ rowIdx: idx, rowNum: idx + 2, codigo: r.codigo || '—', campo: 'precio_unitario', problema: `Precio negativo: ${n}`, sugerencia: 'Usar valor ≥ 0' })
          r._hasError = true
        } else if (fixed !== rawPr) {
          corrections.push({ id: `c${++corrId}`, rowIdx: idx, rowNum: idx + 2, campo: 'precio_unitario', de: rawPr, a: fixed, descripcion: 'Convertir coma decimal a punto' })
          r.precio_unitario = n
        }
      }
    }

    if (type === 'herramientas') {
      // estado
      const rawEs = r.estado != null ? String(r.estado).trim() : ''
      if (rawEs) {
        const norm = normalizeEstado(rawEs)
        if (!norm) {
          errors.push({ rowIdx: idx, rowNum: idx + 2, codigo: r.codigo || '—', campo: 'estado', problema: `Estado inválido: "${rawEs}"`, sugerencia: `Valores válidos: ${ESTADOS_HER.join(', ')}` })
          r._hasError = true
        } else if (norm !== rawEs) {
          corrections.push({ id: `c${++corrId}`, rowIdx: idx, rowNum: idx + 2, campo: 'estado', de: rawEs, a: norm, descripcion: 'Normalizar estado al formato del sistema' })
          r.estado = norm
        }
      }
      // fecha_ultima_mant (campo que el usuario llama "proxima_mantencion")
      const rawFe = r.fecha_ultima_mant != null ? String(r.fecha_ultima_mant).trim() : ''
      if (rawFe) {
        const iso = parseDate(rawFe)
        if (!iso) {
          errors.push({ rowIdx: idx, rowNum: idx + 2, codigo: r.codigo || '—', campo: 'fecha_ultima_mant', problema: `Fecha inválida: "${rawFe}"`, sugerencia: 'Usar formato DD/MM/AAAA o AAAA-MM-DD' })
          r._hasError = true
        } else if (iso !== rawFe) {
          corrections.push({ id: `c${++corrId}`, rowIdx: idx, rowNum: idx + 2, campo: 'fecha_ultima_mant', de: rawFe, a: iso, descripcion: 'Convertir fecha al formato estándar ISO 8601' })
          r.fecha_ultima_mant = iso
        }
      }
    }

    return r
  })

  // ── 2. Duplicados dentro del archivo ─────────────────────
  const codigoIdx: Record<string, number[]> = {}
  processed.forEach(r => {
    if (r.codigo && !r._hasError) {
      const c = String(r.codigo)
      if (!codigoIdx[c]) codigoIdx[c] = []
      codigoIdx[c].push(r._idx)
    }
  })
  const fileDups = Object.keys(codigoIdx)
    .filter(c => codigoIdx[c].length > 1)
    .map(c => ({ codigo: c, rowIdxs: codigoIdx[c], rowNums: codigoIdx[c].map(i => i + 2) }))

  // ── 3. Conflictos con la base de datos ──────────────────
  const validCodigos = processed
    .filter(r => r.codigo && !r._hasError)
    .map(r => String(r.codigo))
    .filter((v, i, a) => a.indexOf(v) === i)   // dedup

  // Sin filtro de activo: el código sigue ocupado en la base aunque la fila
  // esté soft-deleted (activo:false), así que también cuenta como conflicto
  // — si no, se clasifica como "insertar nuevo" y la base lo rechaza por el
  // UNIQUE constraint de codigo.
  const [matRes, herRes] = await Promise.all([
    validCodigos.length
      ? sb.from('materiales').select('codigo,descripcion,stock_actual,stock_minimo,precio_unitario,unidad,ubicacion,activo').in('codigo', validCodigos)
      : { data: [] as any[], error: null },
    validCodigos.length
      ? sb.from('herramientas').select('codigo,descripcion,estado,responsable,ubicacion,activo').in('codigo', validCodigos)
      : { data: [] as any[], error: null },
  ])

  const matMap: Record<string, any> = {}
  ;(matRes.data ?? []).forEach((r: any) => { matMap[r.codigo] = r })
  const herMap: Record<string, any> = {}
  ;(herRes.data ?? []).forEach((r: any) => { herMap[r.codigo] = r })

  const dbConflicts: any[] = []
  for (const row of processed) {
    if (!row.codigo || row._hasError) continue
    const c = String(row.codigo)
    const inMat = matMap[c]
    const inHer = herMap[c]
    if (!inMat && !inHer) continue

    const existing = type === 'materiales' ? (inMat ?? inHer) : (inHer ?? inMat)
    const tableSource = type === 'materiales' ? (inMat ? 'materiales' : 'herramientas') : (inHer ? 'herramientas' : 'materiales')
    const sameTable = (type === 'materiales' && !!inMat) || (type === 'herramientas' && !!inHer)

    dbConflicts.push({
      rowIdx:      row._idx,
      rowNum:      row._rowNum,
      codigo:      c,
      tableSource,
      sameTable,
      existing,
      incoming:    row,
      resolution:  sameTable ? 'update' : 'skip',   // default
      suggestedSku: null,  // filled in step 4
    })
  }

  // ── 4. Generar SKUs sugeridos para conflictos ────────────
  const prefixesNeeded: string[] = []
  for (const conflict of dbConflicts) {
    const pfx = type === 'herramientas' ? 'HER' : prefixForCat(conflict.incoming.categoria_nombre)
    if (!prefixesNeeded.includes(pfx)) prefixesNeeded.push(pfx)
  }

  // Build a counter per prefix (sequential, each call increments)
  const skuCounters: Record<string, number> = {}
  for (const pfx of prefixesNeeded) {
    const base = await nextSku(pfx, sb)
    const n = parseInt(base.split('-').pop()!, 10)
    skuCounters[pfx] = n
  }
  function allocateSku(pfx: string): string {
    if (skuCounters[pfx] == null) skuCounters[pfx] = 0
    else skuCounters[pfx]++
    return `${pfx}-${String(skuCounters[pfx]).padStart(3, '0')}`
  }

  for (const conflict of dbConflicts) {
    const pfx = type === 'herramientas' ? 'HER' : prefixForCat(conflict.incoming.categoria_nombre)
    conflict.suggestedSku = allocateSku(pfx)
  }

  // ── 5. Conteo de filas limpias ───────────────────────────
  const conflictIdxMap: Record<number, true> = {}
  dbConflicts.forEach(c => { conflictIdxMap[c.rowIdx] = true })
  const fileDupExtraIdxs: number[] = []
  fileDups.forEach(d => d.rowIdxs.slice(1).forEach((i: number) => fileDupExtraIdxs.push(i)))

  const validCount = processed.filter(r =>
    !r._hasError &&
    !conflictIdxMap[r._idx] &&
    !fileDupExtraIdxs.includes(r._idx)
  ).length

  // ── 6. Clasificar categorías faltantes (solo materiales) ────
  const categoryMatches: {
    rowIdx:      number
    rowNum:      number
    codigo:      string
    descripcion: string
    suggested:   string | null
    confidence:  'alta' | 'none'
    keyword:     string | null
  }[] = []

  if (type === 'materiales') {
    for (const row of processed) {
      if (row._hasError) continue
      const catNombre = row.categoria_nombre != null ? String(row.categoria_nombre).trim() : ''
      if (catNombre) continue   // ya tiene categoría válida: no tocar
      const result = classifyByRules(row.descripcion)
      categoryMatches.push({
        rowIdx:      row._idx,
        rowNum:      row._rowNum,
        codigo:      row.codigo,
        descripcion: row.descripcion,
        suggested:   result.categoria,
        confidence:  result.confidence,
        keyword:     result.keyword,
      })
    }
  }

  return NextResponse.json({
    errors,
    corrections,
    fileDups,
    dbConflicts,
    validCount,
    totalRows: rows.length,
    categoryMatches,
  })
}
