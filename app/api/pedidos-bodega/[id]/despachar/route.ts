import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getPerfil, requireModificar } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

// Arma el despacho de un pedido ya aprobado: genera un vale de despacho
// real (mismo correlativo VD-YYYY-NNN e items que /api/salidas), crea los
// movimientos tipo 'salida' y descuenta stock — no un simple cambio de
// estado. Reutiliza exactamente el mismo cálculo de stock que
// /api/salidas para no tener dos lugares distintos que decidan cómo se
// descuenta inventario.
export async function POST(_: NextRequest, { params }: Ctx) {
  const denegado = await requireModificar('pedidos_bodega')
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const perfil = await getPerfil()

  const { data: pedido, error: errPed } = await sb
    .from('pedidos_bodega')
    .select('*, pedidos_bodega_items(*)')
    .eq('id', params.id)
    .single()

  if (errPed || !pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  if (pedido.estado !== 'aprobado') {
    return NextResponse.json({ error: `Este pedido está "${pedido.estado}" — solo se puede despachar uno aprobado.` }, { status: 409 })
  }

  const items = pedido.pedidos_bodega_items as any[]
  if (!items?.length) return NextResponse.json({ error: 'El pedido no tiene ítems' }, { status: 400 })

  const materialIds = items.map(i => i.material_id).filter(Boolean)
  const { data: mats, error: matErr } = await sb
    .from('materiales')
    .select('id,codigo,stock_actual,precio_unitario')
    .in('id', materialIds)
    .eq('activo', true)

  if (matErr) return NextResponse.json({ error: matErr.message }, { status: 500 })

  const matMap: Record<number, any> = {}
  ;(mats ?? []).forEach(m => { matMap[m.id] = m })

  const stockErrors: string[] = []
  for (const item of items) {
    const mat = matMap[item.material_id]
    if (!mat) { stockErrors.push(`${item.codigo}: material no encontrado`); continue }
    if (mat.stock_actual < item.cantidad_pedida) {
      stockErrors.push(`${mat.codigo}: disponible ${mat.stock_actual}, pedido ${item.cantidad_pedida}`)
    }
  }
  if (stockErrors.length) {
    return NextResponse.json({ error: 'Stock insuficiente para armar el despacho', stockErrors }, { status: 400 })
  }

  // Correlativo VD-YYYY-NNN — mismo patrón que /api/salidas
  const year = new Date().getFullYear()
  const { data: last } = await sb
    .from('vales_despacho')
    .select('numero')
    .like('numero', `VD-${year}-%`)
    .order('numero', { ascending: false })
    .limit(1)
  const lastSeq = last?.[0]?.numero ? parseInt(last[0].numero.split('-')[2] ?? '0', 10) : 0
  const numero = `VD-${year}-${String(lastSeq + 1).padStart(3, '0')}`

  const { data: vale, error: valeErr } = await sb
    .from('vales_despacho')
    .insert({
      numero,
      proyecto_id: pedido.proyecto_id,
      usuario: perfil?.nombre_completo ?? 'admin',
      motivo: `Pedido a bodega ${pedido.numero}`,
      observaciones: pedido.observaciones,
    })
    .select()
    .single()

  if (valeErr) return NextResponse.json({ error: valeErr.message }, { status: 500 })

  const itemsRows = items.map(item => ({
    vale_id: vale.id,
    material_id: item.material_id,
    codigo: item.codigo,
    descripcion: item.descripcion,
    unidad: item.unidad || 'UN',
    cantidad_entregada: item.cantidad_pedida,
    precio_unit: matMap[item.material_id]?.precio_unitario ?? null,
  }))

  const { error: itemsErr } = await sb.from('vales_despacho_items').insert(itemsRows)
  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 })

  for (const item of items) {
    const mat = matMap[item.material_id]
    const stockAntes = mat.stock_actual
    const stockDespues = stockAntes - item.cantidad_pedida

    await sb.from('movimientos').insert({
      material_id: item.material_id,
      tipo: 'salida',
      cantidad: item.cantidad_pedida,
      stock_antes: stockAntes,
      stock_despues: stockDespues,
      proyecto_id: pedido.proyecto_id,
      usuario: perfil?.nombre_completo ?? 'admin',
      motivo: `Pedido a bodega ${pedido.numero}`,
      precio_unit: mat.precio_unitario,
      notas: `Vale de despacho ${numero}`,
    })

    await sb.from('materiales').update({ stock_actual: stockDespues }).eq('id', item.material_id)
    mat.stock_actual = stockDespues // por si el mismo material aparece más de una vez
  }

  const { data: pedidoActualizado, error: errUpd } = await sb
    .from('pedidos_bodega')
    .update({ estado: 'despachado', vale_despacho_id: vale.id })
    .eq('id', params.id)
    .select('*, pedidos_bodega_items(*), proyectos(id,ot,nombre)')
    .single()

  if (errUpd) return NextResponse.json({ error: errUpd.message }, { status: 500 })

  return NextResponse.json({ ...pedidoActualizado, vale_numero: numero })
}
