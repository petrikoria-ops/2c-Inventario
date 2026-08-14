import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const denegado = await requireAdmin()
  if (denegado) return denegado

  const body = await req.json()
  const patch: Record<string, unknown> = {}
  for (const campo of ['ver', 'crear', 'modificar', 'eliminar', 'notas']) {
    if (campo in body) patch[campo] = body[campo]
  }

  const sb = getSupabaseServer()
  const { data, error } = await sb
    .from('permisos_usuario_overrides')
    .update(patch)
    .eq('id', params.id)
    .select('*,perfiles(nombre_completo,email)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const denegado = await requireAdmin()
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const { error } = await sb.from('permisos_usuario_overrides').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
