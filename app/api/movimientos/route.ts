import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const sb = getSupabaseServer()
  const { searchParams: p } = new URL(req.url)
  const materialId = p.get('material_id')
  const proyectoId = p.get('proyecto_id')
  const tipo       = p.get('tipo')
  const desde      = p.get('desde')
  const hasta      = p.get('hasta')
  const page       = Math.max(1, parseInt(p.get('page') ?? '1'))
  const limit      = parseInt(p.get('limit') ?? '50')
  const offset     = (page - 1) * limit

  let query = sb
    .from('movimientos')
    .select('*,materiales(codigo,descripcion,unidad),proyectos(ot,nombre)', { count: 'exact' })

  if (materialId) query = query.eq('material_id', materialId)
  if (proyectoId) query = query.eq('proyecto_id', proyectoId)
  if (tipo)       query = query.eq('tipo', tipo)
  if (desde)      query = query.gte('fecha', desde)
  if (hasta)      query = query.lte('fecha', hasta + 'T23:59:59')

  const { data, count, error } = await query
    .order('fecha', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data ?? [], total: count ?? 0, page, limit })
}

export async function POST(req: NextRequest) {
  const sb = getSupabaseServer()
  const { material_id, tipo, cantidad, proyecto_id, usuario, motivo, notas } = await req.json()

  if (!material_id || !tipo || cantidad === undefined) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  // Obtener stock actual y precio
  const { data: mat, error: matErr } = await sb
    .from('materiales')
    .select('stock_actual,precio_unitario')
    .eq('id', material_id)
    .eq('activo', true)
    .single()

  if (matErr || !mat) return NextResponse.json({ error: 'Material no encontrado' }, { status: 404 })

  const stockAntes = mat.stock_actual
  let stockDespues: number

  if (tipo === 'entrada' || tipo === 'devolucion') {
    stockDespues = stockAntes + Math.abs(cantidad)
  } else if (tipo === 'salida') {
    stockDespues = stockAntes - Math.abs(cantidad)
    if (stockDespues < 0) return NextResponse.json({ error: 'Stock insuficiente' }, { status: 400 })
  } else if (tipo === 'ajuste') {
    stockDespues = parseFloat(cantidad) // en ajuste, cantidad = nuevo stock total
  } else {
    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  }

  const cantidadReal = tipo === 'ajuste'
    ? Math.abs(stockDespues - stockAntes)
    : Math.abs(cantidad)

  // Insertar movimiento
  const { data: mov, error: movErr } = await sb
    .from('movimientos')
    .insert({
      material_id,
      tipo,
      cantidad: cantidadReal,
      stock_antes: stockAntes,
      stock_despues: stockDespues,
      proyecto_id: proyecto_id || null,
      usuario: usuario || 'admin',
      motivo: motivo || null,
      precio_unit: mat.precio_unitario,
      notas: notas || null,
    })
    .select()
    .single()

  if (movErr) return NextResponse.json({ error: movErr.message }, { status: 500 })

  // Actualizar stock en el material
  const { error: updErr } = await sb
    .from('materiales')
    .update({ stock_actual: stockDespues })
    .eq('id', material_id)

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  return NextResponse.json({ id: mov.id, stock_nuevo: stockDespues }, { status: 201 })
}
