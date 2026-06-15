import { getSupabaseServer } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/materiales/upsert
// Body: { rows: MappedRow[], updateStock: boolean }
// Returns: { added, updated, errors }

interface MappedRow {
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

export async function POST(req: Request) {
  const { rows, updateStock } = (await req.json()) as {
    rows: MappedRow[]
    updateStock: boolean
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ added: 0, updated: 0, errors: [] })
  }

  const sb = getSupabaseServer()

  // 1. Obtener categorías existentes y crear las faltantes
  const _catSet = rows.map(r => r.categoria_nombre).filter(Boolean)
  const categoriaNombres = _catSet.filter((v, i) => _catSet.indexOf(v) === i)
  const { data: cats } = await sb.from('categorias').select('id, nombre')
  const catMap = new Map<string, number>(
    (cats ?? []).map((c: any) => [c.nombre.toLowerCase(), c.id])
  )
  for (const nombre of categoriaNombres) {
    const key = nombre.toLowerCase()
    if (!catMap.has(key)) {
      const { data: newCat } = await sb
        .from('categorias')
        .insert({ nombre })
        .select('id')
        .single()
      if (newCat) catMap.set(key, (newCat as any).id)
    }
  }

  // 2. Detectar cuáles códigos ya existen
  const codigos = rows.map(r => r.codigo).filter(Boolean)
  const { data: existing } = await sb
    .from('materiales')
    .select('codigo')
    .in('codigo', codigos)
  const existingSet = new Set<string>((existing ?? []).map((e: any) => e.codigo))

  // 3. Separar en filas nuevas y a actualizar
  const toInsert: any[] = []
  const toUpdate: any[] = []
  const errors:   { codigo: string; error: string }[] = []

  for (const row of rows) {
    if (!row.codigo || !row.descripcion) {
      errors.push({
        codigo: row.codigo ?? '(sin código)',
        error: 'Código y descripción son obligatorios',
      })
      continue
    }

    const catId = row.categoria_nombre
      ? catMap.get(row.categoria_nombre.toLowerCase())
      : undefined

    const base: any = {
      codigo:          row.codigo.toString().trim(),
      descripcion:     row.descripcion.toString().trim(),
      unidad:          row.unidad || 'UN',
      stock_minimo:    Number(row.stock_minimo)    || 0,
      precio_unitario: Number(row.precio_unitario) || 0,
      ubicacion:       row.ubicacion || null,
      notas:           row.notas    || null,
      activo:          true,
    }
    if (catId) base.categoria_id = catId

    if (existingSet.has(row.codigo)) {
      // Para actualizaciones, incluir stock solo si el usuario lo pidió
      if (updateStock) base.stock_actual = Number(row.stock_actual) || 0
      toUpdate.push(base)
    } else {
      base.stock_actual = Number(row.stock_actual) || 0
      toInsert.push(base)
    }
  }

  // 4. Insertar nuevos
  let added = 0
  if (toInsert.length > 0) {
    const { error: errIns } = await sb.from('materiales').insert(toInsert)
    if (errIns) {
      return NextResponse.json({ error: errIns.message }, { status: 500 })
    }
    added = toInsert.length
  }

  // 5. Upsert existentes (ON CONFLICT codigo DO UPDATE)
  let updated = 0
  if (toUpdate.length > 0) {
    const { error: errUpd } = await sb
      .from('materiales')
      .upsert(toUpdate, { onConflict: 'codigo' })
    if (errUpd) {
      return NextResponse.json({ error: errUpd.message }, { status: 500 })
    }
    updated = toUpdate.length
  }

  return NextResponse.json({ added, updated, errors })
}
