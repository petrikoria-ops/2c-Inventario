import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// DELETE /api/materiales/bulk  — soft-delete múltiples ids
// PATCH  /api/materiales/bulk  — actualizar campos en múltiples ids

export async function DELETE(req: NextRequest) {
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
  const { ids, fields }: { ids: number[]; fields: Record<string, unknown> } = await req.json()
  if (!ids?.length)    return NextResponse.json({ error: 'ids requeridos' }, { status: 400 })
  if (!fields || !Object.keys(fields).length)
    return NextResponse.json({ error: 'fields requeridos' }, { status: 400 })

  // stock_actual solo se toca vía movimientos
  const safeFields = { ...fields }
  delete safeFields.stock_actual

  const sb = getSupabaseServer()
  const { error, data } = await sb
    .from('materiales')
    .update(safeFields)
    .in('id', ids)
    .select('*,categorias(id,nombre,color),proveedores(id,nombre)')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, updated: ids.length, data: data ?? [] })
}
