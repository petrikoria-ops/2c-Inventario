import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'

type Ctx = { params: { id: string } }

export async function GET(_: NextRequest, { params }: Ctx) {
  const sb = getSupabaseServer()
  const { data: proy } = await sb.from('proyectos').select('*').eq('id', params.id).single()
  if (!proy) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  const { data: movs } = await sb.from('movimientos')
    .select('*,materiales(codigo,descripcion,unidad)')
    .eq('proyecto_id', params.id)
    .order('fecha', { ascending: false })
  return NextResponse.json({ ...proy, movimientos: movs ?? [] })
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const sb = getSupabaseServer()
  const { error } = await sb.from('proyectos').update(await req.json()).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const sb = getSupabaseServer()
  const { error } = await sb.from('proyectos').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
