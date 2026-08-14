import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { requireModificar, requireEliminar } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

export async function GET(_: NextRequest, { params }: Ctx) {
  const sb = getSupabaseServer()
  const { data, error } = await sb
    .from('tableros')
    .select('*, proyectos(id,ot,nombre), tableros_checklist(*)')
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const denegado = await requireModificar('tableros')
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const body = await req.json()
  const patch: Record<string, unknown> = {}

  for (const campo of ['nombre', 'amperaje', 'requiere_fat_sat', 'estado']) {
    if (body[campo] !== undefined) patch[campo] = body[campo]
  }

  const { data, error } = await sb
    .from('tableros')
    .update(patch)
    .eq('id', params.id)
    .select('*, proyectos(id,ot,nombre)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const denegado = await requireEliminar('tableros')
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const { error } = await sb.from('tableros').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
