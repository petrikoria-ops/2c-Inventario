import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { requireModificar } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

export async function GET(_: NextRequest, { params }: Ctx) {
  const sb = getSupabaseServer()
  const { data, error } = await sb
    .from('inspecciones_prevencion')
    .select('*,inspecciones_prevencion_items(*)')
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const denegado = await requireModificar('prevencion_riesgos')
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const body = await req.json()
  const patch: Record<string, unknown> = {}

  for (const campo of [
    'centro_trabajo', 'direccion', 'comuna', 'mandante', 'lugares_inspeccionados',
    'fecha', 'prevencionista', 'dirigido_a', 'n_trabajadores', 'introduccion',
    'observaciones_generales', 'firma_prevencionista', 'firma_encargado', 'estado',
    'firma_prevencionista_imagen_url', 'firma_encargado_imagen_url',
  ]) {
    if (body[campo] !== undefined) patch[campo] = body[campo]
  }

  const { data, error } = await sb
    .from('inspecciones_prevencion')
    .update(patch)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
