import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { requireModificar, requireEliminar } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

export async function GET(_: NextRequest, { params }: Ctx) {
  const sb = getSupabaseServer()
  const { data, error } = await sb
    .from('verificaciones_ric')
    .select('*,verificaciones_ric_items(*),verificaciones_ric_tableros(*)')
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const denegado = await requireModificar('verificacion_ric')
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const body = await req.json()
  const patch: Record<string, unknown> = {}

  // incluye_seccion_a NO está en esta lista a propósito — queda fijo tras
  // crear (define si se sembró la plantilla A.0-A.11). incluye_anexo_sat sí
  // se puede activar/desactivar después porque no siembra nada.
  for (const campo of [
    'cliente_mandante', 'ubicacion', 'fecha_visita', 'inspectores', 'num_tableros',
    'estado', 'declaracion_conformidad', 'firma_nombre', 'firma_rut', 'firma_cargo',
    'firma_imagen_url', 'incluye_anexo_sat',
  ]) {
    if (body[campo] !== undefined) patch[campo] = body[campo]
  }

  // Vincular a una obra real del sistema — típico en verificaciones creadas
  // por enlace público, donde la obra queda como texto libre hasta que
  // alguien interno la asocia a un proyecto real. Actualiza proyecto_nombre
  // junto con proyecto_id para que el registro quede al día.
  if (body.proyecto_id !== undefined) {
    patch.proyecto_id = body.proyecto_id || null
    if (body.proyecto_id) {
      const { data: proyecto } = await sb.from('proyectos').select('nombre').eq('id', body.proyecto_id).maybeSingle()
      patch.proyecto_nombre = proyecto?.nombre ?? null
    }
  }

  const { data, error } = await sb
    .from('verificaciones_ric')
    .update(patch)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// Elimina la verificación completa (ítems y Anexo SAT en cascada) — sin
// importar el estado (en_progreso o completa). Los Test de Alimentadores
// vinculados NO se borran, solo se desvinculan (ON DELETE SET NULL).
export async function DELETE(_: NextRequest, { params }: Ctx) {
  const denegado = await requireEliminar('verificacion_ric')
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const { error } = await sb.from('verificaciones_ric').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
