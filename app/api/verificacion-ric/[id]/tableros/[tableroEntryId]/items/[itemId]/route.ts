import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { requireModificar } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string; tableroEntryId: string; itemId: string } }

// Un punto de verificación itemizado del Anexo SAT (ver
// lib/verificacionRic/anexoSat.ts) — solo el resultado es editable, el
// texto viene fijo de la plantilla.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const denegado = await requireModificar('verificacion_ric')
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const body = await req.json()
  if (body.resultado === undefined) return NextResponse.json({ error: 'Nada para guardar.' }, { status: 400 })

  const { data, error } = await sb
    .from('verificaciones_ric_tableros_items')
    .update({ resultado: body.resultado })
    .eq('id', params.itemId)
    .eq('tablero_entry_id', params.tableroEntryId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
