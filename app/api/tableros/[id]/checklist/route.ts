import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { requireModificar } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

// Guardado por fila: cada cambio del checklist (un check, la observación,
// el técnico) dispara un PATCH inmediato — mismo patrón que Verificación
// RIC (app/api/verificacion-ric/[id]/items/[itemId]/route.ts), sin botón
// "Guardar" global.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const denegado = await requireModificar('tableros')
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const body = await req.json()
  const patch: Record<string, unknown> = {}

  for (const campo of ['checks', 'tecnico', 'fecha_inspeccion', 'observaciones', 'completado_en']) {
    if (body[campo] !== undefined) patch[campo] = body[campo]
  }

  const { data, error } = await sb
    .from('tableros_checklist')
    .update(patch)
    .eq('tablero_id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
