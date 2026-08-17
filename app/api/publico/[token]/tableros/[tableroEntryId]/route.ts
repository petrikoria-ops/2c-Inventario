import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { validarToken, tocarEnlace } from '@/lib/enlacesPublicos/token.server'
import { itemsPuntosEspecificos } from '@/lib/verificacionRic/anexoSat'

export const dynamic = 'force-dynamic'

type Ctx = { params: { token: string; tableroEntryId: string } }

// Whitelist sin `tablero_id` a propósito — el enlace público no vincula
// tableros reales de Taller, solo tipea los datos del anexo directamente.
const CAMPOS_EDITABLES = [
  'numero_tablero', 'nombre', 'tipo', 'tipo_tablero_id', 'fabricante', 'ui', 'in_nominal',
  'resultado_ensayos_instrumento', 'resultado_inspeccion', 'resultado_requisitos_terreno',
  'resultado_puntos_especificos', 'resultado_registro_fotografico',
  'notas', 'foto_tomada', 'foto_url',
]

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const validacion = await validarToken(params.token)
  if (!validacion.ok) return validacion.error

  const { enlace } = validacion
  if (enlace.modulo !== 'verificacion_ric') {
    return NextResponse.json({ error: 'Este módulo no tiene Anexo SAT.' }, { status: 400 })
  }

  const body = await req.json()
  const patch: Record<string, unknown> = {}
  for (const campo of CAMPOS_EDITABLES) {
    if (body[campo] !== undefined) patch[campo] = body[campo]
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Nada para guardar.' }, { status: 400 })

  const sb = getSupabaseAdmin()
  const { data, error } = await sb
    .from('verificaciones_ric_tableros')
    .update(patch)
    .eq('id', params.tableroEntryId)
    .eq('verificacion_id', enlace.registro_id)
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Ese tablero no pertenece a este enlace.' }, { status: 404 })

  // Los "puntos específicos" dependen del tipo de tablero — si cambió,
  // se regeneran esos ítems (mismo criterio que la ruta interna).
  let itemsPuntosEspecificosNuevos: unknown[] | undefined
  if ('tipo_tablero_id' in patch) {
    await sb.from('verificaciones_ric_tableros_items')
      .delete().eq('tablero_entry_id', params.tableroEntryId).eq('categoria', 'puntos_especificos')

    const filas = itemsPuntosEspecificos(patch.tipo_tablero_id as string | null).map(it => ({
      tablero_entry_id: parseInt(params.tableroEntryId, 10), categoria: it.categoria, orden: it.orden, texto: it.texto,
    }))
    if (filas.length) {
      const { data: nuevos, error: itemsErr } = await sb.from('verificaciones_ric_tableros_items').insert(filas).select()
      if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 })
      itemsPuntosEspecificosNuevos = nuevos ?? []
    } else {
      itemsPuntosEspecificosNuevos = []
    }
  }

  tocarEnlace(enlace.id)
  return NextResponse.json(itemsPuntosEspecificosNuevos !== undefined
    ? { ...data, itemsPuntosEspecificosNuevos } : data)
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const validacion = await validarToken(params.token)
  if (!validacion.ok) return validacion.error

  const { enlace } = validacion
  if (enlace.modulo !== 'verificacion_ric') {
    return NextResponse.json({ error: 'Este módulo no tiene Anexo SAT.' }, { status: 400 })
  }

  const sb = getSupabaseAdmin()
  const { error } = await sb
    .from('verificaciones_ric_tableros')
    .delete()
    .eq('id', params.tableroEntryId)
    .eq('verificacion_id', enlace.registro_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  tocarEnlace(enlace.id)
  return NextResponse.json({ ok: true })
}
