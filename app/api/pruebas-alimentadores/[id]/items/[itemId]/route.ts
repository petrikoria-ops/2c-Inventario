import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { requireEditable } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string; itemId: string } }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const denegado = await requireEditable('pruebas_alimentadores')
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const body = await req.json()
  const patch: Record<string, unknown> = {}

  if (body.valor !== undefined) patch.valor = body.valor
  if (body.foto_url !== undefined) patch.foto_url = body.foto_url

  const { data, error } = await sb
    .from('pruebas_alimentadores_items')
    .update(patch)
    .eq('id', params.itemId)
    .eq('prueba_id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
