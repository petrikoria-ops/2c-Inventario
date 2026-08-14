import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getPerfil, requireModificar, requireEliminar, puedeVerPrecios } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'

// DELETE /api/materiales/bulk  — soft-delete múltiples ids
// PATCH  /api/materiales/bulk  — actualizar campos en múltiples ids

export async function DELETE(req: NextRequest) {
  const denegado = await requireEliminar('materiales')
  if (denegado) return denegado
  const { ids }: { ids: number[] } = await req.json()
  if (!ids?.length) return NextResponse.json({ error: 'ids requeridos' }, { status: 400 })

  const sb = getSupabaseServer()
  const { error } = await sb
    .from('materiales')
    .update({ activo: false })
    .in('id', ids)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, deleted: ids.length })
}

export async function PATCH(req: NextRequest) {
  const denegado = await requireModificar('materiales')
  if (denegado) return denegado
  const { ids, fields }: { ids: number[]; fields: Record<string, unknown> } = await req.json()
  if (!ids?.length)    return NextResponse.json({ error: 'ids requeridos' }, { status: 400 })
  if (!fields || !Object.keys(fields).length)
    return NextResponse.json({ error: 'fields requeridos' }, { status: 400 })

  // stock_actual solo se toca vía movimientos
  const safeFields = { ...fields }
  delete safeFields.stock_actual
  const verPrecios = puedeVerPrecios(await getPerfil())
  if (!verPrecios) delete safeFields.precio_unitario

  const sb = getSupabaseServer()
  const { error, data } = await sb
    .from('materiales')
    .update(safeFields)
    .in('id', ids)
    .select('*,categorias(id,nombre,color),proveedores(id,nombre)')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // La fila completa (con el precio real, sin tocar) vuelve igual en el
  // SELECT del UPDATE aunque el campo editado haya sido otro — se redacta
  // acá para no filtrar precio en la respuesta de un bulk edit de, por
  // ejemplo, solo la ubicación.
  const rows = verPrecios ? (data ?? []) : (data ?? []).map(m => ({ ...m, precio_unitario: 0 }))
  return NextResponse.json({ ok: true, updated: ids.length, data: rows })
}
