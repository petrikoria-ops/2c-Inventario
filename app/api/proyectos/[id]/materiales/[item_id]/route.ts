import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string; item_id: string } }

export async function PUT(req: NextRequest, { params }: Ctx) {
  const sb = getSupabaseServer()
  const { cantidad_requerida, notas } = await req.json()
  const { error } = await sb
    .from('proyectos_materiales')
    .update({ cantidad_requerida, notas })
    .eq('id', params.item_id)
    .eq('proyecto_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const sb = getSupabaseServer()
  const { error } = await sb
    .from('proyectos_materiales')
    .delete()
    .eq('id', params.item_id)
    .eq('proyecto_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
