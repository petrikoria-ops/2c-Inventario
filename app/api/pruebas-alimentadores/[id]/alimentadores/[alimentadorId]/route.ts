import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { requireModificar, requireEliminar } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string; alimentadorId: string } }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const denegado = await requireModificar('pruebas_alimentadores')
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const body = await req.json()
  const patch: Record<string, unknown> = {}

  for (const campo of ['nombre', 'proteccion_aguas_arriba', 'largo']) {
    if (body[campo] !== undefined) patch[campo] = body[campo]
  }

  const { data, error } = await sb
    .from('pruebas_alimentadores_alimentadores')
    .update(patch)
    .eq('id', params.alimentadorId)
    .eq('prueba_id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// Elimina un alimentador y sus mediciones (ON DELETE CASCADE) — para
// sacar uno agregado por error del informe.
export async function DELETE(_: NextRequest, { params }: Ctx) {
  const denegado = await requireEliminar('pruebas_alimentadores')
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const { error } = await sb
    .from('pruebas_alimentadores_alimentadores')
    .delete()
    .eq('id', params.alimentadorId)
    .eq('prueba_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
