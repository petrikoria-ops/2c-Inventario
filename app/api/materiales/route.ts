import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 1000

export async function GET(req: NextRequest) {
  const sb = getSupabaseServer()
  const { searchParams: p } = new URL(req.url)
  const q           = p.get('q') ?? ''
  const categoriaId = p.get('categoria') ?? ''
  const bajoMinimo  = p.get('bajo_minimo') === '1'
  const page        = Math.max(1, parseInt(p.get('page') ?? '1'))
  const limit       = parseInt(p.get('limit') ?? '50')
  const offset      = (page - 1) * limit

  if (bajoMinimo) {
    // stock_actual <= stock_minimo se filtra en JS porque PostgREST no
    // soporta comparar dos columnas — para no truncar en silencio si hay
    // más materiales que un límite fijo, se pagina hasta traerlos todos
    // (query nueva cada vuelta: reusar el builder entre awaits es frágil).
    const all: any[] = []
    let from = 0
    while (true) {
      let query = sb
        .from('materiales')
        .select('*,categorias(id,nombre,color),proveedores(id,nombre)')
        .eq('activo', true)
      if (q) query = query.or(`codigo.ilike.%${q}%,descripcion.ilike.%${q}%,codigo_barras.ilike.%${q}%`)
      if (categoriaId) query = query.eq('categoria_id', categoriaId)

      const { data, error } = await query.order('codigo').range(from, from + PAGE_SIZE - 1)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      all.push(...(data ?? []))
      if (!data || data.length < PAGE_SIZE) break
      from += PAGE_SIZE
    }
    const filtered = all.filter(m => m.stock_actual <= m.stock_minimo)
    return NextResponse.json({ data: filtered, total: filtered.length, page: 1, limit: filtered.length })
  }

  let query = sb
    .from('materiales')
    .select('*,categorias(id,nombre,color),proveedores(id,nombre)', { count: 'exact' })
    .eq('activo', true)

  if (q) query = query.or(`codigo.ilike.%${q}%,descripcion.ilike.%${q}%,codigo_barras.ilike.%${q}%`)
  if (categoriaId) query = query.eq('categoria_id', categoriaId)

  const { data, count, error } = await query.order('codigo').range(offset, offset + limit - 1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: data ?? [], total: count ?? 0, page, limit })
}

export async function POST(req: NextRequest) {
  const sb = getSupabaseServer()
  const body = await req.json()

  // El código tiene UNIQUE en la base sin importar "activo": si el código
  // ya lo usó un material eliminado, el insert falla con un error crudo de
  // Postgres. Lo detectamos antes para devolver un mensaje claro y útil.
  if (body.codigo) {
    const { data: existente } = await sb
      .from('materiales')
      .select('id,activo')
      .eq('codigo', body.codigo)
      .maybeSingle()
    if (existente) {
      const msg = existente.activo
        ? `Ya existe un material activo con el código "${body.codigo}".`
        : `El código "${body.codigo}" ya lo usó un material eliminado anteriormente. Usa otro código, o pide que reactiven ese material en vez de crear uno nuevo.`
      return NextResponse.json({ error: msg }, { status: 409 })
    }
  }

  const { error, data } = await sb
    .from('materiales')
    .insert(body)
    .select('*,categorias(id,nombre,color),proveedores(id,nombre)')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
