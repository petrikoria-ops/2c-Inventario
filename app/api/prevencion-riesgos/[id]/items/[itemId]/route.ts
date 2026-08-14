import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { requireModificar, requireEliminar } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string; itemId: string } }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const denegado = await requireModificar('prevencion_riesgos')
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const body = await req.json()
  const patch: Record<string, unknown> = {}

  for (const campo of [
    'resultado', 'detalle', 'nivel', 'norma', 'medidas_mp', 'medida_texto',
    'responsable', 'plazo', 'catalogo_id', 'foto_url',
  ]) {
    if (body[campo] !== undefined) patch[campo] = body[campo]
  }

  const { data, error } = await sb
    .from('inspecciones_prevencion_items')
    .update(patch)
    .eq('id', params.itemId)
    .eq('inspeccion_id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// Solo se pueden borrar hallazgos adicionales (n=null) — los 33 ítems
// base del checklist DS 594 se limpian marcándolos "Cumple"/"No Aplica",
// nunca se eliminan (son parte fija de la inspección).
export async function DELETE(_: NextRequest, { params }: Ctx) {
  const denegado = await requireEliminar('prevencion_riesgos')
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const { data: item } = await sb
    .from('inspecciones_prevencion_items')
    .select('n')
    .eq('id', params.itemId)
    .eq('inspeccion_id', params.id)
    .maybeSingle()

  if (!item) return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 })
  if (item.n !== null) {
    return NextResponse.json({ error: 'Los ítems del checklist DS 594 no se pueden eliminar.' }, { status: 400 })
  }

  const { error } = await sb.from('inspecciones_prevencion_items').delete().eq('id', params.itemId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
