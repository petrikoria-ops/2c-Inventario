import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { escapeOrFilterValue } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const sb = getSupabaseServer()
  const { searchParams: p } = new URL(req.url)
  const q     = p.get('q') ?? ''
  const limit = parseInt(p.get('limit') ?? '50')
  const page  = Math.max(1, parseInt(p.get('page') ?? '1'))
  const offset = (page - 1) * limit

  let query = sb
    .from('vales_despacho')
    .select(
      '*, proyectos(ot,nombre), vales_despacho_items(id)',
      { count: 'exact' }
    )

  if (q) {
    const safeQ = escapeOrFilterValue(q)
    query = query.or(`numero.ilike."%${safeQ}%",usuario.ilike."%${safeQ}%"`)
  }

  const { data, count, error } = await query
    .order('fecha', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data ?? [], total: count ?? 0, page, limit })
}

export async function POST(req: NextRequest) {
  const sb = getSupabaseServer()
  const { items, proyecto_id, usuario, motivo, observaciones } = await req.json()

  if (!items?.length) return NextResponse.json({ error: 'Sin ítems' }, { status: 400 })

  // Verificar stock antes de operar
  const materialIds: number[] = items.map((i: any) => i.material_id as number)
  const { data: mats, error: matErr } = await sb
    .from('materiales')
    .select('id,codigo,stock_actual,precio_unitario')
    .in('id', materialIds)
    .eq('activo', true)

  if (matErr) return NextResponse.json({ error: matErr.message }, { status: 500 })

  const matMap: Record<number, any> = {}
  ;(mats ?? []).forEach((m: any) => { matMap[m.id] = m })

  const stockErrors: string[] = []
  for (const item of items) {
    const mat = matMap[item.material_id]
    if (!mat) { stockErrors.push(`Material ID ${item.material_id} no encontrado`); continue }
    if (mat.stock_actual < item.cantidad_entregada) {
      stockErrors.push(
        `${mat.codigo}: disponible ${mat.stock_actual}, solicitado ${item.cantidad_entregada}`
      )
    }
  }
  if (stockErrors.length) {
    return NextResponse.json({ error: 'Stock insuficiente', stockErrors }, { status: 400 })
  }

  // Generar número VD-YYYY-NNN
  const year = new Date().getFullYear()
  const { data: last } = await sb
    .from('vales_despacho')
    .select('numero')
    .like('numero', `VD-${year}-%`)
    .order('numero', { ascending: false })
    .limit(1)
  const lastSeq = last?.[0]?.numero
    ? parseInt(last[0].numero.split('-')[2] ?? '0', 10) : 0
  const numero = `VD-${year}-${String(lastSeq + 1).padStart(3, '0')}`

  // Crear registro del vale
  const { data: vale, error: valeErr } = await sb
    .from('vales_despacho')
    .insert({
      numero,
      proyecto_id: proyecto_id || null,
      usuario:     usuario || 'admin',
      motivo:      motivo || null,
      observaciones: observaciones || null,
    })
    .select()
    .single()

  if (valeErr) return NextResponse.json({ error: valeErr.message }, { status: 500 })

  // Insertar ítems
  const itemsRows = items.map((item: any) => ({
    vale_id:            vale.id,
    material_id:        item.material_id,
    codigo:             item.codigo,
    descripcion:        item.descripcion,
    unidad:             item.unidad || 'UN',
    cantidad_entregada: item.cantidad_entregada,
    precio_unit:        matMap[item.material_id]?.precio_unitario ?? null,
  }))

  const { error: itemsErr } = await sb.from('vales_despacho_items').insert(itemsRows)
  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 })

  // Crear movimientos SALIDA y actualizar stocks
  for (const item of items) {
    const mat = matMap[item.material_id]
    const stockAntes   = mat.stock_actual
    const stockDespues = stockAntes - item.cantidad_entregada

    await sb.from('movimientos').insert({
      material_id:   item.material_id,
      tipo:          'salida',
      cantidad:      item.cantidad_entregada,
      stock_antes:   stockAntes,
      stock_despues: stockDespues,
      proyecto_id:   proyecto_id || null,
      usuario:       usuario || 'admin',
      motivo:        motivo || `Vale ${numero}`,
      precio_unit:   mat.precio_unitario,
      notas:         `Vale de despacho ${numero}`,
    })

    await sb
      .from('materiales')
      .update({ stock_actual: stockDespues })
      .eq('id', item.material_id)

    mat.stock_actual = stockDespues  // actualizar localmente para ítems duplicados
  }

  return NextResponse.json({ id: vale.id, numero }, { status: 201 })
}
