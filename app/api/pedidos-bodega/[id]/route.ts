import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getPerfil, requireModificar, esJefeDeBodegaOGerencia } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

export async function GET(_: NextRequest, { params }: Ctx) {
  const sb = getSupabaseServer()
  const { data, error } = await sb
    .from('pedidos_bodega')
    .select('*, pedidos_bodega_items(*), proyectos(id,ot,nombre)')
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

// Aprobar/rechazar exige esJefeDeBodegaOGerencia() — un permiso más
// angosto que el `modificar` genérico del módulo (que sí alcanza para
// marcar "despachado" una vez ya aprobado, o cancelar). Mismo patrón que
// puedeMarcarAvance para avance_obra: dos candados distintos en la misma
// ruta según qué campo trae el PATCH.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const perfil = await getPerfil()
  const body = await req.json()

  const intentaAprobarORechazar = body.estado === 'aprobado' || body.estado === 'rechazado'
  if (intentaAprobarORechazar) {
    if (!esJefeDeBodegaOGerencia(perfil)) {
      return NextResponse.json({ error: 'Solo el Encargado de bodega o Gerencia puede aprobar o rechazar un pedido.' }, { status: 403 })
    }
  } else {
    const denegado = await requireModificar('pedidos_bodega')
    if (denegado) return denegado
  }

  const sb = getSupabaseServer()
  const patch: Record<string, unknown> = {}

  for (const campo of ['observaciones', 'vale_despacho_id']) {
    if (body[campo] !== undefined) patch[campo] = body[campo]
  }

  if (body.estado !== undefined) {
    patch.estado = body.estado
    if (intentaAprobarORechazar) {
      patch.aprobado_por = perfil?.id ?? null
      patch.aprobado_por_nombre = perfil?.nombre_completo ?? null
      patch.aprobado_en = new Date().toISOString()
    }
  }

  const { data, error } = await sb
    .from('pedidos_bodega')
    .update(patch)
    .eq('id', params.id)
    .select('*, pedidos_bodega_items(*), proyectos(id,ot,nombre)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
