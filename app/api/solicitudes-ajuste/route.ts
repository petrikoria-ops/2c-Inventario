import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getPerfil, requireCrear } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const sb = getSupabaseServer()
  const { searchParams: p } = new URL(req.url)
  const estado = p.get('estado')

  let query = sb.from('solicitudes_ajuste_inventario').select('*').order('creado_en', { ascending: false })
  if (estado) query = query.eq('estado', estado)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const denegado = await requireCrear('solicitudes_ajuste')
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const perfil = await getPerfil()
  const { material_id, cantidad_reportada, motivo, observaciones } = await req.json()

  if (!material_id) return NextResponse.json({ error: 'material_id es obligatorio' }, { status: 400 })
  if (cantidad_reportada === undefined || cantidad_reportada === null || Number(cantidad_reportada) < 0) {
    return NextResponse.json({ error: 'cantidad_reportada es obligatoria y no puede ser negativa' }, { status: 400 })
  }
  const motivosValidos = ['conteo_fisico', 'perdida', 'dano', 'error_registro', 'otro']
  if (!motivosValidos.includes(motivo)) {
    return NextResponse.json({ error: 'motivo inválido' }, { status: 400 })
  }

  const { data: mat, error: matErr } = await sb
    .from('materiales')
    .select('codigo,descripcion,stock_actual')
    .eq('id', material_id)
    .eq('activo', true)
    .single()

  if (matErr || !mat) return NextResponse.json({ error: 'Material no encontrado' }, { status: 404 })

  const year = new Date().getFullYear()
  const { count } = await sb
    .from('solicitudes_ajuste_inventario')
    .select('*', { count: 'exact', head: true })
    .gte('creado_en', `${year}-01-01`)
  const numero = `SA-${year}-${String((count ?? 0) + 1).padStart(3, '0')}`

  const { data, error } = await sb
    .from('solicitudes_ajuste_inventario')
    .insert({
      numero,
      material_id,
      codigo: mat.codigo,
      descripcion: mat.descripcion,
      stock_actual_sistema: mat.stock_actual,
      cantidad_reportada: Number(cantidad_reportada),
      motivo,
      observaciones: observaciones || null,
      solicitante_id: perfil?.id ?? null,
      solicitante_nombre: perfil?.nombre_completo ?? 'Sin identificar',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
