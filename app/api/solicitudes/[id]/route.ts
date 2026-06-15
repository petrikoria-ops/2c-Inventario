import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'

export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  const sb = getSupabaseServer()
  const { data, error } = await sb
    .from('solicitudes_compra')
    .select('*, solicitudes_compra_items(*)')
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sb = getSupabaseServer()
  const body = await req.json()

  // Sólo permite actualizar campos seguros
  const allowed: Record<string, unknown> = {}
  if ('estado'        in body) allowed.estado        = body.estado
  if ('observaciones' in body) allowed.observaciones  = body.observaciones

  const { data, error } = await sb
    .from('solicitudes_compra')
    .update(allowed)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  const sb = getSupabaseServer()
  const { error } = await sb
    .from('solicitudes_compra')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
