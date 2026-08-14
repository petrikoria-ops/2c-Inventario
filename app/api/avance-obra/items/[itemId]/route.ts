import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getPerfil, puedeModificar, puedeMarcarAvance, requireModificar } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'

type Ctx = { params: { itemId: string } }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const perfil = await getPerfil()
  const body = await req.json()

  // Tildar `completado` es "marcar" (Maestro de terreno incluido); tocar
  // cualquier otro campo es "estructurar" el plan (etapa/descripcion/fecha),
  // reservado a quien puede modificar avance_obra de verdad.
  const soloCompletado = Object.keys(body).length > 0 && Object.keys(body).every(k => k === 'completado')
  const autorizado = soloCompletado ? puedeMarcarAvance(perfil) : (!!perfil && puedeModificar(perfil, 'avance_obra'))
  if (!autorizado) {
    return NextResponse.json({ error: 'Tu perfil no tiene permiso para modificar el avance de esta obra.' }, { status: 403 })
  }

  const sb = getSupabaseServer()
  const patch: Record<string, unknown> = {}

  if (typeof body.completado === 'boolean') {
    patch.completado = body.completado
    if (body.completado) {
      patch.completado_por = perfil?.id ?? null
      patch.completado_por_nombre = perfil?.nombre_completo ?? null
      patch.completado_en = new Date().toISOString()
    } else {
      patch.completado_por = null
      patch.completado_por_nombre = null
      patch.completado_en = null
    }
  }
  if (body.etapa !== undefined) patch.etapa = String(body.etapa).trim()
  if (body.descripcion !== undefined) patch.descripcion = body.descripcion || null
  if (body.fecha_estimada !== undefined) patch.fecha_estimada = body.fecha_estimada || null

  const { data, error } = await sb
    .from('avances_obra_items')
    .update(patch)
    .eq('id', params.itemId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const denegado = await requireModificar('avance_obra')
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const { error } = await sb.from('avances_obra_items').delete().eq('id', params.itemId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
