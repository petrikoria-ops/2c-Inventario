import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getPerfil, requireCrear } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const sb = getSupabaseServer()
  const { searchParams: p } = new URL(req.url)
  const proyectoId = p.get('proyecto_id')
  const estado     = p.get('estado')

  let query = sb
    .from('pedidos_bodega')
    .select('*, pedidos_bodega_items(id,codigo,descripcion,unidad,cantidad_pedida), proyectos(id,ot,nombre)')
    .order('creado_en', { ascending: false })

  if (proyectoId) query = query.eq('proyecto_id', proyectoId)
  if (estado)     query = query.eq('estado', estado)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const denegado = await requireCrear('pedidos_bodega')
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const perfil = await getPerfil()
  const { items, proyecto_id, observaciones } = await req.json()

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Se requiere al menos un ítem' }, { status: 400 })
  }

  // Correlativo PB-YYYY-NNN — mismo patrón que /api/salidas, /api/solicitudes
  const year = new Date().getFullYear()
  const { count } = await sb
    .from('pedidos_bodega')
    .select('*', { count: 'exact', head: true })
    .gte('creado_en', `${year}-01-01`)
  const numero = `PB-${year}-${String((count ?? 0) + 1).padStart(3, '0')}`

  const { data: pedido, error: errPed } = await sb
    .from('pedidos_bodega')
    .insert({
      numero,
      proyecto_id: proyecto_id || null,
      solicitante_id: perfil?.id ?? null,
      solicitante_nombre: perfil?.nombre_completo ?? 'Sin identificar',
      observaciones: observaciones || null,
    })
    .select('*, proyectos(id,ot,nombre)')
    .single()

  if (errPed) return NextResponse.json({ error: errPed.message }, { status: 500 })

  const rows = items.map((item: any) => ({
    pedido_id:       pedido.id,
    material_id:     item.material_id ?? null,
    codigo:          item.codigo,
    descripcion:     item.descripcion,
    unidad:          item.unidad || null,
    cantidad_pedida: Number(item.cantidad_pedida) || 1,
  }))

  const { error: errItems } = await sb.from('pedidos_bodega_items').insert(rows)
  if (errItems) return NextResponse.json({ error: errItems.message }, { status: 500 })

  return NextResponse.json(pedido, { status: 201 })
}
