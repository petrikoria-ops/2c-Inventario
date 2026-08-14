import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getPerfil, requireModificar, requireEliminar, puedeVerPrecios } from '@/lib/auth/permisos.server'

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
  if (data && !puedeVerPrecios(await getPerfil())) data.precio_unitario = 0
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const denegado = await requireModificar('materiales')
  if (denegado) return denegado
  const sb = getSupabaseServer()
  const body = await req.json()
  const verPrecios = puedeVerPrecios(await getPerfil())
  if (!verPrecios) delete body.precio_unitario
  const { error, data } = await sb
    .from('materiales')
    .update({ ...body, stock_actual: undefined }) // stock solo via movimientos
    .eq('id', params.id)
    .select('*,categorias(id,nombre,color),proveedores(id,nombre)')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  // El SELECT devuelve el precio real aunque no se haya tocado — se
  // redacta igual que en GET para no filtrarlo al editar otro campo.
  if (data && !verPrecios) data.precio_unitario = 0
  return NextResponse.json(data)
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const denegado = await requireEliminar('materiales')
  if (denegado) return denegado
  const sb = getSupabaseServer()
  const { error } = await sb.from('materiales').update({ activo: false }).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
