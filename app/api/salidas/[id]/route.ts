import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'

type Ctx = { params: { id: string } }

export async function GET(_: NextRequest, { params }: Ctx) {
  const sb = getSupabaseServer()
  const { data, error } = await sb
    .from('vales_despacho')
    .select('*, proyectos(ot,nombre,cliente), vales_despacho_items(*)')
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const sb = getSupabaseServer()
  const { error } = await sb.from('vales_despacho').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
