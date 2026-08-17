import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { requireModificar } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string; itemId: string } }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const denegado = await requireModificar('checklist_drs')
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const body = await req.json()
  const patch: Record<string, unknown> = {}

  if (body.etiqueta !== undefined) patch.etiqueta = body.etiqueta
  if (body.valor !== undefined) patch.valor = body.valor
  if (body.estado !== undefined) patch.estado = body.estado
  if (typeof body.foto_tomada === 'boolean') patch.foto_tomada = body.foto_tomada
  if (body.foto_url !== undefined) patch.foto_url = body.foto_url
  if (body.notas !== undefined) patch.notas = body.notas

  const { data, error } = await sb
    .from('checklists_drs_items')
    .update(patch)
    .eq('id', params.itemId)
    .eq('checklist_id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// Solo se pueden borrar filas agregadas dinámicamente (editable_fila=true)
// — los puntos fijos del protocolo (aislación, enchufes, etc.) no se borran.
export async function DELETE(_: NextRequest, { params }: Ctx) {
  const denegado = await requireModificar('checklist_drs')
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const { data: item } = await sb
    .from('checklists_drs_items')
    .select('editable_fila')
    .eq('id', params.itemId)
    .eq('checklist_id', params.id)
    .maybeSingle()

  if (!item) return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 })
  if (!item.editable_fila) return NextResponse.json({ error: 'Este punto es fijo del protocolo y no se puede borrar' }, { status: 400 })

  const { error } = await sb
    .from('checklists_drs_items')
    .delete()
    .eq('id', params.itemId)
    .eq('checklist_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
