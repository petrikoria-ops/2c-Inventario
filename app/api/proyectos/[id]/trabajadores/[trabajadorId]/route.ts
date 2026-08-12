import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { requireEditable } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string; trabajadorId: string } }

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const denegado = await requireEditable('proyectos')
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const { error } = await sb
    .from('proyectos_trabajadores')
    .update({ activo: false })
    .eq('proyecto_id', params.id)
    .eq('trabajador_id', params.trabajadorId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
