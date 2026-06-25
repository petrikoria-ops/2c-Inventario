import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { requireEditable } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

export async function GET(_: NextRequest, { params }: Ctx) {
  const sb = getSupabaseServer()
  const { data, error } = await sb
    .from('materiales')
    .select('*,categorias(*),proveedores(*)')
    .eq('id', params.id)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const denegado = await requireEditable('materiales')
  if (denegado) return denegado
  const sb = getSupabaseServer()
  const body = await req.json()
  const { error, data } = await sb
    .from('materiales')
    .update({ ...body, stock_actual: undefined }) // stock solo via movimientos
    .eq('id', params.id)
    .select('*,categorias(id,nombre,color),proveedores(id,nombre)')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const denegado = await requireEditable('materiales')
  if (denegado) return denegado
  const sb = getSupabaseServer()
  const { error } = await sb.from('materiales').update({ activo: false }).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
