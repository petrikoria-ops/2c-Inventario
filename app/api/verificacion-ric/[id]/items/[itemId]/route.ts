import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { requireEditable } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string; itemId: string } }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const denegado = await requireEditable('verificacion_ric')
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const body = await req.json()
  const patch: Record<string, unknown> = {}

  if (body.resultado !== undefined) patch.resultado = body.resultado
  if (typeof body.foto_tomada === 'boolean') patch.foto_tomada = body.foto_tomada
  if (body.foto_url !== undefined) patch.foto_url = body.foto_url
  if (body.notas !== undefined) patch.notas = body.notas

  const { data, error } = await sb
    .from('verificaciones_ric_items')
    .update(patch)
    .eq('id', params.itemId)
    .eq('verificacion_id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
