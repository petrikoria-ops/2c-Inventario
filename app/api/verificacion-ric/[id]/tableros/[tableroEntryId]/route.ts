import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { requireModificar, requireEliminar } from '@/lib/auth/permisos.server'
import { itemsPuntosEspecificos } from '@/lib/verificacionRic/anexoSat'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string; tableroEntryId: string } }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const denegado = await requireModificar('verificacion_ric')
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const body = await req.json()
  const patch: Record<string, unknown> = {}

  for (const campo of [
    'tablero_id', 'numero_tablero', 'nombre', 'tipo', 'tipo_tablero_id', 'fabricante', 'ui', 'in_nominal',
    'resultado_ensayos_instrumento', 'resultado_inspeccion', 'resultado_requisitos_terreno',
    'resultado_puntos_especificos', 'resultado_registro_fotografico',
    'notas', 'foto_tomada', 'foto_url',
  ]) {
    if (body[campo] !== undefined) patch[campo] = body[campo]
  }

  const { data, error } = await sb
    .from('verificaciones_ric_tableros')
    .update(patch)
    .eq('id', params.tableroEntryId)
    .eq('verificacion_id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Los "puntos específicos" dependen del tipo de tablero — si cambió,
  // se regeneran esos ítems (se borran los viejos y se siembran los del
  // tipo nuevo). Las otras 3 categorías (fijas) no se tocan.
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

  return NextResponse.json(itemsPuntosEspecificosNuevos !== undefined
    ? { ...data, itemsPuntosEspecificosNuevos } : data)
}

// Saca un tablero del Anexo SAT — para corregir uno agregado por error.
export async function DELETE(_: NextRequest, { params }: Ctx) {
  const denegado = await requireEliminar('verificacion_ric')
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const { error } = await sb
    .from('verificaciones_ric_tableros')
    .delete()
    .eq('id', params.tableroEntryId)
    .eq('verificacion_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
