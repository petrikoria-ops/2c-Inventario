import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { requireEditable } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

export async function GET(_: NextRequest, { params }: Ctx) {
  const sb = getSupabaseServer()
  const { data, error } = await sb
    .from('vales_despacho')
    .select('*, proyectos(ot,nombre,cliente), vales_despacho_items(*)')
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const denegado = await requireEditable('movimientos')
  if (denegado) return denegado
  const sb = getSupabaseServer()

  // Antes de borrar el vale, revertir el stock que descontó y dejar un
  // movimiento de devolución por cada ítem — borrar el vale sin esto deja
  // el stock permanentemente desincronizado de la realidad.
  const { data: vale, error: valeErr } = await sb
    .from('vales_despacho')
    .select('numero, vales_despacho_items(material_id, codigo, cantidad_entregada, precio_unit)')
    .eq('id', params.id)
    .single()

  if (valeErr) return NextResponse.json({ error: valeErr.message }, { status: 404 })

  const items = (vale as any).vales_despacho_items as
    { material_id: number; codigo: string; cantidad_entregada: number; precio_unit: number | null }[]

  for (const item of items) {
    const { data: mat } = await sb
      .from('materiales')
      .select('stock_actual')
      .eq('id', item.material_id)
      .single()
    if (!mat) continue

    const stockAntes   = mat.stock_actual
    const stockDespues = stockAntes + item.cantidad_entregada

    await sb.from('movimientos').insert({
      material_id:   item.material_id,
      tipo:          'devolucion',
      cantidad:      item.cantidad_entregada,
      stock_antes:   stockAntes,
      stock_despues: stockDespues,
      usuario:       'admin',
      motivo:        `Reversión por eliminación de vale ${(vale as any).numero}`,
      precio_unit:   item.precio_unit,
      notas:         `Vale ${(vale as any).numero} eliminado — stock restituido`,
    })

    await sb.from('materiales').update({ stock_actual: stockDespues }).eq('id', item.material_id)
  }

  const { error } = await sb.from('vales_despacho').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, stockRevertido: items.length })
}
