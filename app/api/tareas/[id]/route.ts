import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getPerfil } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

// Transiciones de estado válidas por quién llama — el destinatario acepta/
// rechaza una pendiente o completa una ya aceptada; quien asignó no cambia
// el estado directamente (para eso existe DELETE, que cancela una pendiente).
const TRANSICIONES_DESTINATARIO: Record<string, string[]> = {
  pendiente: ['aceptada', 'rechazada'],
  aceptada: ['completada'],
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const perfil = await getPerfil()
  if (!perfil) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  const sb = getSupabaseServer()
  const { data: tarea, error: fetchErr } = await sb
    .from('tareas_asignadas')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!tarea) return NextResponse.json({ error: 'Tarea no encontrada.' }, { status: 404 })

  const body = await req.json()
  const patch: Record<string, unknown> = {}

  if (perfil.id === tarea.asignado_a && body.estado) {
    const permitidos = TRANSICIONES_DESTINATARIO[tarea.estado] ?? []
    if (!permitidos.includes(body.estado)) {
      return NextResponse.json({ error: `No se puede pasar de "${tarea.estado}" a "${body.estado}".` }, { status: 400 })
    }
    patch.estado = body.estado
    if (body.estado === 'aceptada' || body.estado === 'rechazada') patch.respondido_en = new Date().toISOString()
    if (body.estado === 'completada') patch.completado_en = new Date().toISOString()
  } else if (perfil.id === tarea.asignado_por) {
    if (tarea.estado !== 'pendiente') {
      return NextResponse.json({ error: 'Ya no se puede editar — el destinatario ya la respondió.' }, { status: 400 })
    }
    for (const campo of ['titulo', 'descripcion', 'fecha_limite']) {
      if (body[campo] !== undefined) patch[campo] = body[campo]
    }
  } else {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar.' }, { status: 400 })
  }

  const { data, error } = await sb
    .from('tareas_asignadas')
    .update(patch)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// Cancela una tarea que todavía no fue respondida — solo quien la asignó.
export async function DELETE(_: NextRequest, { params }: Ctx) {
  const perfil = await getPerfil()
  if (!perfil) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  const sb = getSupabaseServer()
  const { error, count } = await sb
    .from('tareas_asignadas')
    .delete({ count: 'exact' })
    .eq('id', params.id)
    .eq('asignado_por', perfil.id)
    .eq('estado', 'pendiente')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!count) return NextResponse.json({ error: 'No se pudo cancelar — puede que ya haya sido respondida.' }, { status: 400 })
  return NextResponse.json({ ok: true })
}
