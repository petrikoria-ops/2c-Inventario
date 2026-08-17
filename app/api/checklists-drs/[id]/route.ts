import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { requireModificar, requireEliminar } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

export async function GET(_: NextRequest, { params }: Ctx) {
  const sb = getSupabaseServer()
  const { data, error } = await sb
    .from('checklists_drs')
    .select('*,checklists_drs_items(*)')
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const denegado = await requireModificar('checklist_drs')
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const body = await req.json()
  const patch: Record<string, unknown> = {}

  for (const campo of [
    'cliente_mandante', 'ubicacion', 'fecha_visita', 'inspectores', 'num_tableros',
    'estado', 'firma_nombre', 'firma_rut', 'firma_cargo', 'firma_imagen_url',
  ]) {
    if (body[campo] !== undefined) patch[campo] = body[campo]
  }

  // Vincular a una obra real del sistema — ver mismo criterio en
  // /api/verificacion-ric/[id].
  if (body.proyecto_id !== undefined) {
    patch.proyecto_id = body.proyecto_id || null
    if (body.proyecto_id) {
      const { data: proyecto } = await sb.from('proyectos').select('nombre').eq('id', body.proyecto_id).maybeSingle()
      patch.proyecto_nombre = proyecto?.nombre ?? null
    }
  }

  const { data, error } = await sb
    .from('checklists_drs')
    .update(patch)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// Elimina el checklist completo (ítems en cascada) — sin importar el estado.
export async function DELETE(_: NextRequest, { params }: Ctx) {
  const denegado = await requireEliminar('checklist_drs')
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const { error } = await sb.from('checklists_drs').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
