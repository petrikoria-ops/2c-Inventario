// Parser del formato estándar de "solicitud de materiales" que envían los
// supervisores de terreno: un bloque de cabecera (Obra/Supervisor/Visitador/
// Fecha entrega) seguido de una tabla ITEM | CODIGO | DESCRIPCION | UNIDAD |
// STOCK INICIAL (esta última columna es en realidad la cantidad pedida).

export interface ParsedSolicitudItem {
  codigo:      string
  descripcion: string
  unidad:      string
  cantidad:    number
}

export interface ParsedSolicitud {
  obra:         string
  supervisor:   string
  visitador:    string
  fechaEntrega: string // ISO yyyy-mm-dd, o '' si no se pudo interpretar
  items:        ParsedSolicitudItem[]
}

const norm = (v: unknown): string => String(v ?? '').trim()

const normKey = (v: unknown): string =>
  norm(v).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// El Excel trae fechas como texto "M/D/YY" (ej. 7/22/25 = 22 de julio 2025).
// Si el primer número no puede ser mes (>12), se asume D/M como respaldo.
function parseFechaPlanilla(raw: string): string {
  const m = raw.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})$/)
  if (!m) return ''
  const [, a, b, y] = m
  const mes = Number(a) > 12 ? b.padStart(2, '0') : a.padStart(2, '0')
  const dia = Number(a) > 12 ? a.padStart(2, '0') : b.padStart(2, '0')
  const year = y.length === 2 ? `20${y}` : y
  return `${year}-${mes}-${dia}`
}

// Si el lector de Excel se invocó con cellDates:true, las celdas de fecha
// llegan como Date reales en vez de texto. Se formatean con accesores UTC
// para no desfasarse de día según la zona horaria del navegador/servidor.
function formatFecha(raw: unknown): string {
  if (raw instanceof Date) {
    const y = raw.getUTCFullYear()
    const mo = String(raw.getUTCMonth() + 1).padStart(2, '0')
    const d = String(raw.getUTCDate()).padStart(2, '0')
    return `${y}-${mo}-${d}`
  }
  return parseFechaPlanilla(norm(raw))
}

function findHeaderRow(rows: unknown[][]): number {
  return rows.findIndex(r =>
    r.some(c => normKey(c).startsWith('CODIGO')) &&
    r.some(c => normKey(c).startsWith('DESCRIPCION'))
  )
}

function colIndex(headerRow: unknown[], ...labels: string[]): number {
  return headerRow.findIndex(c => labels.some(l => normKey(c).startsWith(l)))
}

export function parseSolicitudExcel(rows: unknown[][]): ParsedSolicitud {
  const result: ParsedSolicitud = { obra: '', supervisor: '', visitador: '', fechaEntrega: '', items: [] }
  const headerRowIdx = findHeaderRow(rows)

  // ── Bloque de información (antes de la tabla de ítems) ──────────
  const infoRows = headerRowIdx >= 0 ? rows.slice(0, headerRowIdx) : rows
  for (const row of infoRows) {
    const labelIdx = row.findIndex(c => norm(c) !== '')
    if (labelIdx === -1) continue
    const label   = normKey(row[labelIdx])
    const rawValue = row.slice(labelIdx + 1).find(c => norm(c) !== '' && norm(c) !== ':')
    if (rawValue === undefined) continue
    const value = norm(rawValue)

    if (label.startsWith('OBRA'))            result.obra = value
    else if (label.startsWith('SUPERVISOR')) result.supervisor = value
    else if (label.startsWith('VISITADOR'))  result.visitador = value
    else if (label.startsWith('FECHE ENTREGA') || label.startsWith('FECHA ENTREGA') || label.startsWith('FECHA DE ENTREGA'))
      result.fechaEntrega = formatFecha(rawValue) || value
  }

  if (headerRowIdx === -1) return result

  // ── Tabla de ítems ────────────────────────────────────────────
  const headerRow      = rows[headerRowIdx]
  const codigoCol       = colIndex(headerRow, 'CODIGO')
  const descripcionCol = colIndex(headerRow, 'DESCRIPCION')
  const unidadCol       = colIndex(headerRow, 'UNIDAD')
  const cantidadCol     = colIndex(headerRow, 'STOCK', 'CANTIDAD')
  if (descripcionCol === -1) return result

  for (const row of rows.slice(headerRowIdx + 1)) {
    const descripcion = norm(row[descripcionCol])
    if (!descripcion) continue
    const descKey = normKey(descripcion)
    // Sub-encabezado de la sección "pendientes de solicitudes anteriores"
    // o un encabezado de columnas repetido: no son materiales, se saltan.
    if (descKey.includes('PENDIENTES SOLICITUDES ANTERIORES')) continue
    if (descKey === 'DESCRIPCION') continue

    const cantidadRaw = cantidadCol >= 0 ? norm(row[cantidadCol]).replace(',', '.') : ''
    const cantidad     = parseFloat(cantidadRaw)

    result.items.push({
      codigo:      codigoCol >= 0 ? norm(row[codigoCol]) : '',
      descripcion,
      unidad:      unidadCol >= 0 ? norm(row[unidadCol]) : '',
      cantidad:    !isFinite(cantidad) || cantidad <= 0 ? 1 : cantidad,
    })
  }

  return result
}
