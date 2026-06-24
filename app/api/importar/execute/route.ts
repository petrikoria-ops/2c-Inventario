import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type ActionType = 'insert' | 'update' | 'skip'
interface Action {
  rowIdx:  number
  action:  ActionType
  data:    Record<string, any>
}

// Inserta/actualiza en un solo statement (rápido). Si el lote falla — por
// ejemplo, una fila choca con un código que ya existe y no se detectó como
// conflicto — Postgres revierte TODO el lote. Para no perder las filas
// válidas por culpa de una sola, se reintenta fila por fila y se reporta
// solo la(s) que realmente fallan.
async function bulkResilient(
  sb: ReturnType<typeof getSupabaseServer>,
  table: string,
  rows: any[],
  mode: 'insert' | 'upsert',
): Promise<{ count: number; errors: { codigo: string; error: string }[] }> {
  if (!rows.length) return { count: 0, errors: [] }

  const bulk = mode === 'insert'
    ? await sb.from(table).insert(rows)
    : await sb.from(table).upsert(rows, { onConflict: 'codigo' })
  if (!bulk.error) return { count: rows.length, errors: [] }

  let count = 0
  const errors: { codigo: string; error: string }[] = []
  for (const row of rows) {
    const r = mode === 'insert'
      ? await sb.from(table).insert(row)
      : await sb.from(table).upsert(row, { onConflict: 'codigo' })
    if (r.error) errors.push({ codigo: row.codigo ?? '?', error: r.error.message })
    else count++
  }
  return { count, errors }
}

// ─── Materiales ──────────────────────────────────────────────
async function executeMateriales(actions: Action[], sb: ReturnType<typeof getSupabaseServer>) {
  // Recopilar nombres de categorías y proveedores únicos
  const catNames: string[] = []
  const provNames: string[] = []
  for (const a of actions) {
    if (a.action === 'skip') continue
    if (a.data.categoria_nombre && !catNames.includes(a.data.categoria_nombre)) catNames.push(a.data.categoria_nombre)
    if (a.data.proveedor_nombre && !provNames.includes(a.data.proveedor_nombre))  provNames.push(a.data.proveedor_nombre)
  }

  // Mapa nombre → id para categorías (crea si no existe)
  const catMap: Record<string, number> = {}
  if (catNames.length) {
    const { data: cats } = await sb.from('categorias').select('id,nombre').in('nombre', catNames)
    ;(cats ?? []).forEach((c: any) => { catMap[c.nombre] = c.id })
    for (const nombre of catNames) {
      if (!catMap[nombre]) {
        const { data: nc } = await sb.from('categorias').insert({ nombre }).select('id').single()
        if (nc) catMap[nombre] = (nc as any).id
      }
    }
  }

  // Mapa nombre → id para proveedores (solo busca, no crea)
  const provMap: Record<string, number> = {}
  if (provNames.length) {
    const { data: provs } = await sb.from('proveedores').select('id,nombre').in('nombre', provNames).eq('activo', true)
    ;(provs ?? []).forEach((p: any) => { provMap[p.nombre] = p.id })
  }

  const toInsert: any[] = []
  const toUpdate: any[] = []
  const errors: { codigo: string; error: string }[] = []

  for (const a of actions) {
    if (a.action === 'skip') continue
    const d = a.data
    if (!d.codigo || !d.descripcion) {
      errors.push({ codigo: d.codigo ?? '?', error: 'Código o descripción faltante' })
      continue
    }
    const row: any = {
      codigo:          String(d.codigo).trim(),
      descripcion:     String(d.descripcion).trim(),
      unidad:          d.unidad || 'UN',
      stock_minimo:    Math.max(parseFloat(d.stock_minimo) || 0, 0),
      precio_unitario: Math.max(parseFloat(d.precio_unitario) || 0, 0),
      ubicacion:       d.ubicacion || null,
      notas:           d.notas || null,
      activo:          true,
    }
    if (d.categoria_nombre && catMap[d.categoria_nombre]) row.categoria_id = catMap[d.categoria_nombre]
    if (d.proveedor_nombre  && provMap[d.proveedor_nombre])  row.proveedor_id  = provMap[d.proveedor_nombre]

    if (a.action === 'insert') {
      row.stock_actual = Math.max(parseFloat(d.stock_actual) || 0, 0)
      toInsert.push(row)
    } else {
      // update: no tocar stock_actual
      toUpdate.push(row)
    }
  }

  let inserted = 0, updated = 0
  if (toInsert.length) {
    const r = await bulkResilient(sb, 'materiales', toInsert, 'insert')
    inserted = r.count
    errors.push(...r.errors)
  }
  if (toUpdate.length) {
    const r = await bulkResilient(sb, 'materiales', toUpdate, 'upsert')
    updated = r.count
    errors.push(...r.errors)
  }
  return { inserted, updated, errors }
}

// ─── Herramientas ────────────────────────────────────────────
async function executeHerramientas(actions: Action[], sb: ReturnType<typeof getSupabaseServer>) {
  const toInsert: any[] = []
  const toUpdate: any[] = []
  const errors: { codigo: string; error: string }[] = []

  for (const a of actions) {
    if (a.action === 'skip') continue
    const d = a.data
    if (!d.codigo || !d.descripcion) {
      errors.push({ codigo: d.codigo ?? '?', error: 'Código o descripción faltante' })
      continue
    }

    // Separar marca_modelo → marca / modelo
    let marca: string | null = null
    let modelo: string | null = null
    if (d.marca_modelo) {
      const parts = String(d.marca_modelo).split('/')
      marca  = parts[0]?.trim() || null
      modelo = parts[1]?.trim() || null
    }

    const estadosValidos = ['operativa', 'en_reparacion', 'extraviada', 'dada_de_baja']
    const row: any = {
      codigo:           String(d.codigo).trim(),
      descripcion:      String(d.descripcion).trim(),
      marca:            marca,
      modelo:           modelo,
      estado:           estadosValidos.includes(d.estado) ? d.estado : 'operativa',
      responsable:      d.responsable || null,
      ubicacion:        d.ubicacion || null,
      fecha_ultima_mant: d.fecha_ultima_mant || null,
      activo:           true,
    }

    if (a.action === 'insert') toInsert.push(row)
    else                       toUpdate.push(row)
  }

  let inserted = 0, updated = 0
  if (toInsert.length) {
    const r = await bulkResilient(sb, 'herramientas', toInsert, 'insert')
    inserted = r.count
    errors.push(...r.errors)
  }
  if (toUpdate.length) {
    const r = await bulkResilient(sb, 'herramientas', toUpdate, 'upsert')
    updated = r.count
    errors.push(...r.errors)
  }
  return { inserted, updated, errors }
}

// ─── Endpoint ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { type, actions, skipped } = (await req.json()) as {
    type:    'materiales' | 'herramientas'
    actions: Action[]
    skipped: number
  }

  const sb = getSupabaseServer()

  try {
    const result = type === 'materiales'
      ? await executeMateriales(actions, sb)
      : await executeHerramientas(actions, sb)

    return NextResponse.json({
      inserted: result.inserted,
      updated:  result.updated,
      skipped,
      errors:   result.errors,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
