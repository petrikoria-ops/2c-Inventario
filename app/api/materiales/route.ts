import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const sb = getSupabaseServer()
  const { searchParams: p } = new URL(req.url)
  const q           = p.get('q') ?? ''
  const categoriaId = p.get('categoria') ?? ''
  const bajoMinimo  = p.get('bajo_minimo') === '1'
  const page        = Math.max(1, parseInt(p.get('page') ?? '1'))
  const limit       = parseInt(p.get('limit') ?? '50')
  const offset      = (page - 1) * limit

  let query = sb
    .from('materiales')
    .select('*,categorias(id,nombre,color),proveedores(id,nombre)', { count: 'exact' })
    .eq('activo', true)

  if (q) query = query.or(`codigo.ilike.%${q}%,descripcion.ilike.%${q}%,codigo_barras.ilike.%${q}%`)
  if (categoriaId) query = query.eq('categoria_id', categoriaId)

  // bajo_minimo se filtra en JS porque Supabase PostgREST no soporta comparación entre columnas
  const effectiveLimit = bajoMinimo ? 2000 : limit
  const { data, count, error } = await query.order('codigo').range(offset, offset + effectiveLimit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const filtered = bajoMinimo ? (data ?? []).filter(m => m.stock_actual <= m.stock_minimo) : (data ?? [])

  return NextResponse.json({ data: filtered, total: count ?? 0, page, limit })
}

export async function POST(req: NextRequest) {
  const sb = getSupabaseServer()
  const body = await req.json()
  const { error, data } = await sb
    .from('materiales')
    .insert(body)
    .select('*,categorias(id,nombre,color),proveedores(id,nombre)')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
